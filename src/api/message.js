import { request } from '../utils/request'
import { getAuthState } from '../utils/auth'

const MESSAGE_API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://127.0.0.1:9007'
  : 'https://www.xalearn.com'

function requestMessage(url, data = {}) {
  const auth = getAuthState()
  return request(url, data, {
    baseURL: MESSAGE_API_BASE_URL,
    token: auth && auth.token ? auth.token : '',
  })
}

// ── Session ID 工具（与后端 client/session.go 对应） ─────────────────────────

/** 生成私聊 session_id，两个 userId 排序后拼接保证唯一 */
export function getPrivateSessionId(uid1, uid2) {
  return 'private-' + [uid1, uid2].sort().join('-')
}

/** AI 对话 session_id */
export function getAiSessionId(userId) {
  return 'ai-' + userId
}

/** 系统消息 session_id */
export function getSysSessionId(userId) {
  return 'sys-' + userId
}

/** 群聊 session_id */
export function getGroupSessionId(groupId) {
  return 'group-' + groupId
}

/** 从 session_id 解析类型 */
export function parseSessionType(sessionId) {
  return sessionId ? sessionId.split('-')[0] : ''
}

// ── API 请求 ─────────────────────────────────────────────────────────────────

/**
 * 发送消息到指定会话
 * @param {object} payload - { session_id, content: { content_type, text, addition }, reply_id? }
 */
export function sendMessage(payload = {}) {
  return requestMessage('/api/message/send', payload)
}

/**
 * 获取会话消息列表（游标分页）
 * @param {object} payload - { session_id, last_message_id?, limit? }
 */
export function getMessageList(payload = {}) {
  return requestMessage('/api/message/list', payload)
}

/**
 * 撤回消息
 * @param {object} payload - { session_id, message_id }
 */
export function withdrawMessage(payload = {}) {
  return requestMessage('/api/message/withdraw', payload)
}

/**
 * 获取收件箱会话列表（游标分页）
 * @param {object} payload - { last_time?, limit? }
 */
export function getInboxList(payload = {}) {
  return requestMessage('/api/message/inbox/list', payload)
}

/**
 * 标记会话已读
 * @param {object} payload - { session_id }
 */
export function markSessionRead(payload = {}) {
  return requestMessage('/api/message/inbox/read', payload)
}

/**
 * 获取消息+通知未读总数
 * @returns {{ message: number, notification: number }}
 */
export function getUnreadCount() {
  return requestMessage('/api/message/inbox/unread', {})
}

/**
 * 获取互动通知列表（游标分页）
 * @param {object} payload - { last_id?, limit?, notify_type? }
 */
export function getNotificationList(payload = {}) {
  return requestMessage('/api/message/notification/list', payload)
}

/**
 * 标记通知已读
 * @param {object} payload - { notify_ids: [] }  空数组=全部已读
 */
export function markNotificationRead(payload = {}) {
  return requestMessage('/api/message/notification/read', payload)
}
