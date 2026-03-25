<template>
	<view v-if="detail" class="dest-page">
		<!-- Hero 封面 -->
		<view class="dest-hero">
			<image
				v-if="detail.destination.hero_image"
				class="dest-hero-img"
				:src="detail.destination.hero_image"
				mode="aspectFill"
			/>
			<view class="dest-hero-mask" />
			<view class="dest-hero-inner">
				<text class="dest-province">{{ detail.destination.province }}</text>
				<text class="dest-city">{{ detail.destination.city_name }}</text>
				<text class="dest-slogan">{{ detail.destination.slogan }}</text>
				<view class="dest-tag-row">
					<text v-for="tag in detail.destination.tags" :key="tag" class="dest-tag">{{ tag }}</text>
					<text class="dest-tag dest-tag-season">最佳 {{ detail.destination.best_season }}</text>
				</view>
			</view>
		</view>

		<!-- CTA 悬浮条 -->
		<view class="dest-cta-bar">
			<view class="dest-cta-btn" @tap="jumpGuide">
				<text class="dest-cta-text">✦ 基于此地生成 AI 行程</text>
			</view>
		</view>

		<!-- 景点 -->
		<view class="content-section">
			<text class="cs-title">热门景点</text>
			<view
				v-for="spot in detail.top_spots"
				:key="spot.spot_id"
				class="spot-card"
			>
				<image
					v-if="spot.cover_image"
					class="spot-img"
					:src="spot.cover_image"
					mode="aspectFill"
				/>
				<view class="spot-body">
					<view class="spot-top-row">
						<text class="spot-name">{{ spot.name }}</text>
						<view class="spot-rating-badge">
							<text class="spot-rating-num">★ {{ spot.rating.toFixed(1) }}</text>
						</view>
					</view>
					<text class="spot-intro">{{ spot.intro }}</text>
					<view class="spot-chips">
						<text class="spot-chip">{{ spot.category }}</text>
						<text class="spot-chip">{{ spot.price_text }}</text>
						<text class="spot-chip">{{ spot.distance_text }}</text>
						<text class="spot-chip">{{ spot.suggest_hours }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 美食 + 提醒 两列 -->
		<view class="two-col-section">
			<view class="content-section flex-1">
				<text class="cs-title">本地吃什么</text>
				<view
					v-for="food in detail.local_foods"
					:key="food.food_id"
					class="two-card"
				>
					<text class="two-card-name">{{ food.name }}</text>
					<text class="two-card-sub">{{ food.intro }}</text>
					<text class="two-card-price">{{ food.avg_price_text }}</text>
				</view>
			</view>
			<view class="content-section flex-1">
				<text class="cs-title">行前提醒</text>
				<view
					v-for="notice in detail.top_notices"
					:key="notice.notice_id"
					class="two-card"
				>
					<text class="two-card-name">{{ notice.title }}</text>
					<text class="two-card-sub">{{ notice.content }}</text>
				</view>
			</view>
		</view>
	</view>

	<view v-else class="loading-state">
		<text class="loading-text">加载中…</text>
	</view>
</template>

<script>
import { getDestinationDetail } from '../../api/travel'
import { showError, withLoading } from '../../utils/feedback'

export default {
	data() {
		return {
			detail: null,
			destinationId: 'dali',
		}
	},
	onShow() {
		this.loadDetail()
	},
	methods: {
		async loadDetail() {
			try {
				const saved = uni.getStorageSync('travel:selectedDestination')
				this.destinationId = saved || 'dali'
				this.detail = await withLoading('加载中', () => getDestinationDetail(this.destinationId))
			} catch (error) {
				showError(error)
			}
		},
		jumpGuide() {
			if (!this.detail) return
			uni.setStorageSync('travel:guideDestination', this.detail.destination.city_name)
			uni.switchTab({ url: '/pages/guide/index' })
		},
	},
}
</script>

<style scoped>
.dest-page {
	background: var(--bg);
	min-height: 100vh;
	padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
}

/* hero */
.dest-hero {
	position: relative;
	height: 520rpx;
	overflow: hidden;
	background: #1A1714;
}

.dest-hero-img {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.dest-hero-mask {
	position: absolute;
	inset: 0;
	background: linear-gradient(
		to bottom,
		rgba(0,0,0,0.08) 0%,
		rgba(0,0,0,0.60) 60%,
		rgba(0,0,0,0.86) 100%
	);
}

.dest-hero-inner {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 0 32rpx 36rpx;
}

.dest-province {
	display: block;
	font-size: 24rpx;
	color: rgba(255,255,255,0.65);
	letter-spacing: 3rpx;
	margin-bottom: 8rpx;
}

.dest-city {
	display: block;
	font-size: 72rpx;
	font-weight: 900;
	color: #fff;
	line-height: 1.0;
	letter-spacing: -1rpx;
}

.dest-slogan {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	line-height: 1.55;
	color: rgba(255,255,255,0.75);
}

.dest-tag-row {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 18rpx;
}

.dest-tag {
	font-size: 22rpx;
	color: rgba(255,255,255,0.88);
	background: rgba(255,255,255,0.16);
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
	backdrop-filter: blur(4px);
}

.dest-tag-season {
	background: rgba(224, 92, 42, 0.55);
	color: #fff;
}

/* CTA bar */
.dest-cta-bar {
	padding: 20rpx 32rpx;
	background: var(--surface);
	border-bottom: 1rpx solid var(--border);
}

.dest-cta-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 88rpx;
	border-radius: 999rpx;
	background: var(--accent);
	box-shadow: 0 8rpx 28rpx rgba(224, 92, 42, 0.30);
}

.dest-cta-text {
	font-size: 30rpx;
	font-weight: 700;
	color: #fff;
}

/* sections */
.content-section {
	padding: 36rpx 32rpx 0;
}

.cs-title {
	display: block;
	font-size: 34rpx;
	font-weight: 800;
	color: var(--text);
	margin-bottom: 20rpx;
}

/* spot cards */
.spot-card {
	background: var(--surface);
	border-radius: 28rpx;
	overflow: hidden;
	box-shadow: var(--shadow-sm);
	margin-bottom: 20rpx;
}

.spot-img {
	display: block;
	width: 100%;
	height: 260rpx;
}

.spot-body {
	padding: 22rpx 26rpx 24rpx;
}

.spot-top-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.spot-name {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--text);
	flex: 1;
}

.spot-rating-badge {
	background: var(--accent-bg);
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
}

.spot-rating-num {
	font-size: 24rpx;
	color: var(--accent);
	font-weight: 700;
}

.spot-intro {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: var(--text-2);
}

.spot-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 16rpx;
}

.spot-chip {
	font-size: 22rpx;
	color: var(--text-2);
	background: var(--bg);
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
}

/* two-col */
.two-col-section {
	display: flex;
	gap: 0;
	padding: 0 16rpx;
}

.flex-1 { flex: 1; }

.two-card {
	padding: 16rpx 0;
	border-top: 1rpx solid var(--border);
}

.two-card:first-of-type { border-top: none; }

.two-card-name {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--text);
}

.two-card-sub {
	display: block;
	margin-top: 6rpx;
	font-size: 24rpx;
	line-height: 1.55;
	color: var(--text-2);
}

.two-card-price {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: var(--accent);
	font-weight: 600;
}

/* loading */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
}

.loading-text {
	font-size: 30rpx;
	color: var(--text-2);
}
</style>
