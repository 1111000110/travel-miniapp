const AUTH_STORAGE_KEY = 'travel:user:auth'

export function getAuthState() {
	return uni.getStorageSync(AUTH_STORAGE_KEY) || null
}

export function setAuthState(auth) {
	uni.setStorageSync(AUTH_STORAGE_KEY, auth)
}

export function clearAuthState() {
	uni.removeStorageSync(AUTH_STORAGE_KEY)
}

/** 当前登录用户 ID（登录后由资料接口写入 auth.user_id） */
export function getCurrentUserId() {
	const auth = getAuthState()
	if (!auth) return ''
	const id = auth.user_id || auth.userId
	return id != null && id !== '' ? String(id) : ''
}
