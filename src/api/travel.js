import { request } from '../utils/request'

export function getLocationCity(latitude, longitude) {
	return request('/api/travel/location/city', { latitude, longitude })
}

export function getTravelHome(cityName = '大理') {
	return request('/api/travel/home', { city_name: cityName })
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
