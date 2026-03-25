import { request } from '../utils/request'
import { getAuthState } from '../utils/auth'

const POST_API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://127.0.0.1:9005'
  : 'https://www.xalearn.com'

function requestPost(url, data = {}, needAuth = false) {
	const auth = needAuth ? getAuthState() : null
	return request(url, data, {
		baseURL: POST_API_BASE_URL,
		token: auth && auth.token ? auth.token : '',
	})
}

export function getPostList(payload = {}) {
	return requestPost('/api/post/list', payload)
}

export function getPostDetail(payload = {}) {
	return requestPost('/api/post/detail', payload)
}

export function getPostDetailList(payload = {}) {
	return requestPost('/api/post/detail/list', payload)
}

export function createPost(payload = {}) {
	return requestPost('/api/post/create', payload, true)
}

export function getPostTagAll() {
	return requestPost('/api/post/tag/all', {})
}

export function getTagRecommend(title) {
	return requestPost('/api/post/tag/recommend', { title })
}

export function getReviewList(payload = {}) {
	return requestPost('/api/review/list', payload)
}

export function createReview(payload = {}) {
	return requestPost('/api/review/create', payload, true)
}
