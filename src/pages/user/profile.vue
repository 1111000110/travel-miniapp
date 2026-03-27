<template>
	<view class="profile-page">
		<view class="header-card">
			<image
				v-if="avatarUrl"
				class="avatar"
				:src="avatarUrl"
				mode="aspectFill"
			/>
			<view v-else class="avatar avatar-ph">{{ nameInitial }}</view>
			<text class="nickname">{{ displayName }}</text>
		</view>

		<view v-if="loadError" class="hint-card">
			<text class="hint-text">{{ loadError }}</text>
		</view>

		<view class="actions">
			<view
				v-if="canChat"
				class="action-btn primary"
				@tap="openPrivateChat"
			>
				<text class="action-text">私聊</text>
			</view>
			<view v-else-if="isSelf" class="hint-inline">
				<text class="hint-text">这是你自己</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getCurrentUserId } from '../../utils/auth'
import { getUserPublic } from '../../api/user'

export default {
	data() {
		return {
			userId: '',
			fallbackNick: '',
			nickName: '',
			avatar: '',
			myUserId: '',
			loadError: '',
		}
	},
	computed: {
		displayName() {
			return this.nickName || this.fallbackNick || '旅行者'
		},
		avatarUrl() {
			return this.avatar || ''
		},
		nameInitial() {
			const s = this.displayName.trim()
			return s ? s.slice(0, 1) : '?'
		},
		isSelf() {
			return !!(this.myUserId && this.userId && this.myUserId === this.userId)
		},
		canChat() {
			return !!(this.myUserId && this.userId && !this.isSelf)
		},
	},
	onLoad(options) {
		this.userId = (options.userId && decodeURIComponent(options.userId)) || ''
		this.fallbackNick = (options.nickName && decodeURIComponent(options.nickName)) || ''
	},
	onShow() {
		this.myUserId = getCurrentUserId()
		if (this.userId) this.loadProfile()
	},
	methods: {
		async loadProfile() {
			this.loadError = ''
			try {
				const res = await getUserPublic(this.userId)
				const u = res && res.user_info
				const base = u && u.user_base
				if (base) {
					this.nickName = base.nick_name || this.fallbackNick
					this.avatar = base.avatar || ''
				}
			} catch (e) {
				this.nickName = this.fallbackNick
				this.avatar = ''
				const msg = (e && e.message) || ''
				if (msg.includes('401') || msg.includes('未登录') || msg.includes('token')) {
					this.loadError = '登录后可查看对方资料与发起私聊'
				} else {
					this.loadError = '暂时无法加载资料'
				}
			}
		},
		openPrivateChat() {
			if (!this.canChat) return
			const pid = this.userId
			const name = this.displayName
			uni.navigateTo({
				url: `/pages/message/chat?peerId=${encodeURIComponent(pid)}&peerName=${encodeURIComponent(name)}`,
			})
		},
	},
}
</script>

<style scoped>
.profile-page {
	min-height: 100vh;
	background: var(--bg);
	padding: 40rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
}

.header-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 48rpx 32rpx;
	background: var(--surface);
	border-radius: 28rpx;
	box-shadow: var(--shadow-sm);
}

.avatar {
	width: 160rpx;
	height: 160rpx;
	border-radius: 999rpx;
	background: var(--accent-bg);
}

.avatar-ph {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 56rpx;
	font-weight: 700;
	color: var(--accent);
}

.nickname {
	margin-top: 28rpx;
	font-size: 40rpx;
	font-weight: 800;
	color: var(--text);
}

.uid {
	margin-top: 12rpx;
	font-size: 24rpx;
	color: var(--text-2);
}

.hint-card {
	margin-top: 24rpx;
	padding: 24rpx 28rpx;
	background: var(--surface);
	border-radius: 20rpx;
	border: 1rpx solid var(--border);
}

.hint-inline {
	margin-top: 32rpx;
	text-align: center;
}

.hint-text {
	font-size: 26rpx;
	color: var(--text-2);
	line-height: 1.5;
}

.actions {
	margin-top: 40rpx;
}

.action-btn {
	height: 88rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.action-btn.primary {
	background: var(--accent);
	box-shadow: 0 8rpx 24rpx rgba(224, 92, 42, 0.35);
}

.action-text {
	font-size: 30rpx;
	font-weight: 700;
	color: #fff;
}
</style>
