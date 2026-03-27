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
	if (refreshPromise) return refreshPromise

	const auth = getAuthState()
	const rt = auth && (auth.refresh_token || auth.refreshToken)
	if (!rt) {
		clearAuthState()
		throw new Error('登录已失效，请重新登录')
	}

	refreshPromise = (async () => {
		const res = await uniRequest({
			url: `${USER_API_BASE_URL}/api/user/refresh`,
			method: 'POST',
			data: { refresh_token: rt },
			header: { 'Content-Type': 'application/json' },
		})
		const payload = res.data
		if (res.statusCode !== 200 || !payload || payload.code !== 0 || !payload.data) {
			clearAuthState()
			throw new Error((payload && payload.message) || '登录已过期，请重新登录')
		}
		const merged = mergeAuthAfterRefresh(auth, payload.data)
		setAuthState(merged)
		return merged.token
	})()
		.catch((e) => {
			throw e
		})
		.finally(() => {
			refreshPromise = null
		})

	return refreshPromise
}

function isAuthExpiredPayload(payload) {
	if (!payload) return false
	if (payload.code === 401) return true
	const msg = String(payload.message || '')
	return /token/i.test(msg) && /过期|失效|invalid|expired/i.test(msg)
}

/**
 * @param {string} url
 * @param {object} data
 * @param {object} options
 * @param {string} [options.baseURL]
 * @param {string} [options.token] 传入则带 Authorization；空字符串表示不带 token
 * @param {boolean} [options.skipTokenRetry] 为 true 时不做刷新重试（一般无需使用）
 */
export async function request(url, data = {}, options = {}) {
	const baseURL = options.baseURL || DEFAULT_API_BASE_URL
	const skipTokenRetry = !!options.skipTokenRetry
	const token = options.token
	const sentBearer = typeof token === 'string' && token.length > 0

	const runOnce = async (bearer) => {
		const header = { 'Content-Type': 'application/json' }
		if (bearer) header.Authorization = `Bearer ${bearer}`
		const res = await uniRequest({
			url: `${baseURL}${url}`,
			method: 'POST',
			data,
			header,
		})
		return res
	}

	let res = await runOnce(sentBearer ? token : '')
	let payload = res.data

	if (res.statusCode !== 200 || !payload) {
		throw new Error(`请求失败: ${res.statusCode}`)
	}

	if (isAuthExpiredPayload(payload) && sentBearer && !skipTokenRetry) {
		const newToken = await refreshAccessToken()
		res = await runOnce(newToken)
		payload = res.data
	}

	if (res.statusCode !== 200 || !payload) {
		throw new Error(`请求失败: ${res.statusCode}`)
	}
	if (payload.code !== 0) {
		throw new Error(payload.message || '请求失败')
	}
	return payload.data
}
