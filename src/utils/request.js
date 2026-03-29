import { clearAuthState, getAuthState, setAuthState } from './auth'

const isDev = process.env.NODE_ENV === 'development'
const DEFAULT_API_BASE_URL = isDev ? 'http://127.0.0.1:9011' : 'https://www.xalearn.com'
/** 与 user.js 一致，仅用于 refresh（避免 request ↔ user 循环依赖） */
const USER_API_BASE_URL = isDev ? 'http://127.0.0.1:9003' : 'https://www.xalearn.com'

function uniRequest(options) {
	return new Promise((resolve, reject) => {
		uni.request({
			...options,
			success: resolve,
			fail: reject,
		})
	})
}

/** 并发 401 时只刷新一次 */
let refreshPromise = null

function normalizePayload(raw) {
	if (raw == null) return null
	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw)
		} catch {
			return null
		}
	}
	if (typeof raw === 'object') return raw
	return null
}

function mergeAuthAfterRefresh(prev, data) {
	if (!data || !data.token) return prev
	const uid =
		data.user_id != null && data.user_id !== ''
			? String(data.user_id)
			: prev.user_id || (prev.userId != null ? String(prev.userId) : '')
	return {
		...prev,
		token: data.token,
		refresh_token: data.refresh_token || data.refreshToken || prev.refresh_token || prev.refreshToken,
		user_id: uid,
	}
}

async function refreshAccessToken() {
	if (refreshPromise) {
		return refreshPromise
	}

	const auth = getAuthState()
	const rt = auth && (auth.refresh_token || auth.refreshToken)
	if (!rt) {
		clearAuthState()
		throw new Error('登录已失效，请重新登录')
	}

	const p = (async () => {
		const res = await uniRequest({
			url: `${USER_API_BASE_URL}/api/user/refresh`,
			method: 'POST',
			data: { refresh_token: rt },
			header: { 'Content-Type': 'application/json' },
		})
		const payload = normalizePayload(res.data)
		if (res.statusCode !== 200 || !payload || Number(payload.code) !== 0 || payload.data == null) {
			clearAuthState()
			throw new Error((payload && (payload.message || payload.msg)) || '登录已过期，请重新登录')
		}
		const merged = mergeAuthAfterRefresh(auth, payload.data)
		setAuthState(merged)
		return merged.token
	})()

	refreshPromise = p.finally(() => {
		refreshPromise = null
	})

	return refreshPromise
}

/** 业务层 token 失效（go-zero 多为 HTTP 200 + code 401） */
function isTokenBusinessError(payload) {
	if (!payload || typeof payload !== 'object') return false
	if (Number(payload.code) === 401) return true
	const msg = String(payload.message || payload.msg || '')
	return /Token已过期|token已过期|未登录|请登录|登录失效|JWT|jwt|鉴权|授权失败|无效.*token|token.*无效/i.test(
		msg
	)
}

/**
 * @param {string} url
 * @param {object} data
 * @param {object} options
 * @param {string} [options.baseURL]
 * @param {string} [options.token] 传入则带 Authorization；空字符串表示不带 token
 * @param {boolean} [options.skipTokenRetry] 为 true 时不做刷新重试
 */
export async function request(url, data = {}, options = {}) {
	const baseURL = options.baseURL || DEFAULT_API_BASE_URL
	const skipTokenRetry = !!options.skipTokenRetry
	const token = options.token
	const sentBearer = typeof token === 'string' && token.length > 0

	let bearer = sentBearer ? token : ''
	let refreshedOnce = false

	const runOnce = async (authHeader) => {
		const header = { 'Content-Type': 'application/json' }
		if (authHeader) header.Authorization = `Bearer ${authHeader}`
		return uniRequest({
			url: `${baseURL}${url}`,
			method: 'POST',
			data,
			header,
		})
	}

	for (;;) {
		const res = await runOnce(bearer)
		const payload = normalizePayload(res.data)

		const httpUnauthorized = res.statusCode === 401
		const needRefresh =
			sentBearer &&
			!skipTokenRetry &&
			!refreshedOnce &&
			(httpUnauthorized || isTokenBusinessError(payload))

		if (needRefresh) {
			refreshedOnce = true
			bearer = await refreshAccessToken()
			continue
		}

		if (res.statusCode !== 200 || payload == null) {
			throw new Error(`请求失败: ${res.statusCode}`)
		}

		if (Number(payload.code) !== 0) {
			throw new Error(payload.message || payload.msg || '请求失败')
		}

		return payload.data
	}
}
