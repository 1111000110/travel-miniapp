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

/** 获取 OSS STS（H5 等直传 OSS 场景） */
export function getUserOssSts(payload = {}) {
	return requestUser('/api/user/oss/sts', {
		expire_seconds: payload.expire_seconds || 0,
	})
}

/**
 * 头像上传：本地临时文件读 Base64 后走 JSON 接口（与 request 合法域名一致，无需配置 OSS uploadFile 域名）。
 * @param {string} filePath 本地临时路径
 */
export function uploadAvatarFile(filePath) {
	return new Promise((resolve, reject) => {
		const fs = uni.getFileSystemManager()
		fs.readFile({
			filePath,
			encoding: 'base64',
			success: async (readRes) => {
				let b64 = ''
				if (typeof readRes.data === 'string') {
					b64 = readRes.data
				} else if (readRes.data) {
					try {
						b64 = uni.arrayBufferToBase64(readRes.data)
					} catch {
						b64 = ''
					}
				}
				if (!b64) {
					reject(new Error('读取图片失败'))
					return
				}
				const name =
					filePath && String(filePath).split(/[/\\]/).filter(Boolean).pop()
						? String(filePath).split(/[/\\]/).filter(Boolean).pop()
						: 'avatar.jpg'
				try {
					const data = await requestUser('/api/user/avatar/upload', {
						image_base64: b64,
						file_name: name,
					})
					const url =
						data && data.avatar_url != null ? String(data.avatar_url) : ''
					if (!url) {
						reject(new Error('未返回头像地址'))
						return
					}
					resolve(url)
				} catch (e) {
					reject(e)
				}
			},
			fail: (err) => {
				reject(err && err.errMsg ? new Error(err.errMsg) : new Error('读取图片失败'))
			},
		})
	})
}

export function persistAuth(auth) {
	setAuthState(auth)
}

export function removeAuth() {
	clearAuthState()
}
