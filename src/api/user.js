import { request } from '../utils/request'
import { clearAuthState, getAuthState, setAuthState } from '../utils/auth'

const USER_API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://127.0.0.1:9003'
  : 'https://www.xalearn.com'

function requestUser(url, data = {}, options = {}) {
	const auth = getAuthState()
	return request(url, data, {
		baseURL: USER_API_BASE_URL,
		token: options.needAuth === false ? '' : auth && auth.token ? auth.token : '',
	})
}

export function loginUser(payload) {
	return requestUser(
		'/api/user/login',
		{
			user_id: '',
			...payload,
		},
		{ needAuth: false }
	)
}

export function registerUser(payload) {
	return requestUser('/api/user/register', payload, { needAuth: false })
}

export function refreshUserToken(refreshToken) {
	return requestUser('/api/user/refresh', { refresh_token: refreshToken }, { needAuth: false })
}

export function getCurrentUser(type = 'private') {
	return requestUser('/api/user/query', {
		query_user_id: '',
		type: type || 'get_private_info',
	})
}

/** 查看他人公开资料（需登录）；type 与后端约定为非 get_private_info 时不返回手机等敏感字段 */
export function getUserPublic(queryUserId) {
	return requestUser('/api/user/query', {
		query_user_id: queryUserId || '',
		type: 'basic',
	})
}

export function miniPhoneLogin(payload) {
	return requestUser('/api/user/mini/phone/login', payload, { needAuth: false })
}

export function updateCurrentUser(userInfo, updateField) {
	return requestUser('/api/user/update', {
		user_info: userInfo,
		update_field: updateField,
	})
}

export function persistAuth(auth) {
	setAuthState(auth)
}

export function removeAuth() {
	clearAuthState()
}
