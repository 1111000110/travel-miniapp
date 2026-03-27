import { request } from '../utils/request'

// params: { city_name?, latitude?, longitude? }  经纬度优先，服务端内部完成逆地理解析
export function getTravelHome(params = {}) {
	return request('/api/travel/home', params)
}

export function getDestinationDetail(destinationId) {
	return request('/api/travel/destination/detail', {
		destination_id: destinationId,
	})
}

export function generateGuide(payload) {
	return request('/api/travel/guide/generate', payload)
}

export function getNavigationNotice(destination) {
	return request('/api/travel/navigation/notice', { destination })
}

export function publishGuide(payload) {
	return request('/api/travel/post/publish', payload)
}
