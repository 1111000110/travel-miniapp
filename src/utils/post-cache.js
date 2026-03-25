const postDetailCache = Object.create(null)
const postDetailPendingCache = Object.create(null)
const postSummaryCache = Object.create(null)

export function setPostDetailCache(postId, detail) {
	if (!postId || !detail) {
		return
	}
	postDetailCache[postId] = detail
}

export function getPostDetailCache(postId) {
	if (!postId) {
		return null
	}
	return postDetailCache[postId] || null
}

export function setPostDetailListCache(details = []) {
	details.forEach((item) => {
		if (item && item.post_base && item.post_base.post_id) {
			postDetailCache[item.post_base.post_id] = item
		}
	})
}

export function setPostSummaryCache(postId, summary) {
	if (!postId || !summary) {
		return
	}
	postSummaryCache[postId] = summary
}

export function getPostSummaryCache(postId) {
	if (!postId) {
		return null
	}
	return postSummaryCache[postId] || null
}

export function setPendingPostDetail(postId, promise) {
	if (!postId || !promise) {
		return promise
	}
	postDetailPendingCache[postId] = promise
	return promise.finally(() => {
		if (postDetailPendingCache[postId] === promise) {
			delete postDetailPendingCache[postId]
		}
	})
}

export function setPendingPostDetailList(postIds = [], promise) {
	if (!promise || !postIds.length) {
		return promise
	}
	postIds.forEach((postId) => {
		if (!postId) {
			return
		}
		const detailPromise = promise.then((details) => {
			const list = Array.isArray(details) ? details : []
			return list.find((item) => item && item.post_base && item.post_base.post_id === postId) || null
		})
		postDetailPendingCache[postId] = detailPromise
		detailPromise.finally(() => {
			if (postDetailPendingCache[postId] === detailPromise) {
				delete postDetailPendingCache[postId]
			}
		})
	})
	return promise
}

export function getPendingPostDetail(postId) {
	if (!postId) {
		return null
	}
	return postDetailPendingCache[postId] || null
}
