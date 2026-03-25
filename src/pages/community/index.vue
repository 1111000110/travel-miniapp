<template>
	<view class="community">
		<!-- 吸顶 Tab header -->
		<view class="comm-header">
			<view class="comm-title-row">
				<text class="comm-title">旅行消息</text>
				<view class="pub-btn" @tap="goPublish">
					<text class="pub-btn-text">+ 发布</text>
				</view>
			</view>
			<scroll-view scroll-x show-scrollbar="false" class="tab-scroll">
				<view
					v-for="tab in tabs"
					:key="tab.key"
					class="tab-item"
					:class="{ active: activeTab === tab.key }"
					@tap="switchTab(tab.key)"
				>
					<text class="tab-text">{{ tab.label }}</text>
				</view>
			</scroll-view>
		</view>

		<!-- 骨架 -->
		<view v-if="loading" class="post-list">
			<view v-for="i in 4" :key="i" class="post-card">
				<view class="sk-block sk-cover-full" />
				<view style="padding: 24rpx 28rpx 20rpx">
					<view class="sk-block" style="height:32rpx;width:70%;border-radius:8rpx;" />
					<view class="sk-block" style="height:24rpx;width:48%;border-radius:8rpx;margin-top:14rpx;" />
				</view>
			</view>
		</view>

		<!-- 帖子列表 -->
		<view v-else-if="posts.length" class="post-list">
			<view
				v-for="post in posts"
				:key="post.post_id"
				class="post-card"
				@tap="openPost(post)"
			>
				<!-- 封面 -->
				<view class="post-cover-wrap">
					<image
						v-if="post.cover"
						class="post-cover"
						:src="post.cover"
						mode="aspectFill"
					/>
					<view v-else class="post-cover-placeholder">
						<text class="cover-ph-icon">✈</text>
					</view>
					<!-- 标签角标 -->
					<view v-if="normalizeTags(post.tags).length" class="cover-badge">
						<text class="cover-badge-text">{{ normalizeTags(post.tags)[0] }}</text>
					</view>
				</view>
				<!-- 内容 -->
				<view class="post-body">
					<text class="post-title">{{ post.title || '未命名旅行记录' }}</text>
					<text v-if="post.summary" class="post-summary">{{ post.summary }}</text>
					<view class="post-meta-row">
						<view class="tag-row">
							<text v-for="tag in normalizeTags(post.tags).slice(1)" :key="tag" class="post-tag">#{{ tag }}</text>
						</view>
						<view class="meta-right">
							<text class="meta-text">{{ post.image_count ? `${post.image_count}图` : '文字' }}</text>
							<text class="meta-dot">·</text>
							<text class="meta-text">{{ formatTime(post.create_time) }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 加载更多 -->
			<view class="load-row" @tap="loadMore">
				<text class="load-text">{{ noMore ? '已经到底了' : (moreLoading ? '加载中…' : '加载更多') }}</text>
			</view>
		</view>

		<!-- 空态 -->
		<view v-else class="empty-state">
			<text class="empty-icon">📝</text>
			<text class="empty-title">还没有旅行记录</text>
			<text class="empty-desc">发布第一篇，让更多人看到你的旅途</text>
			<view class="btn btn-primary mt-32" @tap="goPublish">
				<text class="btn-txt">去发布</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getPostList } from '../../api/post'
import { showError } from '../../utils/feedback'
import { setPostSummaryCache } from '../../utils/post-cache'

const PAGE_SIZE = 15

const TABS = [
	{ key: 'all', label: '全部', tags: [] },
	{ key: 'nearby', label: '附近动态', tags: ['附近动态'] },
	{ key: 'inspiration', label: '游玩灵感', tags: ['游玩灵感'] },
	{ key: 'food', label: '吃喝玩乐', tags: ['吃喝玩乐'] },
]

export default {
	data() {
		return {
			tabs: TABS,
			activeTab: 'all',
			posts: [],
			loading: false,
			moreLoading: false,
			offset: 0,
			noMore: false,
		}
	},
	computed: {
		activeTabMeta() {
			return this.tabs.find((t) => t.key === this.activeTab) || this.tabs[0]
		},
	},
	onShow() {
		if (!this.posts.length) this.loadPosts(true)
	},
	async onPullDownRefresh() {
		try {
			await this.loadPosts(true)
		} finally {
			uni.stopPullDownRefresh()
		}
	},
	methods: {
		switchTab(key) {
			if (this.activeTab === key) return
			this.activeTab = key
			this.loadPosts(true)
		},
		async loadPosts(reset = false) {
			if (reset) {
				this.posts = []
				this.offset = 0
				this.noMore = false
				this.loading = true
			} else {
				this.moreLoading = true
			}
			try {
				const result = await getPostList({
					tags: this.activeTabMeta.tags,
					offset: this.offset,
					limit: PAGE_SIZE,
				})
				const newPosts = result.posts || []
				this.posts = reset ? newPosts : [...this.posts, ...newPosts]
				this.offset = this.posts.length
				this.noMore = newPosts.length < PAGE_SIZE
			} catch (error) {
				showError(error)
			} finally {
				this.loading = false
				this.moreLoading = false
			}
		},
		loadMore() {
			if (this.moreLoading || this.noMore) return
			this.loadPosts(false)
		},
		normalizeTags(tags = []) {
			if (tags && tags.length) return tags.slice(0, 3)
			return this.activeTabMeta.tags.slice(0, 1)
		},
		formatTime(timestamp) {
			if (!timestamp) return '刚刚'
			const date = new Date(timestamp * 1000)
			if (Number.isNaN(date.getTime())) return '刚刚'
			return `${date.getMonth() + 1}/${date.getDate()}`
		},
		openPost(post) {
			if (!post || !post.post_id) return
			setPostSummaryCache(post.post_id, post)
			uni.navigateTo({ url: `/pages/post/detail?postId=${post.post_id}` })
		},
		goPublish() {
			uni.navigateTo({ url: '/pages/publish/index' })
		},
	},
}
</script>

<style scoped>
.community {
	background: var(--bg);
	min-height: 100vh;
	padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

/* ── Header ── */
.comm-header {
	position: sticky;
	top: 0;
	z-index: 20;
	background: var(--bg);
	padding: 20rpx 32rpx 0;
}

.comm-title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.comm-title {
	font-size: 44rpx;
	font-weight: 800;
	color: var(--text);
	letter-spacing: -0.5rpx;
}

.pub-btn {
	display: inline-flex;
	align-items: center;
	height: 64rpx;
	padding: 0 26rpx;
	border-radius: 999rpx;
	background: var(--accent);
	box-shadow: 0 6rpx 18rpx rgba(224, 92, 42, 0.28);
}

.pub-btn-text {
	font-size: 26rpx;
	font-weight: 700;
	color: #fff;
}

/* tabs */
.tab-scroll {
	display: flex;
	white-space: nowrap;
	padding-bottom: 20rpx;
}

.tab-item {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 60rpx;
	padding: 0 26rpx;
	border-radius: 999rpx;
	margin-right: 12rpx;
	background: var(--surface);
	border: 1.5rpx solid var(--border);
	flex-shrink: 0;
}

.tab-item.active {
	background: var(--text);
	border-color: var(--text);
}

.tab-text {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--text-2);
}

.tab-item.active .tab-text {
	color: #fff;
}

/* ── Post list ── */
.post-list {
	padding: 12rpx 32rpx 0;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.post-card {
	background: var(--surface);
	border-radius: 28rpx;
	overflow: hidden;
	box-shadow: var(--shadow-sm);
}

/* cover */
.post-cover-wrap {
	position: relative;
}

.post-cover {
	display: block;
	width: 100%;
	height: 300rpx;
}

.post-cover-placeholder {
	width: 100%;
	height: 180rpx;
	background: linear-gradient(135deg, var(--surface-2) 0%, #e8e4de 100%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.cover-ph-icon {
	font-size: 60rpx;
	opacity: 0.35;
}

.cover-badge {
	position: absolute;
	top: 16rpx;
	left: 16rpx;
	background: rgba(0, 0, 0, 0.45);
	border-radius: 999rpx;
	padding: 6rpx 16rpx;
	backdrop-filter: blur(4px);
}

.cover-badge-text {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.92);
}

/* body */
.post-body {
	padding: 20rpx 28rpx 22rpx;
}

.post-title {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	line-height: 1.3;
	color: var(--text);
}

.post-summary {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: var(--text-2);
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.post-meta-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 16rpx;
}

.tag-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
}

.post-tag {
	font-size: 22rpx;
	color: var(--accent);
}

.meta-right {
	display: flex;
	align-items: center;
	gap: 6rpx;
	flex-shrink: 0;
}

.meta-text {
	font-size: 22rpx;
	color: var(--text-2);
}

.meta-dot {
	font-size: 22rpx;
	color: var(--text-2);
}

/* skeleton */
.sk-cover-full {
	width: 100%;
	height: 200rpx;
}

/* load more */
.load-row {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 88rpx;
}

.load-text {
	font-size: 26rpx;
	color: var(--text-2);
}

/* empty */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 120rpx 40rpx;
	text-align: center;
}

.empty-icon {
	font-size: 80rpx;
	line-height: 1;
}

.empty-title {
	display: block;
	margin-top: 28rpx;
	font-size: 36rpx;
	font-weight: 700;
	color: var(--text);
}

.empty-desc {
	display: block;
	margin-top: 14rpx;
	font-size: 26rpx;
	color: var(--text-2);
	line-height: 1.6;
}

.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 88rpx;
	padding: 0 48rpx;
	border-radius: 999rpx;
	margin-top: 32rpx;
}

.btn-primary {
	background: var(--accent);
	box-shadow: 0 8rpx 24rpx rgba(224, 92, 42, 0.30);
}

.btn-txt {
	font-size: 30rpx;
	font-weight: 700;
	color: #fff;
}
</style>
