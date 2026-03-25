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
