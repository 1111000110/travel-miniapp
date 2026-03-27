<template>
	<view class="chat-page">
		<view class="chat-list">
			<view v-if="loading && !messages.length" class="hint">加载中…</view>
			<view
				v-for="m in orderedMessages"
				:key="m.message_id"
				class="bubble-row"
				:class="{ mine: isMine(m) }"
			>
				<!-- 头像始终在 DOM 首位，mine 行 row-reverse 后自然落到右侧 -->
				<view class="row-avatar-wrap">
					<template v-if="isMine(m)">
						<image v-if="myAvatar" class="row-avatar" :src="myAvatar" mode="aspectFill" />
						<view v-else class="row-avatar row-avatar-ph" :style="{ background: avatarColor(myId) }">
							<text class="row-avatar-txt">{{ myInitial }}</text>
						</view>
					</template>
					<template v-else>
						<image v-if="peerAvatar" class="row-avatar" :src="peerAvatar" mode="aspectFill" />
						<view v-else class="row-avatar row-avatar-ph" :style="{ background: avatarColor(peerId) }">
							<text class="row-avatar-txt">{{ peerInitial }}</text>
						</view>
					</template>
				</view>
				<view class="bubble">
					<text class="bubble-text">{{ bubbleText(m) }}</text>
					<text class="bubble-meta">{{ formatTime(m.create_time) }}</text>
				</view>
			</view>
			<view v-if="!loading && !messages.length" class="hint">发一条消息，开始对话吧</view>
		</view>
		<view class="composer safe-bottom">
			<input
				v-model="draft"
				class="composer-input"
				type="text"
				confirm-type="send"
				placeholder="输入消息"
				@confirm="send"
			/>
			<view class="send-btn" @tap="send"><text class="send-txt">发送</text></view>
		</view>
	</view>
</template>

<script>
import {
	getMessageList,
	sendMessage,
	markSessionRead,
	getPrivateSessionId,
} from '../../api/message'
import { getCurrentUserId } from '../../utils/auth'
import { getCurrentUser, getUserPublic } from '../../api/user'
import { showError } from '../../utils/feedback'

const AVATAR_COLORS = [
	'#E05C2A', '#2A8AE0', '#2AE07C', '#E02A7C',
	'#8A2AE0', '#E0B42A', '#2AE0C0', '#6B4E3D',
]

export default {
	data() {
		return {
			peerId: '',
			peerName: '',
			sessionId: '',
			messages: [],
			draft: '',
			loading: false,
			myId: '',
			myAvatar: '',
			myNick: '',
			peerAvatar: '',
		}
	},
	computed: {
		orderedMessages() {
			return [...this.messages].sort((a, b) => (a.create_time || 0) - (b.create_time || 0))
		},
		peerDisplayLabel() {
			const id = (this.peerId || '').trim()
			const name = (this.peerName || '').trim()
			if (name && name !== id) return name
			return '旅行者'
		},
		peerInitial() {
			return this.peerDisplayLabel.slice(0, 1) || '?'
		},
		myDisplayLabel() {
			const n = (this.myNick || '').trim()
			return n || '我'
		},
		myInitial() {
			return this.myDisplayLabel.slice(0, 1) || '?'
		},
	},
	onLoad(options) {
		this.peerId = decodeURIComponent(options.peerId || '')
		const raw = decodeURIComponent(options.peerName || '').trim()
		// 不把 user_id 当昵称展示：与 peerId 相同或为空则视为未传昵称
		this.peerName = raw && raw !== this.peerId ? raw : ''
		uni.setNavigationBarTitle({ title: this.peerName || '私信' })
		this.myId = getCurrentUserId()
		if (!this.myId || !this.peerId) {
			uni.showToast({ title: !this.myId ? '请先登录' : '参数错误', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1500)
			return
		}
		if (this.myId === this.peerId) {
			uni.showToast({ title: '不能与自己对话', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1500)
			return
		}
		this.sessionId = getPrivateSessionId(this.myId, this.peerId)
		this.loadUserFaces()
		this.refreshMessages()
		markSessionRead({ session_id: this.sessionId }).catch(() => {})
	},
	onPullDownRefresh() {
		this.refreshMessages().finally(() => uni.stopPullDownRefresh())
	},
	methods: {
		avatarColor(id = '') {
			let hash = 0
			for (let i = 0; i < id.length; i++) {
				hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
			}
			return AVATAR_COLORS[hash % AVATAR_COLORS.length]
		},
		async loadUserFaces() {
			try {
				const [meRes, peerRes] = await Promise.all([
					getCurrentUser('get_private_info').catch(() => null),
					getUserPublic(this.peerId).catch(() => null),
				])
				const meBase = meRes && meRes.user_info && meRes.user_info.user_base
				if (meBase) {
					this.myAvatar = meBase.avatar || ''
					this.myNick = meBase.nick_name || ''
				}
				const peerBase = peerRes && peerRes.user_info && peerRes.user_info.user_base
				if (peerBase) {
					this.peerAvatar = peerBase.avatar || ''
					if (peerBase.nick_name) {
						this.peerName = peerBase.nick_name
					}
				}
				uni.setNavigationBarTitle({ title: this.peerName || '私信' })
			} catch {
				// 无头像时用首字色块
			}
		},
		isMine(m) {
			return m && String(m.send_id) === String(this.myId)
		},
		bubbleText(m) {
			const c = m.content || {}
			if (c.text) return c.text
			const t = c.content_type
			if (t === 2) return '[图片]'
			if (t === 3) return '[文件]'
			if (t === 4) return '[语音]'
			return ' '
		},
		formatTime(ts) {
			if (!ts) return ''
			const d = new Date(ts * 1000)
			if (Number.isNaN(d.getTime())) return ''
			return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
		},
		async refreshMessages() {
			if (!this.sessionId) return
			this.loading = true
			try {
				const res = await getMessageList({ session_id: this.sessionId, last_message_id: '', limit: 50 })
				this.messages = res.messages || []
			} catch (e) {
				showError(e)
			} finally {
				this.loading = false
			}
		},
		async send() {
			const text = (this.draft || '').trim()
			if (!text || !this.sessionId) return
			try {
				const res = await sendMessage({
					session_id: this.sessionId,
					content: { content_type: 1, text },
				})
				this.draft = ''
				if (res.message) {
					this.messages = [res.message, ...this.messages.filter((m) => m.message_id !== res.message.message_id)]
				} else {
					await this.refreshMessages()
				}
			} catch (e) {
				showError(e)
			}
		},
	},
}
</script>

<style scoped>
.chat-page {
	min-height: 100vh;
	background: var(--bg);
	display: flex;
	flex-direction: column;
	padding-bottom: env(safe-area-inset-bottom);
}
.chat-list {
	flex: 1;
	padding: 24rpx 24rpx 200rpx;
	overflow-y: auto;
}
.hint {
	text-align: center;
	color: var(--text-2);
	font-size: 26rpx;
	padding: 40rpx;
}
.bubble-row {
	display: flex;
	align-items: flex-end;
	gap: 12rpx;
	margin-bottom: 20rpx;
}
.bubble-row.mine {
	flex-direction: row-reverse;
}
.row-avatar-wrap {
	flex-shrink: 0;
	width: 72rpx;
	display: flex;
	justify-content: center;
}
.row-avatar {
	width: 64rpx;
	height: 64rpx;
	border-radius: 999rpx;
}
.row-avatar-ph {
	display: flex;
	align-items: center;
	justify-content: center;
}
.row-avatar-txt {
	font-size: 26rpx;
	font-weight: 700;
	color: #fff;
	line-height: 1;
}
.bubble {
	max-width: calc(100% - 84rpx);
	min-width: 0;
	flex: 0 1 auto;
	padding: 20rpx 24rpx;
	border-radius: 24rpx;
	background: var(--surface);
	border: 1rpx solid var(--border);
}
.bubble-row.mine .bubble {
	background: var(--accent-bg);
	border-color: transparent;
}
.bubble-text {
	font-size: 30rpx;
	color: var(--text);
	line-height: 1.5;
	word-break: break-word;
}
.bubble-meta {
	display: block;
	margin-top: 8rpx;
	font-size: 20rpx;
	color: var(--text-2);
}
.composer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
	background: var(--bg);
	border-top: 1rpx solid var(--border);
}
.safe-bottom {
	padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.composer-input {
	flex: 1;
	height: 80rpx;
	padding: 0 24rpx;
	border-radius: 999rpx;
	background: var(--surface);
	border: 1rpx solid var(--border);
	font-size: 28rpx;
}
.send-btn {
	padding: 0 32rpx;
	height: 80rpx;
	border-radius: 999rpx;
	background: var(--accent);
	display: flex;
	align-items: center;
	justify-content: center;
}
.send-txt {
	font-size: 28rpx;
	font-weight: 700;
	color: #fff;
}
</style>
