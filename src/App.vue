<script>
import { getAuthState, clearAuthState } from './utils/auth'
import { wsManager } from './utils/websocket'

export default {
  onLaunch: function () {
    console.log('Travel Mini App Launch')
    // 若已登录，启动时自动建立 WebSocket 连接（onLaunch 晚于页面生命周期前执行，适合全局初始化）
    const auth = getAuthState()
    if (auth && auth.token) {
      wsManager.connect(auth.token)
    }

    // token 过期或鉴权失败时，清除本地登录态并跳回登录页
    wsManager.on('auth_failed', () => {
      clearAuthState()
      uni.reLaunch({ url: '/pages/login/index' })
    })
  },
}
</script>

<style>
page {
	/* ── Palette ── */
	--bg: #F5F3EF;
	--surface: #FFFFFF;
	--surface-2: #F0EDE8;
	--text: #1A1714;
	--text-2: #7A726B;
	--accent: #E05C2A;
	--accent-bg: rgba(224, 92, 42, 0.10);
	--accent-strong: #C44E21;
	--border: rgba(26, 23, 20, 0.08);
	--shadow-sm: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
	--shadow: 0 6rpx 28rpx rgba(0, 0, 0, 0.09);
	--shadow-lg: 0 16rpx 56rpx rgba(0, 0, 0, 0.14);

	/* ── Legacy aliases (used by publish page) ── */
	--muted: #7A726B;
	--surface-strong: #E8E4DE;
	--accent-deep: #C44E21;
	--line: rgba(26, 23, 20, 0.08);

	background-color: var(--bg);
	color: var(--text);
	font-family: "PingFang SC", "Hiragino Sans GB", sans-serif;
}

view, text, button, input, textarea {
	box-sizing: border-box;
}

/* ── Page shell ── */
.page-shell {
	min-height: 100vh;
	background: var(--bg);
	padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

/* ── Typography ── */
.label {
	display: block;
	font-size: 22rpx;
	letter-spacing: 3rpx;
	text-transform: uppercase;
	color: var(--accent);
	font-weight: 600;
}

.title-xl {
	display: block;
	font-size: 60rpx;
	font-weight: 800;
	line-height: 1.08;
	letter-spacing: -1rpx;
}

.title-lg {
	display: block;
	font-size: 44rpx;
	font-weight: 700;
	line-height: 1.15;
}

.title-md {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	line-height: 1.25;
}

.body {
	display: block;
	font-size: 28rpx;
	line-height: 1.7;
}

.caption {
	display: block;
	font-size: 24rpx;
	color: var(--text-2);
	line-height: 1.5;
}

/* ── Spacing helpers ── */
.mt-4  { margin-top: 4rpx;  }
.mt-8  { margin-top: 8rpx;  }
.mt-12 { margin-top: 12rpx; }
.mt-16 { margin-top: 16rpx; }
.mt-20 { margin-top: 20rpx; }
.mt-24 { margin-top: 24rpx; }
.mt-32 { margin-top: 32rpx; }

/* ── Section row header ── */
.row-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 32rpx;
	margin-bottom: 20rpx;
}

.row-title {
	font-size: 34rpx;
	font-weight: 700;
	color: var(--text);
}

.row-more {
	font-size: 26rpx;
	color: var(--accent);
}

/* ── Card ── */
.card {
	background: var(--surface);
	border-radius: 32rpx;
	padding: 32rpx;
	box-shadow: var(--shadow-sm);
}

/* ── Section (form grouping) ── */
.section {
	background: var(--surface);
	border-radius: 32rpx;
	padding: 32rpx;
	box-shadow: var(--shadow-sm);
	margin-top: 24rpx;
}

.section-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
	margin-bottom: 24rpx;
}

.section-title {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	color: var(--text);
}

.section-desc {
	display: block;
	font-size: 26rpx;
	color: var(--text-2);
	line-height: 1.6;
	margin-top: 6rpx;
}

/* ── Input field ── */
.field {
	display: block;
	width: 100%;
	height: 88rpx;
	padding: 0 24rpx;
	margin-top: 12rpx;
	background: var(--bg);
	border-radius: 20rpx;
	border: 1.5rpx solid var(--border);
	font-size: 28rpx;
	line-height: 88rpx;
	color: var(--text);
}

.area {
	height: auto;
	min-height: 160rpx;
	padding: 20rpx 24rpx;
	line-height: 1.65;
}

/* ── Buttons ── */
.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 88rpx;
	padding: 0 36rpx;
	border-radius: 999rpx;
	font-size: 30rpx;
	font-weight: 700;
}

.btn-primary {
	background: var(--accent);
	color: #fff;
	box-shadow: 0 8rpx 28rpx rgba(224, 92, 42, 0.30);
}

.btn-ghost {
	background: transparent;
	border: 1.5rpx solid var(--border);
	color: var(--text);
}

.btn-accent-light {
	background: var(--accent-bg);
	color: var(--accent);
}

.btn-full { width: 100%; }

.action-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 80rpx;
	padding: 0 30rpx;
	border-radius: 999rpx;
	font-size: 28rpx;
	font-weight: 600;
	background: var(--accent);
	color: #fff;
	box-shadow: 0 6rpx 20rpx rgba(224, 92, 42, 0.28);
}

.action-button.small-button {
	height: 64rpx;
	padding: 0 22rpx;
	font-size: 24rpx;
}

.full-width { width: 100%; }

/* ── Chip / pill ── */
.chip {
	display: inline-flex;
	align-items: center;
	padding: 8rpx 18rpx;
	border-radius: 999rpx;
	background: var(--accent-bg);
	color: var(--accent-strong);
	font-size: 24rpx;
	font-weight: 500;
}

.pill {
	display: inline-flex;
	align-items: center;
	padding: 8rpx 18rpx;
	border-radius: 999rpx;
	background: var(--accent-bg);
	color: var(--accent-strong);
	font-size: 24rpx;
}

.pill-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

/* ── List stack ── */
.list-stack {
	display: flex;
	flex-direction: column;
}

.line-item {
	display: flex;
	flex-direction: column;
	padding: 22rpx 0;
	border-top: 1rpx solid var(--border);
}

.line-item:first-child {
	border-top: none;
	padding-top: 0;
}

.line-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--text);
}

.sub-title {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--text);
}

.line-card {
	padding: 22rpx 0;
	border-top: 1rpx solid var(--border);
}
.line-card:first-child {
	border-top: 0;
	padding-top: 0;
}

.muted {
	display: block;
	color: var(--text-2);
	font-size: 24rpx;
	line-height: 1.6;
}

/* ── Layout helpers ── */
.split-two {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20rpx;
}

.flex-row {
	display: flex;
	align-items: center;
}

.flex-between {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.flex-1 { flex: 1; min-width: 0; }

/* ── Skeleton ── */
.sk-block {
	background: linear-gradient(90deg, var(--surface-2) 0%, var(--bg) 50%, var(--surface-2) 100%);
	border-radius: 12rpx;
}

/* ── Poster (dark editorial header for sub-pages) ── */
.poster {
	position: relative;
	overflow: hidden;
	padding: 40rpx 32rpx 36rpx;
	background: linear-gradient(150deg, #1A1714 0%, #2E2420 60%, #3D2E26 100%);
	color: #fff;
}

.poster::after {
	content: '';
	position: absolute;
	right: -60rpx;
	bottom: -80rpx;
	width: 280rpx;
	height: 280rpx;
	border-radius: 999rpx;
	background: radial-gradient(circle, rgba(224, 92, 42, 0.22) 0%, transparent 70%);
	pointer-events: none;
}

.eyebrow {
	display: block;
	font-size: 22rpx;
	letter-spacing: 5rpx;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.55);
	font-weight: 600;
	margin-bottom: 14rpx;
}

.poster-title {
	display: block;
	font-size: 52rpx;
	font-weight: 800;
	line-height: 1.1;
	color: #fff;
	letter-spacing: -0.5rpx;
}

.poster-subtitle {
	display: block;
	margin-top: 16rpx;
	font-size: 26rpx;
	line-height: 1.65;
	color: rgba(255, 255, 255, 0.60);
}

/* ── Space helpers ── */
.space-between {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 16rpx;
}
</style>
