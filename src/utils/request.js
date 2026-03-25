const isDev = process.env.NODE_ENV === 'development'
const DEFAULT_API_BASE_URL = isDev ? 'http://127.0.0.1:9011' : 'https://www.xalearn.com'

export function request(url, data = {}, options = {}) {
	const baseURL = options.baseURL || DEFAULT_API_BASE_URL
	const token = options.token
	const header = {
		'Content-Type': 'application/json',
	}
	if (token) {
		header.Authorization = `Bearer ${token}`
	}
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${baseURL}${url}`,
			method: 'POST',
			data,
			header,
			success: (res) => {
				const payload = res.data
				if (res.statusCode !== 200 || !payload) {
					reject(new Error(`请求失败: ${res.statusCode}`))
					return
				}
				if (payload.code !== 0) {
					reject(new Error(payload.message || '请求失败'))
					return
				}
				resolve(payload.data)
			},
			fail: (error) => {
				reject(error)
			},
		})
	})
}
