<template>
	<view class="page-shell profile-page">
		<!-- 未登录 -->
		<view v-if="!auth" class="login-panel">
			<text class="login-title">登录</text>
			<text class="login-desc">使用微信授权手机号，用于账号与消息</text>
			<view class="agree-row" @tap="toggleAgreement">
				<view class="agree-box" :class="{ on: agreed }">{{ agreed ? '✓' : '' }}</view>
				<text class="agree-txt">同意《服务协议》《隐私政策》</text>
			</view>
			<button class="login-btn" open-type="getPhoneNumber" @getphonenumber="handlePhoneLogin">
				手机号登录
			</button>
			<text class="skip-link" @tap="showGuestNotice">暂不登录</text>
		</view>

		<!-- 已登录 -->
		<view v-else class="me-panel">
			<view class="me-card">
				<image class="me-avatar" :src="displayAvatar" mode="aspectFill" />
				<text class="me-name">{{ displayName }}</text>
				<text class="me-phone">{{ phoneDisplay }}</text>

				<template v-if="!editing">
					<view class="me-row-actions">
						<view class="text-btn" @tap="editing = true">编辑资料</view>
						<text class="dot">·</text>
						<view class="text-btn" @tap="openWechatSync">同步微信头像昵称</view>
					</view>
					<view class="logout-btn" @tap="logout">退出登录</view>
				</template>

				<view v-else-if="profile" class="edit-form">
					<view class="field-group">
						<text class="field-label">昵称</text>
						<input v-model="profile.user_base.nick_name" class="field-input" placeholder="昵称" />
					</view>
					<view class="field-group">
						<text class="field-label">头像链接</text>
						<input v-model="profile.user_base.avatar" class="field-input" placeholder="图片 URL" />
					</view>
					<view class="field-row">
						<view class="field-group half">
							<text class="field-label">性别</text>
							<input v-model="profile.user_base.gender" class="field-input" placeholder="unknown" />
						</view>
						<view class="field-group half">
							<text class="field-label">邮箱</text>
							<input v-model="profile.user_private.email" class="field-input" placeholder="选填" />
						</view>
					</view>
					<view class="edit-actions">
						<view class="pill-btn ghost" @tap="cancelEdit">取消</view>
						<view class="pill-btn primary" @tap="saveProfile">保存</view>
					</view>
				</view>
				<view v-else class="me-loading">
					<text class="muted-txt">加载中…</text>
				</view>
			</view>
		</view>

		<!-- 微信小程序：chooseAvatar + 昵称输入，头像 STS 直传 OSS -->
		<!-- #ifdef MP-WEIXIN -->
		<view v-if="wechatSyncOpen" class="sync-mask" @tap="closeWechatSync">
			<view class="sync-sheet" @tap.stop>
				<text class="sync-title">同步微信资料</text>
				<text class="sync-hint">请选择头像并确认昵称后保存</text>
				<image class="sync-avatar-preview" :src="wxAvatarPreview" mode="aspectFill" />
				<button class="sync-choose-btn" open-type="chooseAvatar" @chooseavatar="onWxChooseAvatar">
					选择微信头像
				</button>
				<input
					class="sync-nick-input"
					type="nickname"
					:value="wxNickDraft"
					placeholder="微信昵称"
					@input="onWxNickInput"
				/>
				<view class="sync-sheet-actions">
					<view class="pill-btn ghost" @tap="closeWechatSync">取消</view>
					<view class="pill-btn primary" @tap="confirmWechatSync">保存</view>
				</view>
			</view>
		</view>
		<!-- #endif -->
	</view>
</template>

<script>
import {
	getCurrentUser,
	miniPhoneLogin,
	persistAuth,
	removeAuth,
	updateCurrentUser,
	uploadAvatarFile,
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

const DEFAULT_AVATAR =
	'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80'

export default {
	data() {
		return {
			auth: null,
			profile: null,
			agreed: false,
			editing: false,
			wechatSyncOpen: false,
			wxNickDraft: '',
			wxAvatarLocal: '',
		}
	},
	computed: {
		displayName() {
			const n = this.profile && this.profile.user_base && this.profile.user_base.nick_name
			return (n && String(n).trim()) || '未设置昵称'
		},
		displayAvatar() {
			const a = this.profile && this.profile.user_base && this.profile.user_base.avatar
			return (a && String(a).trim()) || DEFAULT_AVATAR
		},
		phoneDisplay() {
			if (!this.profile) return ''
			const p = this.profile.user_private && this.profile.user_private.phone
			if (!p || String(p).length < 7) return '已绑定手机号'
			const s = String(p)
			return `${s.slice(0, 3)}****${s.slice(-4)}`
		},
		wxAvatarPreview() {
			if (this.wxAvatarLocal) return this.wxAvatarLocal
			return this.displayAvatar
		},
	},
	onShow() {
		this.auth = getAuthState()
		if (this.auth) {
			this.loadProfile(true)
		} else {
			this.profile = null
			this.editing = false
		}
	},
	methods: {
		toggleAgreement() {
			this.agreed = !this.agreed
		},
		showGuestNotice() {
			uni.showToast({ title: '登录后可使用私信等功能', icon: 'none' })
		},
		cancelEdit() {
			this.editing = false
			this.loadProfile(true)
		},
		async handlePhoneLogin(event) {
			if (!this.agreed) {
				showError(new Error('请先勾选同意协议'))
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
				const rid = result && (result.user_id || result.userId)
				persistAuth(rid ? { ...result, user_id: String(rid) } : result)
				this.auth = getAuthState()
				await this.loadProfile(false)
				this.editing = false
				uni.showToast({ title: result.is_new_user ? '登录成功' : '欢迎回来', icon: 'success' })
			} catch (error) {
				showError(error)
			}
		},
		openWechatSync() {
			if (!this.auth || !this.profile) return
			// #ifdef MP-WEIXIN
			const n = this.profile.user_base && this.profile.user_base.nick_name
			this.wxNickDraft = n ? String(n) : ''
			this.wxAvatarLocal = ''
			this.wechatSyncOpen = true
			// #endif
			// #ifndef MP-WEIXIN
			uni.showToast({ title: '请在微信小程序内同步头像与昵称', icon: 'none' })
			// #endif
		},
		closeWechatSync() {
			this.wechatSyncOpen = false
			this.wxAvatarLocal = ''
		},
		onWxChooseAvatar(e) {
			const u = e && e.detail && e.detail.avatarUrl
			if (u) this.wxAvatarLocal = u
		},
		onWxNickInput(e) {
			const v = e && e.detail && e.detail.value
			this.wxNickDraft = v != null ? String(v) : ''
		},
		async confirmWechatSync() {
			if (!this.profile) return
			const oldNick = ((this.profile.user_base && this.profile.user_base.nick_name) || '').trim()
			const newNick = (this.wxNickDraft || '').trim()
			const nickChanged = newNick !== oldNick
			const avatarPicked = !!this.wxAvatarLocal
			if (!nickChanged && !avatarPicked) {
				uni.showToast({ title: '请选择新头像或修改昵称', icon: 'none' })
				return
			}
			if (nickChanged && !newNick) {
				uni.showToast({ title: '昵称不能为空', icon: 'none' })
				return
			}
			const uid = this.profile.user_base && this.profile.user_base.user_id
			if (!uid) {
				showError(new Error('缺少用户 ID'))
				return
			}
			try {
				await withLoading('保存中', async () => {
					const payload = JSON.parse(JSON.stringify(this.profile))
					payload.user_private.password = ''
					if (nickChanged) payload.user_base.nick_name = newNick
					let avatarUrl = payload.user_base.avatar
					if (avatarPicked) {
						avatarUrl = await uploadAvatarFile(this.wxAvatarLocal)
						payload.user_base.avatar = avatarUrl
					}
					const fields = []
					if (nickChanged) fields.push('nick_name')
					if (avatarPicked) fields.push('avatar')
					await updateCurrentUser(payload, fields)
				})
				this.closeWechatSync()
				await this.loadProfile(true)
				uni.showToast({ title: '已更新', icon: 'success' })
			} catch (error) {
				showError(error)
			}
		},
		getWechatProfile() {
			return new Promise((resolve) => {
				if (typeof uni.getUserProfile === 'function') {
					uni.getUserProfile({
						desc: '用于完善头像昵称',
						success: (res) => resolve(res.userInfo || {}),
						fail: () => resolve({}),
					})
					return
				}
				resolve({})
			})
		},
		async loadProfile(silent) {
			if (!this.auth) {
				this.profile = null
				return
			}
			const run = async () => {
				const result = await getCurrentUser('get_private_info')
				const nextProfile = result.user_info || createEmptyProfile()
				this.profile = nextProfile
				const uid = nextProfile.user_base && nextProfile.user_base.user_id
				if (uid && this.auth) {
					const merged = { ...this.auth, user_id: String(uid) }
					this.auth = merged
					persistAuth(merged)
				}
			}
			try {
				if (silent) {
					await run()
				} else {
					await withLoading('加载中', run)
				}
			} catch (error) {
				showError(error)
			}
		},
		async saveProfile() {
			if (!this.profile) return
			try {
				const payload = JSON.parse(JSON.stringify(this.profile))
				payload.user_private.password = ''
				await withLoading('保存中', () =>
					updateCurrentUser(payload, ['nick_name', 'avatar', 'gender', 'email'])
				)
				uni.showToast({ title: '已保存', icon: 'success' })
				this.editing = false
				await this.loadProfile(true)
			} catch (error) {
				showError(error)
			}
		},
		logout() {
			removeAuth()
			this.auth = null
			this.profile = null
			this.editing = false
			uni.showToast({ title: '已退出', icon: 'none' })
		},
	},
}
</script>

<style scoped>
.profile-page {
	padding: 32rpx;
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

/* ── 登录 ── */
.login-panel {
	margin-top: 80rpx;
	padding: 48rpx 40rpx;
	background: var(--surface);
	border-radius: 28rpx;
	box-shadow: var(--shadow-sm);
}

.login-title {
	display: block;
	font-size: 40rpx;
	font-weight: 800;
	color: var(--text);
}

.login-desc {
	display: block;
	margin-top: 16rpx;
	font-size: 26rpx;
	color: var(--text-2);
	line-height: 1.5;
}

.agree-row {
	display: flex;
	align-items: flex-start;
	gap: 14rpx;
	margin-top: 40rpx;
}

.agree-box {
	width: 36rpx;
	height: 36rpx;
	border-radius: 8rpx;
	border: 2rpx solid var(--border);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22rpx;
	color: transparent;
	flex-shrink: 0;
	margin-top: 4rpx;
}

.agree-box.on {
	background: var(--accent);
	border-color: var(--accent);
	color: #fff;
}

.agree-txt {
	flex: 1;
	font-size: 24rpx;
	color: var(--text-2);
	line-height: 1.55;
}

.login-btn {
	width: 100%;
	height: 88rpx;
	margin-top: 32rpx;
	line-height: 88rpx;
	text-align: center;
	border-radius: 999rpx;
	background: var(--accent);
	color: #fff;
	font-size: 30rpx;
	font-weight: 700;
	border: none;
}

.login-btn::after {
	border: none;
}

.skip-link {
	display: block;
	margin-top: 28rpx;
	text-align: center;
	font-size: 26rpx;
	color: var(--text-2);
}

/* ── 个人主页 ── */
.me-panel {
	margin-top: 24rpx;
}

.me-card {
	background: var(--surface);
	border-radius: 28rpx;
	padding: 48rpx 36rpx 40rpx;
	box-shadow: var(--shadow-sm);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.me-avatar {
	width: 144rpx;
	height: 144rpx;
	border-radius: 999rpx;
	background: var(--accent-bg);
}

.me-name {
	margin-top: 24rpx;
	font-size: 36rpx;
	font-weight: 800;
	color: var(--text);
}

.me-phone {
	margin-top: 10rpx;
	font-size: 26rpx;
	color: var(--text-2);
}

.me-row-actions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	justify-content: center;
	gap: 8rpx;
	margin-top: 36rpx;
}

.text-btn {
	font-size: 28rpx;
	color: var(--accent);
	font-weight: 600;
	padding: 8rpx 12rpx;
}

.dot {
	font-size: 26rpx;
	color: var(--text-2);
}

.logout-btn {
	margin-top: 32rpx;
	font-size: 26rpx;
	color: var(--text-2);
	padding: 12rpx 24rpx;
}

.me-loading {
	margin-top: 24rpx;
}

.muted-txt {
	font-size: 26rpx;
	color: var(--text-2);
}

/* ── 编辑 ── */
.edit-form {
	width: 100%;
	margin-top: 36rpx;
	padding-top: 28rpx;
	border-top: 1rpx solid var(--border);
}

.field-group {
	margin-bottom: 24rpx;
}

.field-group.half {
	margin-bottom: 0;
}

.field-row {
	display: flex;
	gap: 20rpx;
	margin-bottom: 24rpx;
}

.field-row .half {
	flex: 1;
	min-width: 0;
}

.field-label {
	display: block;
	font-size: 24rpx;
	color: var(--text-2);
	margin-bottom: 10rpx;
}

.field-input {
	width: 100%;
	height: 80rpx;
	padding: 0 22rpx;
	background: var(--bg);
	border-radius: 16rpx;
	border: 1rpx solid var(--border);
	font-size: 28rpx;
	color: var(--text);
}

.edit-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 12rpx;
}

.pill-btn {
	flex: 1;
	height: 80rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: 700;
}

.pill-btn.ghost {
	background: var(--surface-2);
	color: var(--text);
}

.pill-btn.primary {
	background: var(--accent);
	color: #fff;
}

/* ── 微信资料同步弹层 ── */
.sync-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	z-index: 500;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	padding: 0 24rpx calc(24rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.sync-sheet {
	width: 100%;
	max-width: 680rpx;
	background: var(--surface);
	border-radius: 28rpx 28rpx 20rpx 20rpx;
	padding: 36rpx 32rpx 32rpx;
	box-shadow: var(--shadow-sm);
}

.sync-title {
	display: block;
	font-size: 34rpx;
	font-weight: 800;
	color: var(--text);
	text-align: center;
}

.sync-hint {
	display: block;
	margin-top: 16rpx;
	font-size: 24rpx;
	color: var(--text-2);
	line-height: 1.5;
}

.sync-avatar-preview {
	display: block;
	width: 160rpx;
	height: 160rpx;
	border-radius: 999rpx;
	margin: 28rpx auto 0;
	background: var(--accent-bg);
}

.sync-choose-btn {
	width: 100%;
	height: 80rpx;
	margin-top: 24rpx;
	line-height: 80rpx;
	text-align: center;
	border-radius: 999rpx;
	background: var(--surface-2);
	color: var(--text);
	font-size: 28rpx;
	font-weight: 600;
	border: 1rpx solid var(--border);
}

.sync-choose-btn::after {
	border: none;
}

.sync-nick-input {
	width: 100%;
	height: 88rpx;
	margin-top: 20rpx;
	padding: 0 22rpx;
	box-sizing: border-box;
	background: var(--bg);
	border-radius: 16rpx;
	border: 1rpx solid var(--border);
	font-size: 28rpx;
	color: var(--text);
}

.sync-sheet-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 32rpx;
}
</style>
