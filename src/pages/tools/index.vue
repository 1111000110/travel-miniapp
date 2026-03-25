<template>
	<view class="tools-page">
		<!-- Header -->
		<view class="tools-hero">
			<text class="tools-hero-label">SMART DEPARTURE</text>
			<text class="tools-hero-title">出发前检查</text>
			<text class="tools-hero-sub">天气、路况和停车建议，一次看完。</text>
		</view>

		<!-- 目的地输入 -->
		<view class="input-card">
			<view class="input-row">
				<view class="input-wrap">
					<text class="input-icon">📍</text>
					<input
						v-model="destination"
						class="dest-input"
						placeholder="输入目的地"
						placeholder-class="input-ph"
						@confirm="loadNotice"
					/>
				</view>
				<view class="refresh-btn" @tap="loadNotice">
					<text class="refresh-text">查询</text>
				</view>
			</view>
		</view>

		<!-- 结果区 -->
		<view v-if="notice" class="result-area">
			<!-- 天气 -->
			<view class="info-card">
				<view class="info-card-head">
					<text class="info-icon">☀</text>
					<text class="info-card-title">天气</text>
				</view>
				<text class="info-card-body">{{ notice.weather_summary }}</text>
			</view>

			<!-- 路况 + 停车 两列 -->
			<view class="two-col">
				<view class="info-card">
					<view class="info-card-head">
						<text class="info-icon">🚗</text>
						<text class="info-card-title">路况</text>
					</view>
					<view
						v-for="item in notice.road_alerts"
						:key="item.notice_id"
						class="notice-item"
					>
						<text class="notice-title">{{ item.title }}</text>
						<text class="notice-body">{{ item.content }}</text>
					</view>
					<text v-if="!notice.road_alerts || !notice.road_alerts.length" class="info-card-body">暂无路况异常</text>
				</view>
				<view class="info-card">
					<view class="info-card-head">
						<text class="info-icon">🅿</text>
						<text class="info-card-title">停车</text>
					</view>
					<view
						v-for="tip in notice.parking_tips"
						:key="tip"
						class="notice-item"
					>
						<text class="notice-body">{{ tip }}</text>
					</view>
				</view>
			</view>

			<!-- 出发清单 -->
			<view class="info-card">
				<view class="info-card-head">
					<text class="info-icon">✅</text>
					<text class="info-card-title">出发清单</text>
				</view>
				<view class="checklist">
					<view
						v-for="tip in notice.departure_tips"
						:key="tip"
						class="check-item"
					>
						<text class="check-dot">●</text>
						<text class="check-text">{{ tip }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 空态提示 -->
		<view v-else class="empty-hint">
			<text class="empty-icon-lg">🗺</text>
			<text class="empty-msg">输入目的地后点击查询</text>
		</view>
	</view>
</template>

<script>
import { getNavigationNotice } from '../../api/travel'
import { showError, withLoading } from '../../utils/feedback'

export default {
	data() {
		return {
			destination: '大理',
			notice: null,
		}
	},
	onShow() {
		this.loadNotice()
	},
	methods: {
		async loadNotice() {
			try {
				this.notice = await withLoading('查询中', () => getNavigationNotice(this.destination))
			} catch (error) {
				showError(error)
			}
		},
	},
}
</script>

<style scoped>
.tools-page {
	background: var(--bg);
	min-height: 100vh;
	padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
}

/* hero */
.tools-hero {
	padding: 48rpx 32rpx 40rpx;
	background: linear-gradient(150deg, #1A1714 0%, #2E2420 60%, #3D2E26 100%);
	position: relative;
	overflow: hidden;
}

.tools-hero::after {
	content: '';
	position: absolute;
	right: -50rpx;
	bottom: -60rpx;
	width: 240rpx;
	height: 240rpx;
	border-radius: 999rpx;
	background: radial-gradient(circle, rgba(224, 92, 42, 0.22) 0%, transparent 70%);
}

.tools-hero-label {
	display: block;
	font-size: 22rpx;
	letter-spacing: 5rpx;
	color: var(--accent);
	font-weight: 600;
	margin-bottom: 14rpx;
	text-transform: uppercase;
}

.tools-hero-title {
	display: block;
	font-size: 52rpx;
	font-weight: 800;
	color: #fff;
}

.tools-hero-sub {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	color: rgba(255, 255, 255, 0.60);
	line-height: 1.6;
}

/* input card */
.input-card {
	margin: 28rpx 32rpx 0;
	background: var(--surface);
	border-radius: 28rpx;
	padding: 22rpx 24rpx;
	box-shadow: var(--shadow-sm);
}

.input-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.input-wrap {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 12rpx;
	height: 80rpx;
	padding: 0 20rpx;
	background: var(--bg);
	border-radius: 20rpx;
	border: 1.5rpx solid var(--border);
}

.input-icon {
	font-size: 32rpx;
	line-height: 1;
	flex-shrink: 0;
}

.dest-input {
	flex: 1;
	font-size: 28rpx;
	color: var(--text);
	background: transparent;
}

.input-ph {
	color: var(--text-2);
}

.refresh-btn {
	height: 80rpx;
	padding: 0 30rpx;
	border-radius: 999rpx;
	background: var(--accent);
	display: flex;
	align-items: center;
	box-shadow: 0 6rpx 18rpx rgba(224, 92, 42, 0.28);
}

.refresh-text {
	font-size: 28rpx;
	font-weight: 700;
	color: #fff;
}

/* result */
.result-area {
	padding: 20rpx 32rpx 0;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.info-card {
	background: var(--surface);
	border-radius: 28rpx;
	padding: 28rpx;
	box-shadow: var(--shadow-sm);
}

.info-card-head {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 16rpx;
}

.info-icon {
	font-size: 36rpx;
	line-height: 1;
}

.info-card-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--text);
}

.info-card-body {
	font-size: 28rpx;
	line-height: 1.7;
	color: var(--text-2);
}

.two-col {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20rpx;
}

.notice-item {
	padding: 14rpx 0;
	border-top: 1rpx solid var(--border);
}

.notice-item:first-of-type {
	border-top: none;
	padding-top: 0;
}

.notice-title {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: var(--text);
}

.notice-body {
	display: block;
	margin-top: 6rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: var(--text-2);
}

.checklist {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.check-item {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
}

.check-dot {
	font-size: 14rpx;
	color: var(--accent);
	margin-top: 8rpx;
	flex-shrink: 0;
}

.check-text {
	font-size: 26rpx;
	line-height: 1.65;
	color: var(--text);
	flex: 1;
}

/* empty */
.empty-hint {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100rpx 40rpx;
	text-align: center;
}

.empty-icon-lg {
	font-size: 100rpx;
	line-height: 1;
	opacity: 0.5;
}

.empty-msg {
	display: block;
	margin-top: 28rpx;
	font-size: 30rpx;
	color: var(--text-2);
}
</style>
