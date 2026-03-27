<template>
	<view class="home">

		<!-- ── Hero ── -->
		<view class="hero">
			<image
				v-if="heroImage"
				class="hero-bg"
				:src="heroImage"
				mode="aspectFill"
			/>
			<view class="hero-mask" />
			<view class="hero-inner">
				<!-- top row: location + weather -->
				<view class="hero-topbar">
					<view class="loc-pill">
						<text class="loc-dot">●</text>
						<text class="loc-text">{{ currentCity }}</text>
					</view>
					<view v-if="shortWeather" class="weather-pill">
						<text class="weather-text">{{ shortWeather }}</text>
					</view>
				</view>
				<!-- bottom: big city + slogan + CTA -->
				<view class="hero-floor">
					<view v-if="featuredDest" class="hero-tag-row">
						<text v-for="tag in (featuredDest.tags || []).slice(0, 2)" :key="tag" class="hero-tag">{{ tag }}</text>
					</view>
					<text class="hero-city">{{ heroDestCity }}</text>
					<text class="hero-slogan">{{ heroSlogan }}</text>
					<view class="hero-btns">
						<view class="hbtn hbtn-primary" @tap="openGuide(firstDestinationCityName)">
							<text class="hbtn-text">✦ AI 定制行程</text>
						</view>
						<view class="hbtn hbtn-ghost" @tap="openDestination(firstDestinationId)">
							<text class="hbtn-text">目的地详情</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- ── 热门目的地横滑 ── -->
		<view v-if="featuredDestinations.length" class="dest-section">
			<view class="row-header">
				<text class="row-title">热门目的地</text>
			</view>
			<scroll-view scroll-x show-scrollbar="false" class="dest-scroll">
				<view
					v-for="dest in featuredDestinations"
					:key="dest.destination_id"
					class="dest-card"
					@tap="openDestination(dest.destination_id)"
				>
					<image class="dest-cover" :src="dest.hero_image" mode="aspectFill" />
					<view class="dest-grad" />
					<view class="dest-label">
						<text class="dest-city-name">{{ dest.city_name }}</text>
						<text class="dest-prov-text">{{ dest.province }}</text>
					</view>
					<text v-if="dest.best_season" class="dest-season">{{ dest.best_season }}</text>
				</view>
			</scroll-view>
		</view>

		<!-- ── Feed 分区 ── -->
		<view class="feed-section">
			<!-- 分类 tab -->
			<scroll-view scroll-x show-scrollbar="false" class="feed-tabs">
				<view
					v-for="tab in postTabs"
					:key="tab.key"
					class="feed-tab"
					:class="{ active: activePostTab === tab.key }"
					@tap="handlePostTabChange(tab.key)"
				>
					<text class="feed-tab-text">{{ tab.label }}</text>
				</view>
			</scroll-view>

			<!-- 加载骨架 -->
			<view v-if="postLoading" class="sk-list">
				<view v-for="i in 3" :key="i" class="sk-item">
					<view class="sk-cover sk-block" />
					<view class="sk-body">
						<view class="sk-line sk-block" style="width:70%;height:32rpx;" />
						<view class="sk-line sk-block" style="width:48%;height:24rpx;margin-top:14rpx;" />
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
					<image
						v-if="post.cover"
						class="post-cover"
						:src="post.cover"
						mode="aspectFill"
					/>
					<view class="post-body">
						<view class="post-author-row" @tap.stop="openUserProfile(post)">
							<image
								v-if="postAuthorAvatar(post)"
								class="post-author-avatar"
								:src="postAuthorAvatar(post)"
								mode="aspectFill"
							/>
							<view v-else class="post-author-avatar post-author-avatar-ph">
								<text class="post-author-initial">{{ postAuthorInitial(post) }}</text>
							</view>
							<text class="post-author-name">{{ postAuthorName(post) }}</text>
						</view>
						<view class="post-tag-row">
							<text v-for="tag in normalizeTags(post.tags)" :key="tag" class="post-tag">#{{ tag }}</text>
							<text class="post-time">{{ formatTime(post.create_time) }}</text>
						</view>
						<text class="post-title">{{ post.title || '未命名帖子' }}</text>
						<text v-if="post.summary" class="post-summary">{{ post.summary }}</text>
						<view class="post-footer-row">
							<text class="post-count">{{ post.image_count ? `${post.image_count} 张图片` : '纯文本' }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 空态 -->
			<view v-else class="empty-block">
				<text class="empty-icon">🗺</text>
				<text class="empty-title">这里还没有内容</text>
				<text class="empty-desc">去发布第一篇旅行故事吧</text>
			</view>
		</view>

		<!-- ── 发布 FAB ── -->
		<view class="fab" @tap="goPublish">
			<text class="fab-icon">＋</text>
		</view>
	</view>
</template>

<script>
import { getPostList } from '../../api/post'
import { getTravelHome, getNavigationNotice } from '../../api/travel'
import { showError, withLoading } from '../../utils/feedback'
import { setPostSummaryCache } from '../../utils/post-cache'

const DEFAULT_CITY = '大理'
const POST_TABS = [
	{ key: 'nearby', label: '附近动态', tags: ['附近动态'] },
	{ key: 'inspiration', label: '游玩灵感', tags: ['游玩灵感'] },
	{ key: 'food', label: '吃喝玩乐', tags: ['吃喝玩乐'] },
]

export default {
	data() {
		return {
			home: null,
			weatherSummary: '',
			activePostTab: POST_TABS[0].key,
			postTabs: POST_TABS,
			posts: [],
			postLoading: false,
			loaded: false, // 首次加载完成后置 true，避免从子页返回时重复刷新
		}
	},
	computed: {
		currentCity() {
			return (this.home && this.home.current_city) || DEFAULT_CITY
		},
		featuredDestinations() {
			return (this.home && this.home.featured_destinations) || []
		},
		featuredDest() {
			return this.featuredDestinations[0] || null
		},
		firstDestinationId() {
			return this.featuredDest ? this.featuredDest.destination_id : ''
		},
		firstDestinationCityName() {
			return this.featuredDest ? this.featuredDest.city_name : this.currentCity
		},
		heroImage() {
			return this.featuredDest ? this.featuredDest.hero_image : ''
		},
		heroDestCity() {
			return this.featuredDest ? this.featuredDest.city_name : this.currentCity
		},
		heroSlogan() {
			return this.featuredDest ? this.featuredDest.slogan : '探索每一段旅途的故事'
		},
		activePostTabMeta() {
			return this.postTabs.find((item) => item.key === this.activePostTab) || this.postTabs[0]
		},
		shortWeather() {
			const s = this.weatherSummary || ''
			if (!s) return ''
			const clean = s.replace(/\s+/g, ' ').trim()
			return clean.length > 14 ? clean.slice(0, 14) + '…' : clean
		},
	},
	onShow() {
		if (!this.loaded) this.loadHomeWithLocation()
	},
	async onPullDownRefresh() {
		try {
			await this.loadHomeWithLocation({ silent: true })
		} finally {
			uni.stopPullDownRefresh()
		}
	},
	methods: {
		// 尝试获取设备经纬度，失败返回 null
		getCoords() {
			return new Promise((resolve) => {
				uni.authorize({
					scope: 'scope.userLocation',
					success: () => {
						uni.getLocation({
							type: 'gcj02',
							success: ({ latitude, longitude }) => resolve({ latitude, longitude }),
							fail: () => resolve(null),
						})
					},
					fail: () => resolve(null),
				})
			})
		},
		async loadHomeWithLocation(options = {}) {
			const coords = await this.getCoords()
			await this.loadHome({ ...options, coords })
		},
		async loadHome(options = {}) {
			const { silent = false, coords = null } = options
			const runner = async () => {
				// 有经纬度就传给后端，服务端统一做逆地理；否则传空让后端用默认城市
				const params = coords
					? { latitude: coords.latitude, longitude: coords.longitude }
					: { city_name: DEFAULT_CITY }
				const home = await getTravelHome(params)
				this.home = home
				this.weatherSummary = home.weather_summary || ''
				await Promise.all([this.loadWeather(), this.loadPosts(true)])
				this.loaded = true
			}
			try {
				if (silent) {
					await runner()
				} else {
					await withLoading('加载中', runner)
				}
			} catch (error) {
				showError(error)
			}
		},
		async loadWeather() {
			try {
				const result = await getNavigationNotice(this.currentCity)
				this.weatherSummary = result.weather_summary || this.weatherSummary
			} catch {
				// 保留 home 接口已返回的天气摘要
			}
		},
		async loadPosts(reset = false) {
			if (reset) this.posts = []
			this.postLoading = true
			try {
				const result = await getPostList({
					tags: this.activePostTabMeta.tags,
					offset: 0,
					limit: 10,
				})
				this.posts = result.posts || []
			} catch (error) {
				showError(error)
			} finally {
				this.postLoading = false
			}
		},
		handlePostTabChange(tabKey) {
			if (this.activePostTab === tabKey) return
			this.activePostTab = tabKey
			this.loadPosts(true)
		},
		normalizeTags(tags = []) {
			if (tags && tags.length) return tags.slice(0, 2)
			return this.activePostTabMeta.tags.slice(0, 2)
		},
		formatTime(timestamp) {
			if (!timestamp) return '刚刚'
			const date = new Date(timestamp * 1000)
			if (Number.isNaN(date.getTime())) return '刚刚'
			return `${date.getMonth() + 1}/${date.getDate()}`
		},
		openDestination(destinationId) {
			if (!destinationId) return
			uni.setStorageSync('travel:selectedDestination', destinationId)
			uni.navigateTo({ url: '/pages/destination/index' })
		},
		openGuide(destination) {
			uni.setStorageSync('travel:guideDestination', destination)
			uni.switchTab({ url: '/pages/guide/index' })
		},
		openPost(post) {
			const postId = post && post.post_id
			if (!postId) return
			setPostSummaryCache(postId, post)
			uni.navigateTo({ url: `/pages/post/detail?postId=${postId}` })
		},
		postAuthorName(post) {
			const a = post && post.author
			if (a && a.nick_name) return a.nick_name
			return '旅行者'
		},
		postAuthorAvatar(post) {
			const a = post && post.author
			return (a && a.avatar) || ''
		},
		postAuthorInitial(post) {
			const n = this.postAuthorName(post)
			return (n && n.trim().slice(0, 1)) || '?'
		},
		openUserProfile(post) {
			const uid = (post && post.user_id) || (post && post.author && post.author.user_id)
			if (!uid) return
			const nick = (post && post.author && post.author.nick_name) || ''
			uni.navigateTo({
				url: `/pages/user/profile?userId=${encodeURIComponent(uid)}&nickName=${encodeURIComponent(nick)}`,
			})
		},
		goPublish() {
			uni.navigateTo({ url: '/pages/publish/index' })
		},
	},
}
</script>

<style scoped>
/* ── Shell ── */
.home {
	background: var(--bg);
	padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
	overflow-x: hidden;
}

/* ── Hero ── */
.hero {
	position: relative;
	height: 560rpx;
	overflow: hidden;
	background: #1A1714;
}

.hero-bg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.hero-mask {
	position: absolute;
	inset: 0;
	background: linear-gradient(
		to bottom,
		rgba(0, 0, 0, 0.10) 0%,
		rgba(0, 0, 0, 0.10) 35%,
		rgba(0, 0, 0, 0.62) 70%,
		rgba(0, 0, 0, 0.82) 100%
	);
}

.hero-inner {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 60rpx 32rpx 36rpx;
}

/* top bar */
.hero-topbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.loc-pill {
	display: inline-flex;
	align-items: center;
	gap: 8rpx;
	padding: 10rpx 22rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.18);
	backdrop-filter: blur(8px);
	border: 1rpx solid rgba(255, 255, 255, 0.22);
}

.loc-dot {
	font-size: 18rpx;
	color: var(--accent);
	line-height: 1;
}

.loc-text {
	font-size: 26rpx;
	color: #fff;
	font-weight: 600;
}

.weather-pill {
	display: inline-flex;
	align-items: center;
	padding: 10rpx 22rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.14);
	backdrop-filter: blur(8px);
	border: 1rpx solid rgba(255, 255, 255, 0.16);
	max-width: 340rpx;
}

.weather-text {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.90);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* floor */
.hero-floor {
	display: flex;
	flex-direction: column;
}

.hero-tag-row {
	display: flex;
	gap: 10rpx;
	margin-bottom: 12rpx;
}

.hero-tag {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.72);
	background: rgba(255, 255, 255, 0.14);
	padding: 4rpx 14rpx;
	border-radius: 999rpx;
}

.hero-city {
	display: block;
	font-size: 72rpx;
	font-weight: 900;
	line-height: 1.0;
	color: #fff;
	letter-spacing: -1rpx;
}

.hero-slogan {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	line-height: 1.5;
	color: rgba(255, 255, 255, 0.75);
}

.hero-btns {
	display: flex;
	gap: 16rpx;
	margin-top: 24rpx;
}

.hbtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 76rpx;
	padding: 0 28rpx;
	border-radius: 999rpx;
	font-size: 26rpx;
	font-weight: 700;
}

.hbtn-primary {
	background: var(--accent);
	color: #fff;
	box-shadow: 0 8rpx 24rpx rgba(224, 92, 42, 0.45);
}

.hbtn-ghost {
	background: rgba(255, 255, 255, 0.18);
	color: #fff;
	border: 1rpx solid rgba(255, 255, 255, 0.28);
	backdrop-filter: blur(6px);
}

.hbtn-text {
	font-size: 26rpx;
	font-weight: 700;
}

/* ── Destinations ── */
.dest-section {
	padding-top: 40rpx;
}

.dest-scroll {
	padding: 0 32rpx 8rpx;
	display: flex;
	white-space: nowrap;
}

.dest-card {
	position: relative;
	display: inline-flex;
	flex-direction: column;
	width: 260rpx;
	height: 340rpx;
	border-radius: 28rpx;
	overflow: hidden;
	margin-right: 20rpx;
	background: #ccc;
	flex-shrink: 0;
}

.dest-cover {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.dest-grad {
	position: absolute;
	inset: 0;
	background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.72) 100%);
}

.dest-label {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 0 22rpx 22rpx;
}

.dest-city-name {
	display: block;
	font-size: 36rpx;
	font-weight: 800;
	color: #fff;
	line-height: 1.1;
}

.dest-prov-text {
	display: block;
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.72);
	margin-top: 4rpx;
}

.dest-season {
	position: absolute;
	top: 16rpx;
	right: 16rpx;
	font-size: 20rpx;
	color: rgba(255, 255, 255, 0.90);
	background: rgba(0, 0, 0, 0.32);
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	backdrop-filter: blur(4px);
}

/* ── Feed ── */
.feed-section {
	margin-top: 40rpx;
}

/* tabs */
.feed-tabs {
	display: flex;
	white-space: nowrap;
	padding: 0 32rpx 28rpx;
}

.feed-tab {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 64rpx;
	padding: 0 28rpx;
	border-radius: 999rpx;
	margin-right: 14rpx;
	background: var(--surface);
	border: 1.5rpx solid var(--border);
	flex-shrink: 0;
}

.feed-tab.active {
	background: var(--accent);
	border-color: var(--accent);
	box-shadow: 0 6rpx 20rpx rgba(224, 92, 42, 0.28);
}

.feed-tab-text {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--text-2);
}

.feed-tab.active .feed-tab-text {
	color: #fff;
}

/* skeleton */
.sk-list {
	padding: 0 32rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.sk-item {
	display: flex;
	gap: 20rpx;
	background: var(--surface);
	border-radius: 24rpx;
	overflow: hidden;
	padding: 20rpx;
}

.sk-cover {
	width: 160rpx;
	height: 130rpx;
	border-radius: 16rpx;
	flex-shrink: 0;
}

.sk-body {
	flex: 1;
	padding-top: 8rpx;
}

.sk-line {
	border-radius: 8rpx;
}

/* post list */
.post-list {
	padding: 0 32rpx;
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

.post-cover {
	display: block;
	width: 100%;
	height: 320rpx;
	object-fit: cover;
}

.post-body {
	padding: 24rpx 28rpx 20rpx;
}

.post-author-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 16rpx;
}

.post-author-avatar {
	width: 64rpx;
	height: 64rpx;
	border-radius: 999rpx;
	flex-shrink: 0;
	background: var(--accent-bg);
}

.post-author-avatar-ph {
	display: flex;
	align-items: center;
	justify-content: center;
}

.post-author-initial {
	font-size: 26rpx;
	font-weight: 700;
	color: var(--accent);
}

.post-author-name {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--text);
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.post-tag-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
	margin-bottom: 12rpx;
}

.post-tag {
	font-size: 22rpx;
	color: var(--accent);
	font-weight: 500;
}

.post-time {
	margin-left: auto;
	font-size: 22rpx;
	color: var(--text-2);
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
	line-height: 1.65;
	color: var(--text-2);
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.post-footer-row {
	margin-top: 14rpx;
	display: flex;
	align-items: center;
}

.post-count {
	font-size: 22rpx;
	color: var(--text-2);
}

/* empty */
.empty-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 80rpx 32rpx;
	text-align: center;
}

.empty-icon {
	font-size: 80rpx;
	line-height: 1;
}

.empty-title {
	display: block;
	margin-top: 24rpx;
	font-size: 34rpx;
	font-weight: 700;
	color: var(--text);
}

.empty-desc {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	color: var(--text-2);
}

/* ── FAB ── */
.fab {
	position: fixed;
	right: 36rpx;
	bottom: calc(100rpx + env(safe-area-inset-bottom));
	z-index: 999;
	width: 104rpx;
	height: 104rpx;
	border-radius: 999rpx;
	background: var(--accent);
	box-shadow: 0 12rpx 36rpx rgba(224, 92, 42, 0.40);
	display: flex;
	align-items: center;
	justify-content: center;
}

.fab-icon {
	font-size: 52rpx;
	color: #fff;
	line-height: 1;
	font-weight: 300;
	margin-top: -4rpx;
}
</style>
