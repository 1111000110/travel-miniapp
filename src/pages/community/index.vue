<template>
	<view class="msg-page">
		<!-- 顶部 Header -->
		<view class="msg-header">
			<view class="msg-header-row">
				<text class="msg-page-title">消息</text>
				<view class="header-icons">
					<view class="icon-btn" @tap="goSearch">
						<text class="icon-sym">🔍</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 分段切换：消息在左、默认选中 -->
		<view class="tab-bar">
			<view
				v-for="tab in tabs"
				:key="tab.key"
				class="tab-item"
				:class="{ active: activeTab === tab.key }"
				@tap="switchTab(tab.key)"
			>
				<text class="tab-label">{{ tab.label }}</text>
				<view v-if="tab.key === 'message' && unread.message_count > 0" class="tab-badge">
					<text class="tab-badge-txt">{{ unread.message_count > 99 ? '99+' : unread.message_count }}</text>
				</view>
				<view v-if="tab.key === 'notification' && unread.notification_count > 0" class="tab-badge">
					<text class="tab-badge-txt">{{ unread.notification_count > 99 ? '99+' : unread.notification_count }}</text>
				</view>
			</view>
		</view>

		<!-- 消息：私信会话 -->
		<view v-if="activeTab === 'message'">
			<view v-if="sessionLoading" class="list">
				<view v-for="i in 5" :key="'sk-s' + i" class="sk-row">
					<view class="sk-avatar sk-block" />
					<view class="sk-body">
						<view class="sk-block" style="height:28rpx;width:45%;border-radius:6rpx;" />
						<view class="sk-block" style="height:24rpx;width:70%;border-radius:6rpx;margin-top:10rpx;" />
					</view>
					<view class="sk-block" style="width:60rpx;height:22rpx;border-radius:6rpx;" />
				</view>
			</view>
			<view v-else-if="sessions.length" class="list">
				<view
					v-for="session in sessions"
					:key="session.session_id"
					class="msg-row"
					:class="{ unread: session.unread_count > 0 }"
					@tap="openSession(session)"
				>
					<view class="avatar-wrap">
						<image
							v-if="sessionPeerAvatar(session)"
							class="avatar-img"
							:src="sessionPeerAvatar(session)"
							mode="aspectFill"
						/>
						<view
							v-else
							class="avatar-ph"
							:style="{ background: getAvatarColor(session.peer_id) }"
						>
							<text class="avatar-ph-txt">{{ sessionPeerInitial(session) }}</text>
						</view>
						<view v-if="session.unread_count > 0" class="unread-badge">
							<text class="unread-badge-txt">{{ session.unread_count > 99 ? '99+' : session.unread_count }}</text>
						</view>
					</view>
					<view class="msg-body">
						<view class="msg-name-row">
							<text class="msg-name">{{ sessionPeerName(session) }}</text>
							<text class="msg-time">{{ session.last_msg_time ? formatTime(session.last_msg_time) : '' }}</text>
						</view>
						<text class="msg-preview">{{ session.last_text || '暂无消息' }}</text>
					</view>
				</view>
				<view class="load-row" @tap="loadMoreSessions">
					<text class="load-txt">{{ sessionNoMore ? '没有更多了' : (sessionMoreLoading ? '加载中…' : '加载更多') }}</text>
				</view>
			</view>
			<view v-else class="empty-block">
				<text class="empty-icon">💬</text>
				<text class="empty-title">还没有消息</text>
				<text class="empty-desc">与旅行者的私信会显示在这里</text>
			</view>
		</view>

		<!-- 通知 -->
		<view v-else>
			<view v-if="notiLoading" class="list">
				<view v-for="i in 5" :key="'sk-n' + i" class="sk-row">
					<view class="sk-avatar sk-block" />
					<view class="sk-body">
						<view class="sk-block" style="height:28rpx;width:55%;border-radius:6rpx;" />
						<view class="sk-block" style="height:24rpx;width:80%;border-radius:6rpx;margin-top:10rpx;" />
					</view>
					<view class="sk-block" style="width:60rpx;height:22rpx;border-radius:6rpx;" />
				</view>
			</view>
			<view v-else-if="notifications.length" class="list">
				<view
					v-for="noti in notifications"
					:key="notifyId(noti)"
					class="msg-row"
					:class="{ unread: !noti.is_read }"
					@tap="handleNotificationTap(noti)"
				>
					<view class="avatar-wrap">
						<image
							v-if="notiActorAvatar(noti)"
							class="avatar-img"
							:src="notiActorAvatar(noti)"
							mode="aspectFill"
						/>
						<view
							v-else
							class="avatar-ph"
							:style="{ background: getAvatarColor(noti.actor_id || 'sys') }"
						>
							<text class="avatar-ph-txt">{{ notiActorInitial(noti) }}</text>
						</view>
						<view v-if="!noti.is_read" class="unread-dot" />
					</view>
					<view class="msg-body">
						<view class="msg-name-row">
							<text class="msg-name">{{ notiActorName(noti) }}</text>
							<text class="msg-time">{{ formatTime(noti.create_time) }}</text>
						</view>
						<view class="msg-preview-row">
							<text class="noti-type-tag">{{ notiTypeLabel(notifyType(noti)) }}</text>
							<text class="msg-preview">{{ noti.content }}</text>
						</view>
					</view>
				</view>
				<view class="load-row" @tap="loadMoreNotifications">
					<text class="load-txt">{{ notiNoMore ? '没有更多了' : (notiMoreLoading ? '加载中…' : '加载更多') }}</text>
				</view>
			</view>
			<view v-else class="empty-block">
				<text class="empty-icon">🔔</text>
				<text class="empty-title">暂无互动通知</text>
				<text class="empty-desc">当有人点赞或评论你，会在这里显示</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getInboxList, getNotificationList, getUnreadCount, markNotificationRead } from '../../api/message'
import { getUserPublic } from '../../api/user'
import { showError } from '../../utils/feedback'
import { getAuthState } from '../../utils/auth'

const PAGE_SIZE = 20

const TABS = [
	{ key: 'message', label: '消息' },
	{ key: 'notification', label: '通知' },
]

const AVATAR_COLORS = [
	'#E05C2A', '#2A8AE0', '#2AE07C', '#E02A7C',
	'#8A2AE0', '#E0B42A', '#2AE0C0', '#6B4E3D',
]

const NOTI_TYPE_MAP = {
	1: { label: '赞了你', icon: '❤' },
	2: { label: '评论了你', icon: '💬' },
	3: { label: '关注了你', icon: '➕' },
	4: { label: '系统通知', icon: '📢' },
}

export default {
	data() {
		return {
			tabs: TABS,
			activeTab: 'message',
			// 通知
			notifications: [],
			notiLoading: false,
			notiMoreLoading: false,
			notiLastId: '',
			notiNoMore: false,
			// 收件箱
			sessions: [],
			sessionLoading: false,
			sessionMoreLoading: false,
			sessionLastTime: 0,
			sessionNoMore: false,
			// 未读数
			unread: { message_count: 0, notification_count: 0 },
			pollTimer: null,
			/** 通知 actor_id -> { nick_name, avatar } */
			actorProfileMap: {},
			/** 私聊 peer_id -> { nick_name, avatar } */
			peerProfileMap: {},
		}
	},
	onShow() {
		this.loadUnreadCount()
		if (this.activeTab === 'message') {
			if (!this.sessions.length) this.loadSessions(true)
		} else if (!this.notifications.length) {
			this.loadNotifications(true)
		}
		this.startMessagePoll()
	},
	onHide() {
		this.stopMessagePoll()
	},
	onUnload() {
		this.stopMessagePoll()
	},
	async onPullDownRefresh() {
		try {
			await Promise.all([this.loadUnreadCount(), this.refreshCurrent()])
		} finally {
			uni.stopPullDownRefresh()
		}
	},
	methods: {
		notifyId(n) {
			return (n && (n.notify_id || n.noti_id)) || ''
		},
		notifyType(n) {
			if (!n) return 4
			return n.notify_type != null ? n.notify_type : n.noti_type
		},
		startMessagePoll() {
			this.stopMessagePoll()
			if (!this.isLoggedIn()) return
			this.pollTimer = setInterval(() => {
				this.loadUnreadCount()
				if (this.activeTab === 'notification') {
					this.loadNotifications(true, { silent: true })
				} else {
					this.loadSessions(true, { silent: true })
				}
			}, 18000)
		},
		stopMessagePoll() {
			if (this.pollTimer) {
				clearInterval(this.pollTimer)
				this.pollTimer = null
			}
		},
		switchTab(key) {
			if (this.activeTab === key) return
			this.activeTab = key
			if (key === 'notification') {
				if (!this.notifications.length) this.loadNotifications(true)
			} else if (!this.sessions.length) {
				this.loadSessions(true)
			}
		},
		async refreshCurrent() {
			if (this.activeTab === 'notification') {
				await this.loadNotifications(true)
			} else {
				await this.loadSessions(true)
			}
		},
		isLoggedIn() {
			const auth = getAuthState()
			return !!(auth && auth.token)
		},
		async loadUnreadCount() {
			if (!this.isLoggedIn()) return
			try {
				const result = await getUnreadCount()
				this.unread = {
					notification_count: result.notification || 0,
					message_count: result.message || 0,
				}
			} catch {
				// 静默失败
			}
		},
		async loadNotifications(reset = false, opts = {}) {
			if (!this.isLoggedIn()) return
			const silent = !!opts.silent
			if (reset) {
				this.notifications = []
				this.notiLastId = ''
				this.notiNoMore = false
				if (!silent) this.notiLoading = true
			} else {
				this.notiMoreLoading = true
			}
			try {
				const result = await getNotificationList({ last_id: this.notiLastId, limit: PAGE_SIZE })
				const items = result.items || []
				this.notifications = reset ? items : [...this.notifications, ...items]
				this.enrichActorProfiles(items)
				const last = items.length ? items[items.length - 1] : null
				this.notiLastId = last ? this.notifyId(last) : this.notiLastId
				this.notiNoMore = !result.has_more
				if (items.length && reset && !silent) {
					markNotificationRead({ notify_ids: [] }).catch(() => {})
				}
			} catch (error) {
				if (!silent) showError(error)
			} finally {
				this.notiLoading = false
				this.notiMoreLoading = false
			}
		},
		loadMoreNotifications() {
			if (this.notiMoreLoading || this.notiNoMore) return
			this.loadNotifications(false)
		},
		async loadSessions(reset = false, opts = {}) {
			if (!this.isLoggedIn()) return
			const silent = !!opts.silent
			if (reset) {
				this.sessions = []
				this.sessionLastTime = 0
				this.sessionNoMore = false
				if (!silent) this.sessionLoading = true
			} else {
				this.sessionMoreLoading = true
			}
			try {
				const result = await getInboxList({ last_time: this.sessionLastTime, limit: PAGE_SIZE })
				const items = result.items || []
				this.sessions = reset ? items : [...this.sessions, ...items]
				this.enrichPeerProfiles(items)
				this.sessionLastTime = items.length ? items[items.length - 1].last_msg_time : this.sessionLastTime
				this.sessionNoMore = !result.has_more
			} catch (error) {
				if (!silent) showError(error)
			} finally {
				this.sessionLoading = false
				this.sessionMoreLoading = false
			}
		},
		loadMoreSessions() {
			if (this.sessionMoreLoading || this.sessionNoMore) return
			this.loadSessions(false)
		},
		handleNotificationTap(noti) {
			if (noti.target_id) {
				uni.navigateTo({ url: `/pages/post/detail?postId=${encodeURIComponent(noti.target_id)}` })
			}
		},
		openSession(session) {
			if (session.session_type === 'private' && session.peer_id) {
				const name = this.sessionPeerName(session)
				uni.navigateTo({
					url: `/pages/message/chat?peerId=${encodeURIComponent(session.peer_id)}&peerName=${encodeURIComponent(name)}`,
				})
				return
			}
			uni.showToast({ title: '暂仅支持私聊会话', icon: 'none' })
		},
		notiTypeLabel(type) {
			return (NOTI_TYPE_MAP[type] || NOTI_TYPE_MAP[4]).label
		},
		notiTypeIcon(type) {
			return (NOTI_TYPE_MAP[type] || NOTI_TYPE_MAP[4]).icon
		},
		enrichPeerProfiles(sessions = []) {
			const ids = [
				...new Set(
					sessions
						.filter((s) => s && s.session_type === 'private' && s.peer_id)
						.map((s) => s.peer_id)
				),
			].filter((id) => id && !this.peerProfileMap[id])
			ids.forEach((id) => {
				getUserPublic(id)
					.then((res) => {
						const b = res && res.user_info && res.user_info.user_base
						this.peerProfileMap[id] = {
							nick_name: (b && b.nick_name) || '',
							avatar: (b && b.avatar) || '',
						}
					})
					.catch(() => {
						this.peerProfileMap[id] = { nick_name: '', avatar: '' }
					})
			})
		},
		enrichActorProfiles(notifications = []) {
			const ids = [
				...new Set(
					notifications
						.filter((n) => n && n.actor_id && String(n.actor_id).trim())
						.map((n) => n.actor_id)
				),
			].filter((id) => id && !this.actorProfileMap[id])
			ids.forEach((id) => {
				getUserPublic(id)
					.then((res) => {
						const b = res && res.user_info && res.user_info.user_base
						this.actorProfileMap[id] = {
							nick_name: (b && b.nick_name) || '',
							avatar: (b && b.avatar) || '',
						}
					})
					.catch(() => {
						this.actorProfileMap[id] = { nick_name: '', avatar: '' }
					})
			})
		},
		sessionPeerAvatar(session) {
			if (!session || !session.peer_id) return ''
			if (session.peer_avatar) return session.peer_avatar
			const m = this.peerProfileMap[session.peer_id]
			return m && m.avatar ? m.avatar : ''
		},
		sessionPeerName(session) {
			if (!session || !session.peer_id) return '旅行者'
			if (session.peer_name) return session.peer_name
			const m = this.peerProfileMap[session.peer_id]
			return (m && m.nick_name) || '旅行者'
		},
		sessionPeerInitial(session) {
			const name = this.sessionPeerName(session)
			return (name && String(name).trim().slice(0, 1)) || '?'
		},
		notiActorAvatar(noti) {
			const id = noti && noti.actor_id
			if (!id) return ''
			const m = this.actorProfileMap[id]
			return m && m.avatar ? m.avatar : ''
		},
		notiActorName(noti) {
			const id = noti && noti.actor_id
			if (!id) return this.notiTypeLabel(this.notifyType(noti))
			const m = this.actorProfileMap[id]
			return (m && m.nick_name) || '旅行者'
		},
		notiActorInitial(noti) {
			const n = this.notiActorName(noti)
			return (n && String(n).trim().slice(0, 1)) || '?'
		},
		getAvatarColor(id = '') {
			let hash = 0
			for (let i = 0; i < id.length; i++) {
				hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
			}
			return AVATAR_COLORS[hash % AVATAR_COLORS.length]
		},
		formatTime(timestamp) {
			if (!timestamp) return ''
			const date = new Date(timestamp * 1000)
			if (Number.isNaN(date.getTime())) return ''
			const now = new Date()
			const diff = Math.floor((now - date) / 1000)
			if (diff < 60) return '刚刚'
			if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
			if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
			if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`
			return `${date.getMonth() + 1}/${date.getDate()}`
		},
		goSearch() {
			uni.showToast({ title: '搜索功能开发中', icon: 'none' })
		},
	},
}
</script>

<style scoped>
.msg-page {
	background: var(--bg);
	min-height: 100vh;
	padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

/* ── Header ── */
.msg-header {
	padding: 24rpx 32rpx 16rpx;
	background: var(--bg);
}

.msg-header-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.msg-page-title {
	font-size: 48rpx;
	font-weight: 900;
	color: var(--text);
	letter-spacing: -1rpx;
}

.header-icons {
	display: flex;
	gap: 12rpx;
}

.icon-btn {
	width: 72rpx;
	height: 72rpx;
	border-radius: 999rpx;
	background: var(--surface);
	border: 1.5rpx solid var(--border);
	display: flex;
	align-items: center;
	justify-content: center;
}

.icon-sym {
	font-size: 30rpx;
}

/* ── Tab ── */
.tab-bar {
	display: flex;
	padding: 0 32rpx 16rpx;
	gap: 0;
	border-bottom: 1.5rpx solid var(--border);
}

.tab-item {
	position: relative;
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 72rpx;
	border-radius: 16rpx 16rpx 0 0;
}

.tab-label {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--text-2);
}

.tab-item.active .tab-label {
	color: var(--accent);
	font-weight: 700;
}

.tab-item.active::after {
	content: '';
	position: absolute;
	bottom: -1.5rpx;
	left: 20%;
	right: 20%;
	height: 4rpx;
	background: var(--accent);
	border-radius: 999rpx;
}

.tab-badge {
	position: absolute;
	top: 10rpx;
	right: 12rpx;
	min-width: 32rpx;
	height: 32rpx;
	border-radius: 999rpx;
	background: #FF3B30;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 8rpx;
}

.tab-badge-txt {
	font-size: 18rpx;
	color: #fff;
	font-weight: 700;
}

/* ── Message List ── */
.list {
	display: flex;
	flex-direction: column;
}

.msg-row {
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 24rpx 32rpx;
	border-bottom: 1rpx solid var(--border);
	background: var(--bg);
}

.msg-row.unread {
	background: var(--surface);
}

/* avatar */
.avatar-wrap {
	position: relative;
	flex-shrink: 0;
}

.avatar-img {
	width: 96rpx;
	height: 96rpx;
	border-radius: 999rpx;
	display: block;
}

.avatar-ph {
	width: 96rpx;
	height: 96rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.avatar-ph-txt {
	font-size: 36rpx;
	color: #fff;
	font-weight: 700;
	line-height: 1;
}

.unread-dot {
	position: absolute;
	top: 0;
	right: 0;
	width: 18rpx;
	height: 18rpx;
	border-radius: 999rpx;
	background: #FF3B30;
	border: 3rpx solid var(--bg);
}

.unread-badge {
	position: absolute;
	top: -6rpx;
	right: -6rpx;
	min-width: 32rpx;
	height: 32rpx;
	border-radius: 999rpx;
	background: #FF3B30;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 6rpx;
	border: 3rpx solid var(--bg);
}

.unread-badge-txt {
	font-size: 18rpx;
	color: #fff;
	font-weight: 700;
}

/* body */
.msg-body {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.msg-name-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.msg-name {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--text);
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.msg-time {
	font-size: 22rpx;
	color: var(--text-2);
	flex-shrink: 0;
}

.msg-preview-row {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.noti-type-tag {
	font-size: 22rpx;
	color: var(--accent);
	font-weight: 600;
	flex-shrink: 0;
}

.msg-preview {
	font-size: 26rpx;
	color: var(--text-2);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 1;
}

/* skeleton */
.sk-row {
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 24rpx 32rpx;
	border-bottom: 1rpx solid var(--border);
}

.sk-avatar {
	width: 96rpx;
	height: 96rpx;
	border-radius: 999rpx;
	flex-shrink: 0;
}

.sk-body {
	flex: 1;
}

/* load more */
.load-row {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 28rpx 0;
}

.load-txt {
	font-size: 24rpx;
	color: var(--text-2);
}

/* empty */
.empty-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 120rpx 40rpx 60rpx;
	text-align: center;
}

.empty-icon {
	font-size: 80rpx;
	line-height: 1;
}

.empty-title {
	display: block;
	margin-top: 28rpx;
	font-size: 36rpx;
	font-weight: 700;
	color: var(--text);
}

.empty-desc {
	display: block;
	margin-top: 14rpx;
	font-size: 26rpx;
	color: var(--text-2);
	line-height: 1.6;
}

</style>
