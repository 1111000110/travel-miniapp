<template>
	<view class="page-shell">
		<view v-if="!auth">
			<view class="poster account-poster">
				<text class="eyebrow">MY TRAVEL HUB</text>
				<text class="poster-title">登录后，把你的攻略、收藏和出行提醒收回到一个账号里</text>
				<text class="poster-subtitle">当前只保留手机号一键登录，登录成功后可按需补充同步微信资料。</text>
				<view class="account-hero">
					<image class="wechat-avatar hero-avatar" :src="displayAvatar" mode="aspectFill" />
					<view class="hero-copy">
						<text class="hero-name">手机号一键登录</text>
						<text class="hero-desc">微信验证手机号，首次进入自动创建账号，后续直接恢复登录态。</text>
					</view>
				</view>
				<view class="agreement-box mt-24">
					<view class="agreement-row" @tap="toggleAgreement">
						<view class="agree-icon" :class="{ checked: agreed }">{{ agreed ? '✓' : '' }}</view>
						<text class="agreement-text">我已阅读并同意《会员服务协议》《隐私政策》《未成年人隐私政策》</text>
					</view>
					<button class="phone-login-button" open-type="getPhoneNumber" @getphonenumber="handlePhoneLogin">
						手机号一键登录
					</button>
					<text class="skip-text" @tap="showGuestNotice">暂不登录</text>
				</view>
			</view>
		</view>

		<view v-else>
			<view class="poster">
				<text class="eyebrow">USER CENTER</text>
				<text class="poster-title">你的出行主页已经就绪</text>
				<text class="poster-subtitle">现在可以继续完善资料，把昵称、头像和常用信息维护完整。</text>
			</view>

			<view class="section">
				<view class="section-head">
					<view class="flex-1">
						<text class="section-title">当前账号</text>
						<text class="section-desc mt-8">基于手机号登录进入，资料可以继续补全。</text>
					</view>
					<view class="action-button small-button" @tap="logout">退出</view>
				</view>

				<view class="wechat-login-card">
					<image
						class="wechat-avatar"
						:src="displayAvatar"
						mode="aspectFill"
					/>
					<text class="wechat-name">{{ displayName }}</text>
					<text class="section-desc mt-8 center-text">已登录，可继续完善你的个人资料。</text>
					<view class="action-button full-width mt-24" @tap="syncWechatProfile">同步微信资料</view>
				</view>
			</view>

			<view class="section">
				<view class="section-head">
					<view class="flex-1">
						<text class="section-title">我的资料</text>
						<text class="section-desc mt-8">查询和更新都直接走当前登录用户。</text>
					</view>
					<view class="action-button small-button" @tap="loadProfile">刷新</view>
				</view>

				<view v-if="profile" class="list-stack">
					<view class="line-card">
						<text class="sub-title">身份信息</text>
						<text class="section-desc mt-8">用户ID：{{ profile.user_base.user_id || '-' }}</text>
						<text class="section-desc mt-8">角色：{{ profile.user_private.role || '-' }}</text>
						<text class="section-desc mt-8">状态：{{ profile.user_private.status }}</text>
						<text class="section-desc mt-8">手机号：{{ profile.user_private.phone || '-' }}</text>
					</view>
					<view>
						<text class="muted">昵称</text>
						<input v-model="profile.user_base.nick_name" class="field" placeholder="请输入昵称" />
					</view>
					<view>
						<text class="muted">头像地址</text>
						<input v-model="profile.user_base.avatar" class="field" placeholder="请输入头像 URL" />
					</view>
					<view class="split-two">
						<view>
							<text class="muted">性别</text>
							<input v-model="profile.user_base.gender" class="field" placeholder="male / female / unknown" />
						</view>
						<view>
							<text class="muted">邮箱</text>
							<input v-model="profile.user_private.email" class="field" placeholder="请输入邮箱" />
						</view>
					</view>
					<view class="action-button full-width" @tap="saveProfile">保存资料</view>
				</view>
				<view v-else class="line-card">
					<text class="section-desc">还没有用户资料，点击刷新或重新登录。</text>
				</view>
			</view>

			<view class="section">
				<text class="section-title">当前接入状态</text>
				<view class="pill-row mt-16">
					<text class="pill">手机号登录：/api/user/mini/phone/login</text>
					<text class="pill">资料同步：/api/user/update</text>
					<text class="pill">查询：/api/user/query</text>
					<text class="pill">更新：/api/user/update</text>
					<text class="pill">user api: 9003</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import {
	getCurrentUser,
	miniPhoneLogin,
	persistAuth,
	removeAuth,
	updateCurrentUser,
} from '../../api/user'
import { getAuthState } from '../../utils/auth'
import { showError, withLoading } from '../../utils/feedback'

function createEmptyProfile() {
	return {
		user_base: {
			user_id: '',
			nick_name: '',
			avatar: '',
			gender: 'unknown',
			birth_date: 0,
		},
		user_private: {
			user_id: '',
			phone: '',
			email: '',
			password: '',
			role: '',
			status: 0,
		},
	}
}

export default {
	data() {
		return {
			auth: null,
			profile: null,
			agreed: false,
		}
	},
	computed: {
		displayName() {
			if (this.profile && this.profile.user_base && this.profile.user_base.nick_name) {
				return this.profile.user_base.nick_name
			}
			return '微信用户'
		},
		displayAvatar() {
			if (this.profile && this.profile.user_base && this.profile.user_base.avatar) {
				return this.profile.user_base.avatar
			}
			return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80'
		},
	},
	onShow() {
		this.auth = getAuthState()
		// “我的”页是 tab 页面，每次切回时都重新读取本地登录态。
		if (this.auth) {
			this.loadProfile()
		}
	},
	methods: {
		toggleAgreement() {
			this.agreed = !this.agreed
		},
		showGuestNotice() {
			uni.showToast({
				title: '部分个人能力需登录后使用',
				icon: 'none',
			})
		},
		async handlePhoneLogin(event) {
			if (!this.agreed) {
				showError(new Error('请先阅读并勾选协议'))
				return
			}
			const detail = event && event.detail ? event.detail : {}
			if (!detail.code) {
				showError(new Error(detail.errMsg || '未获取到手机号授权'))
				return
			}
			try {
				const profileInfo = await this.getWechatProfile()
				const result = await withLoading('登录中', () =>
					miniPhoneLogin({
						phone_code: detail.code,
						nick_name: profileInfo.nickName,
						avatar: profileInfo.avatarUrl,
					})
				)
				this.auth = result
				const rid = result && (result.user_id || result.userId)
				persistAuth(rid ? { ...result, user_id: String(rid) } : result)
				this.auth = getAuthState()
				await this.loadProfile()
				uni.showToast({ title: result.is_new_user ? '登录成功' : '欢迎回来', icon: 'success' })
			} catch (error) {
				showError(error)
			}
		},
		async syncWechatProfile() {
			if (!this.auth) {
				showError(new Error('请先登录'))
				return
			}
			try {
				const profileInfo = await this.getWechatProfile()
				const payload = JSON.parse(JSON.stringify(this.profile || createEmptyProfile()))
				payload.user_private.password = ''
				payload.user_base.nick_name = profileInfo.nickName || payload.user_base.nick_name
				payload.user_base.avatar = profileInfo.avatarUrl || payload.user_base.avatar
				await withLoading('同步中', () =>
					updateCurrentUser(payload, ['nick_name', 'avatar'])
				)
				await this.loadProfile()
				uni.showToast({ title: '同步成功', icon: 'success' })
			} catch (error) {
				showError(error)
			}
		},
		getWechatProfile() {
			return new Promise((resolve) => {
				if (typeof uni.getUserProfile === 'function') {
					uni.getUserProfile({
						desc: '用于完善个人资料',
						success: (res) => {
							resolve(res.userInfo || {})
						},
						fail: () => {
							resolve({})
						},
					})
					return
				}
				resolve({})
			})
		},
		async loadProfile() {
			if (!this.auth) {
				this.profile = null
				return
			}
			try {
				const result = await withLoading('加载资料', () => getCurrentUser('get_private_info'))
				const nextProfile = result.user_info || createEmptyProfile()
				this.profile = nextProfile
				const uid = nextProfile.user_base && nextProfile.user_base.user_id
				if (uid && this.auth) {
					const merged = { ...this.auth, user_id: String(uid) }
					this.auth = merged
					persistAuth(merged)
				}
			} catch (error) {
				showError(error)
			}
		},
		async saveProfile() {
			if (!this.profile) {
				showError(new Error('请先登录'))
				return
			}
			try {
				const payload = JSON.parse(JSON.stringify(this.profile))
				payload.user_private.password = ''
				await withLoading('保存中', () =>
					updateCurrentUser(payload, ['nick_name', 'avatar', 'gender', 'email'])
				)
				uni.showToast({ title: '保存成功', icon: 'success' })
				await this.loadProfile()
			} catch (error) {
				showError(error)
			}
		},
		logout() {
			removeAuth()
			this.auth = null
			this.profile = null
			uni.showToast({ title: '已退出', icon: 'none' })
		},
	},
}
</script>

<style scoped>
.wechat-login-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20rpx 0 8rpx;
}

.account-poster {
	padding-bottom: 34rpx;
}

.account-hero {
	display: flex;
	align-items: center;
	gap: 22rpx;
	margin-top: 30rpx;
	padding: 22rpx;
	border-radius: 30rpx;
	background: rgba(255, 247, 239, 0.08);
	border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.hero-avatar {
	width: 108rpx;
	height: 108rpx;
	flex-shrink: 0;
}

.hero-copy {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	min-width: 0;
}

.hero-name {
	font-size: 32rpx;
	font-weight: 700;
	color: #fff7ef;
}

.hero-desc {
	font-size: 24rpx;
	line-height: 1.6;
	color: rgba(255, 247, 239, 0.72);
}

.agreement-box {
	padding: 26rpx;
	border-radius: 30rpx;
	background: rgba(255, 247, 239, 0.1);
	border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.agreement-row {
	display: flex;
	align-items: flex-start;
	gap: 14rpx;
}

.agree-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34rpx;
	height: 34rpx;
	margin-top: 4rpx;
	border-radius: 999rpx;
	border: 1rpx solid rgba(255, 247, 239, 0.55);
	color: transparent;
	flex-shrink: 0;
	font-size: 22rpx;
}

.agree-icon.checked {
	background: #fff7ef;
	color: var(--accent-deep);
	border-color: #fff7ef;
}

.agreement-text {
	flex: 1;
	font-size: 24rpx;
	line-height: 1.7;
	color: rgba(255, 247, 239, 0.82);
}

.phone-login-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 92rpx;
	margin-top: 26rpx;
	border: 0;
	border-radius: 999rpx;
	background: linear-gradient(180deg, #ffd966, #ffcc2f);
	color: #2e2118;
	font-size: 32rpx;
	font-weight: 700;
}

.phone-login-button::after {
	border: 0;
}

.skip-text {
	display: block;
	margin-top: 22rpx;
	text-align: center;
	font-size: 26rpx;
	color: rgba(255, 247, 239, 0.76);
}

.benefit-grid,
.quick-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 18rpx;
}

.benefit-card,
.quick-card {
	padding: 24rpx;
	border-radius: 26rpx;
	background: rgba(255, 255, 255, 0.56);
	border: 1rpx solid rgba(31, 28, 24, 0.06);
}

.benefit-kicker {
	display: block;
	font-size: 22rpx;
	letter-spacing: 4rpx;
	color: var(--accent-deep);
}

.benefit-title,
.quick-title {
	display: block;
	margin-top: 12rpx;
	font-size: 30rpx;
	font-weight: 700;
}

.quick-state {
	display: inline-flex;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(201, 109, 68, 0.12);
	color: var(--accent-deep);
	font-size: 22rpx;
}

.wechat-avatar {
	width: 132rpx;
	height: 132rpx;
	border-radius: 999rpx;
	background: rgba(201, 109, 68, 0.12);
}

.wechat-name {
	display: block;
	margin-top: 18rpx;
	font-size: 34rpx;
	font-weight: 700;
}

.center-text {
	text-align: center;
}
</style>
