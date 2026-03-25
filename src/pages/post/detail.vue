<template>
	<view class="detail-page">
		<!-- 头部信息 -->
		<view class="detail-header">
			<view v-if="normalizedTags.length" class="detail-tag-row">
				<text v-for="tag in normalizedTags" :key="tag" class="detail-tag">#{{ tag }}</text>
			</view>
			<text class="detail-title">{{ postTitle }}</text>
			<view class="detail-meta-row">
				<text class="detail-author">{{ authorName }}</text>
				<text class="detail-dot">·</text>
				<text class="detail-time">{{ formatDate(postCreateTime) }}</text>
			</view>
		</view>

		<!-- 图片 -->
		<view v-if="postImages.length" class="images-section">
			<image
				v-for="img in postImages"
				:key="img"
				class="detail-img"
				:src="img"
				mode="widthFix"
			/>
		</view>

		<!-- 正文 -->
		<view class="content-section">
			<text class="detail-content" :class="{ pending: !post }">{{ postContent }}</text>
		</view>

		<!-- 底部信息 -->
		<view class="info-footer">
			<view class="info-row">
				<text class="info-label">类型</text>
				<text class="info-value">{{ postTypeText }}</text>
			</view>
			<view v-if="post && post.post_base && post.post_base.post_id" class="info-row">
				<text class="info-label">ID</text>
				<text class="info-value info-id">{{ post.post_base.post_id }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getPostDetail } from '../../api/post'
import { showError } from '../../utils/feedback'
import {
	getPendingPostDetail,
	getPostDetailCache,
	getPostSummaryCache,
	setPendingPostDetail,
	setPostDetailCache,
} from '../../utils/post-cache'

export default {
	data() {
		return {
			postId: '',
			post: null,
			postSummary: null,
		}
	},
	computed: {
		normalizedTags() {
			if (this.post && this.post.post_base && this.post.post_base.tags) return this.post.post_base.tags
			if (this.postSummary && this.postSummary.tags) return this.postSummary.tags
			return []
		},
		postTitle() {
			if (this.post && this.post.post_base && this.post.post_base.title) return this.post.post_base.title
			return (this.postSummary && this.postSummary.title) || '帖子加载中'
		},
		postCreateTime() {
			if (this.post && this.post.post_base && this.post.post_base.create_time) return this.post.post_base.create_time
			return (this.postSummary && this.postSummary.create_time) || 0
		},
		postImages() {
			if (this.post && this.post.post_base && Array.isArray(this.post.post_base.images)) return this.post.post_base.images
			return []
		},
		postContent() {
			if (this.post && this.post.post_base && this.post.post_base.content) return this.post.post_base.content
			if (this.postSummary && this.postSummary.summary) return this.postSummary.summary
			return '正在加载内容…'
		},
		authorName() {
			if (this.post && this.post.author && this.post.author.nick_name) return this.post.author.nick_name
			return '旅行者'
		},
		postTypeText() {
			const imageCount = this.post && this.post.post_base && Array.isArray(this.post.post_base.images)
				? this.post.post_base.images.length
				: (this.postSummary && this.postSummary.image_count) || 0
			return imageCount ? `图文 · ${imageCount} 张` : '纯文字'
		},
	},
	onLoad(options) {
		this.postId = options.postId || ''
		this.postSummary = getPostSummaryCache(this.postId)
		const selected = getPostDetailCache(this.postId)
		if (selected && selected.post_base && selected.post_base.post_id === this.postId) {
			this.post = selected
		}
	},
	onShow() {
		if (!this.post) this.loadPost()
	},
	methods: {
		async loadPost() {
			if (!this.postId) {
				showError(new Error('缺少帖子 ID'))
				return
			}
			const cached = getPostDetailCache(this.postId)
			if (cached && cached.post_base && cached.post_base.post_id === this.postId) {
				this.post = cached
				return
			}
			try {
				const pending = getPendingPostDetail(this.postId)
				const result = pending
					? { post: await pending }
					: {
							post: await setPendingPostDetail(
								this.postId,
								getPostDetail({ post_id: this.postId }).then((response) => response.post || null)
							),
						}
				this.post = result.post || null
				if (this.post) setPostDetailCache(this.postId, this.post)
			} catch (error) {
				showError(error)
			}
		},
		formatDate(timestamp) {
			if (!timestamp) return '刚刚'
			const date = new Date(timestamp * 1000)
			if (Number.isNaN(date.getTime())) return '刚刚'
			return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
		},
	},
}
</script>

<style scoped>
.detail-page {
	background: var(--bg);
	min-height: 100vh;
	padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
}

/* 头部 */
.detail-header {
	padding: 28rpx 32rpx 32rpx;
	background: var(--bg);
}

.detail-tag-row {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-bottom: 16rpx;
}

.detail-tag {
	font-size: 22rpx;
	color: var(--accent);
	background: var(--accent-bg);
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
}

.detail-title {
	display: block;
	font-size: 48rpx;
	font-weight: 800;
	color: var(--text);
	line-height: 1.2;
	letter-spacing: -0.5rpx;
}

.detail-meta-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
	margin-top: 16rpx;
}

.detail-author {
	font-size: 26rpx;
	color: var(--text-2);
}

.detail-dot {
	font-size: 26rpx;
	color: var(--border);
}

.detail-time {
	font-size: 26rpx;
	color: var(--text-2);
}

/* images */
.images-section {
	padding: 28rpx 32rpx 0;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.detail-img {
	display: block;
	width: 100%;
	border-radius: 24rpx;
	background: var(--surface-2);
}

/* content */
.content-section {
	padding: 28rpx 32rpx 0;
}

.detail-content {
	display: block;
	font-size: 30rpx;
	line-height: 1.9;
	color: var(--text);
	white-space: pre-wrap;
	word-break: break-word;
}

.pending {
	color: var(--text-2);
}

/* info footer */
.info-footer {
	margin: 32rpx 32rpx 0;
	background: var(--surface);
	border-radius: 28rpx;
	padding: 24rpx 28rpx;
	box-shadow: var(--shadow-sm);
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.info-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.info-label {
	font-size: 26rpx;
	color: var(--text-2);
}

.info-value {
	font-size: 26rpx;
	color: var(--text);
	font-weight: 600;
}

.info-id {
	font-size: 22rpx;
	word-break: break-all;
	text-align: right;
	max-width: 400rpx;
}
</style>
