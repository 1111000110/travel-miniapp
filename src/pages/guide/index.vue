<template>
	<view class="guide-page">
		<!-- Header poster -->
		<view class="guide-hero">
			<text class="guide-hero-label">AI ROADBOOK</text>
			<text class="guide-hero-title">定制你的专属行程</text>
			<text class="guide-hero-sub">按你的时间、体力和偏好，生成一份能真正执行的路线。</text>
		</view>

		<!-- 表单 -->
		<view class="form-section">
			<view class="form-group">
				<text class="form-label">目的地</text>
				<input
					v-model="form.destination"
					class="form-input"
					placeholder="例如：大理、成都、丽江"
					placeholder-class="input-ph"
				/>
			</view>

			<view class="form-row-2">
				<view class="form-group">
					<text class="form-label">天数</text>
					<input
						v-model="form.days"
						class="form-input"
						type="number"
						placeholder="3"
						placeholder-class="input-ph"
					/>
				</view>
				<view class="form-group">
					<text class="form-label">人数</text>
					<input
						v-model="form.people_count"
						class="form-input"
						type="number"
						placeholder="2"
						placeholder-class="input-ph"
					/>
				</view>
			</view>

			<view class="form-row-2">
				<view class="form-group">
					<text class="form-label">体力</text>
					<input
						v-model="form.energy_level"
						class="form-input"
						placeholder="低 / 中 / 高"
						placeholder-class="input-ph"
					/>
				</view>
				<view class="form-group">
					<text class="form-label">预算</text>
					<input
						v-model="form.budget"
						class="form-input"
						placeholder="¥ 可选"
						placeholder-class="input-ph"
					/>
				</view>
			</view>

			<view class="form-group">
				<text class="form-label">偏好标签</text>
				<textarea
					v-model="form.preferencesText"
					class="form-input form-textarea"
					placeholder="用逗号分隔：洱海,咖啡,轻徒步"
					placeholder-class="input-ph"
				/>
			</view>

			<view class="gen-btn" @tap="submitGuide">
				<text class="gen-btn-text">{{ generating ? '生成中…' : '✦ 生成攻略' }}</text>
			</view>
		</view>

		<!-- 行程结果 -->
		<view v-if="guide" class="result-section">
			<!-- 标题卡 -->
			<view class="result-header-card">
				<view class="result-header-top">
					<view>
						<text class="result-title">{{ guide.title }}</text>
						<text class="result-overview">{{ guide.overview }}</text>
					</view>
					<view class="result-pub-btn" @tap="publishCurrentGuide">
						<text class="result-pub-text">发布</text>
					</view>
				</view>
				<view v-if="guide.traffic_tips && guide.traffic_tips.length" class="traffic-row">
					<text v-for="tip in guide.traffic_tips" :key="tip" class="traffic-chip">{{ tip }}</text>
				</view>
			</view>

			<!-- 每天行程 -->
			<view
				v-for="day in guide.trip_days"
				:key="day.day_index"
				class="day-card"
			>
				<view class="day-header">
					<view class="day-badge">
						<text class="day-badge-text">Day {{ day.day_index }}</text>
					</view>
					<text class="day-title">{{ day.title }}</text>
				</view>
				<text class="day-summary">{{ day.summary }}</text>
				<view class="spot-row">
					<text v-for="spot in day.spot_names" :key="spot" class="spot-chip">{{ spot }}</text>
				</view>
				<view class="day-meta">
					<text class="day-meta-item">{{ day.transport }}</text>
					<text class="day-meta-sep">·</text>
					<text class="day-meta-item">{{ day.budget_text }}</text>
					<text class="day-meta-sep">·</text>
					<text class="day-meta-item">{{ day.energy_tips }}</text>
				</view>
			</view>

			<!-- 费用总结 -->
			<view class="cost-card">
				<text class="cost-label">预算参考</text>
				<text class="cost-value">{{ guide.cost_estimate }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { generateGuide, publishGuide } from '../../api/travel'
import { showError, withLoading } from '../../utils/feedback'

export default {
	data() {
		return {
			form: {
				destination: '大理',
				days: 3,
				people_count: 2,
				preferencesText: '洱海,咖啡,轻徒步',
				energy_level: '中等',
				budget: '¥3000-¥4500',
			},
			guide: null,
			generating: false,
		}
	},
	onShow() {
		const saved = uni.getStorageSync('travel:guideDestination')
		if (saved) this.form.destination = saved
	},
	methods: {
		async submitGuide() {
			if (this.generating) return
			this.generating = true
			try {
				this.guide = await withLoading('AI 生成中', () =>
					generateGuide({
						destination: this.form.destination,
						days: Number(this.form.days),
						people_count: Number(this.form.people_count),
						preferences: this.form.preferencesText
							.split(',')
							.map((s) => s.trim())
							.filter(Boolean),
						energy_level: this.form.energy_level,
						budget: this.form.budget,
					})
				)
			} catch (error) {
				showError(error)
			} finally {
				this.generating = false
			}
		},
		async publishCurrentGuide() {
			if (!this.guide) return
			try {
				const highlights = []
				this.guide.trip_days.forEach((day) => {
					day.spot_names.forEach((spot) => {
						if (highlights.length < 4) highlights.push(spot)
					})
				})
				const result = await withLoading('发布中', () =>
					publishGuide({
						guide_id: this.guide.guide_id,
						title: this.guide.title,
						summary: this.guide.overview,
						highlights,
					})
				)
				uni.showToast({ title: result.message, icon: 'none', duration: 2600 })
			} catch (error) {
				showError(error)
			}
		},
	},
}
</script>

<style scoped>
.guide-page {
	background: var(--bg);
	min-height: 100vh;
	padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
}

/* ── Hero ── */
.guide-hero {
	padding: 48rpx 32rpx 40rpx;
	background: linear-gradient(150deg, #1A1714 0%, #2E2420 60%, #3D2E26 100%);
	position: relative;
	overflow: hidden;
}

.guide-hero::after {
	content: '';
	position: absolute;
	right: -50rpx;
	bottom: -60rpx;
	width: 260rpx;
	height: 260rpx;
	border-radius: 999rpx;
	background: radial-gradient(circle, rgba(224, 92, 42, 0.25) 0%, transparent 70%);
}

.guide-hero-label {
	display: block;
	font-size: 22rpx;
	letter-spacing: 5rpx;
	text-transform: uppercase;
	color: var(--accent);
	font-weight: 600;
	margin-bottom: 14rpx;
}

.guide-hero-title {
	display: block;
	font-size: 52rpx;
	font-weight: 800;
	color: #fff;
	line-height: 1.1;
}

.guide-hero-sub {
	display: block;
	margin-top: 14rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.60);
}

/* ── Form ── */
.form-section {
	margin: 32rpx;
	background: var(--surface);
	border-radius: 32rpx;
	padding: 32rpx;
	box-shadow: var(--shadow-sm);
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.form-row-2 {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20rpx;
}

.form-group {
	display: flex;
	flex-direction: column;
}

.form-label {
	font-size: 24rpx;
	font-weight: 600;
	color: var(--text-2);
	margin-bottom: 10rpx;
}

.form-input {
	height: 88rpx;
	padding: 0 24rpx;
	background: var(--bg);
	border-radius: 20rpx;
	border: 1.5rpx solid var(--border);
	font-size: 28rpx;
	color: var(--text);
	line-height: 88rpx;
}

.form-textarea {
	height: auto;
	min-height: 120rpx;
	padding: 20rpx 24rpx;
	line-height: 1.65;
}

.gen-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 96rpx;
	border-radius: 999rpx;
	background: var(--accent);
	box-shadow: 0 10rpx 32rpx rgba(224, 92, 42, 0.34);
	margin-top: 8rpx;
}

.gen-btn-text {
	font-size: 32rpx;
	font-weight: 800;
	color: #fff;
	letter-spacing: 1rpx;
}

/* ── Result ── */
.result-section {
	padding: 0 32rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.result-header-card {
	background: var(--surface);
	border-radius: 28rpx;
	padding: 28rpx;
	box-shadow: var(--shadow-sm);
}

.result-header-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
}

.result-title {
	display: block;
	font-size: 36rpx;
	font-weight: 800;
	color: var(--text);
	line-height: 1.25;
	flex: 1;
}

.result-overview {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	color: var(--text-2);
	line-height: 1.6;
}

.result-pub-btn {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 64rpx;
	padding: 0 26rpx;
	border-radius: 999rpx;
	background: var(--accent-bg);
}

.result-pub-text {
	font-size: 26rpx;
	font-weight: 700;
	color: var(--accent);
}

.traffic-row {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 20rpx;
}

.traffic-chip {
	font-size: 22rpx;
	color: var(--text-2);
	background: var(--bg);
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
}

/* day cards */
.day-card {
	background: var(--surface);
	border-radius: 28rpx;
	padding: 28rpx;
	box-shadow: var(--shadow-sm);
}

.day-header {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 14rpx;
}

.day-badge {
	width: 72rpx;
	height: 72rpx;
	border-radius: 999rpx;
	background: var(--accent);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.day-badge-text {
	font-size: 20rpx;
	font-weight: 800;
	color: #fff;
}

.day-title {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--text);
	flex: 1;
}

.day-summary {
	display: block;
	font-size: 26rpx;
	line-height: 1.65;
	color: var(--text-2);
}

.spot-row {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 16rpx;
}

.spot-chip {
	font-size: 24rpx;
	color: var(--accent-strong);
	background: var(--accent-bg);
	padding: 8rpx 18rpx;
	border-radius: 999rpx;
}

.day-meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8rpx;
	margin-top: 16rpx;
}

.day-meta-item {
	font-size: 22rpx;
	color: var(--text-2);
}

.day-meta-sep {
	font-size: 22rpx;
	color: var(--border);
}

/* cost card */
.cost-card {
	background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
	border-radius: 28rpx;
	padding: 28rpx;
	box-shadow: 0 10rpx 32rpx rgba(224, 92, 42, 0.28);
}

.cost-label {
	display: block;
	font-size: 22rpx;
	letter-spacing: 3rpx;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.72);
	font-weight: 600;
	margin-bottom: 10rpx;
}

.cost-value {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	color: #fff;
	line-height: 1.4;
}

.input-ph {
	color: var(--text-2);
}
</style>
