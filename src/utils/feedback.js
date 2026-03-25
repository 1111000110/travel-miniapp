export async function withLoading(title, task) {
	uni.showLoading({
		title,
		mask: true,
	})
	try {
		return await task()
	} finally {
		uni.hideLoading()
	}
}

export function showError(error) {
	const title = error && error.message ? error.message : '请求失败'
	uni.showToast({
		title,
		icon: 'none',
		duration: 2400,
	})
}
