<template>
	<view class="publish-shell">

		<!-- 未登录 -->
		<view v-if="!auth" class="login-gate">
			<view class="login-gate-inner">
				<text class="login-icon">✍️</text>
				<text class="login-title">登录后才能发布</text>
				<text class="login-desc">登录账号，把你的旅行故事分享给更多人。</text>
				<view class="btn-primary mt-32" @tap="goLogin">去登录</view>
			</view>
		</view>

		<view v-else class="publish-body">

			<!-- 标题 -->
			<view class="card title-card">
				<input
					v-model="form.title"
					class="title-input"
					placeholder="给这篇帖子起个标题..."
					maxlength="50"
					@input="onTitleInput"
				/>
				<view class="title-bar">
					<text class="char-hint">{{ form.title.length }}/50</text>
				</view>
			</view>

			<!-- 正文 -->
			<view class="card content-card">
				<textarea
					v-model="form.content"
					class="content-input"
					placeholder="分享你的旅行见闻、路线攻略或者一个有趣的瞬间..."
					maxlength="2000"
					auto-height
				/>
				<text class="char-hint content-count">{{ form.content.length }}/2000</text>
			</view>

			<!-- 图片 -->
			<view class="card image-card">
				<view class="card-head">
					<text class="card-label">图片</text>
					<text class="card-meta">{{ form.images.length }}/9</text>
				</view>
				<view class="image-grid">
					<view
						v-for="(img, idx) in form.images"
						:key="idx"
						class="img-slot filled"
					>
						<image :src="img" mode="aspectFill" class="img-thumb" />
						<view class="img-remove" @tap.stop="removeImage(idx)">
							<text class="img-remove-icon">×</text>
						</view>
					</view>
					<view v-if="form.images.length < 9" class="img-slot add-slot" @tap="pickImages">
						<text class="add-icon">+</text>
					</view>
				</view>
			</view>

			<!-- 标签 -->
			<view class="card tag-card">
				<view class="card-head">
					<text class="card-label">标签</text>
					<text class="card-meta">{{ form.tags.length > 0 ? `已选 ${form.tags.length}` : '帮助更多人发现你的内容' }}</text>
				</view>

				<!-- 已选标签 -->
				<view v-if="form.tags.length" class="selected-tags">
					<view
						v-for="tag in form.tags"
						:key="tag"
						class="tag selected-tag"
						@tap="removeTag(tag)"
					>
						<text class="tag-text">{{ tag }}</text>
						<text class="tag-remove">×</text>
					</view>
				</view>

				<!-- 推荐标签（基于标题，来自后端编辑距离算法） -->
				<view v-if="recommendedTags.length || recommendLoading" class="tag-group">
					<view class="tag-group-head">
						<text class="tag-group-label recommend-label">✦ 推荐</text>
						<text v-if="recommendLoading" class="tag-group-label" style="font-weight:400">计算中...</text>
					</view>
					<view class="tag-row">
						<view
							v-for="tag in recommendedTags"
							:key="tag.tag_name"
							class="tag recommend-tag"
							:class="{ selected: form.tags.includes(tag.tag_name) }"
							@tap="toggleTag(tag.tag_name)"
						>
							<text class="tag-text">{{ tag.tag_name }}</text>
						</view>
					</view>
				</view>

				<!-- 全部标签 -->
				<view v-if="otherTags.length" class="tag-group">
					<view class="tag-group-head">
						<text class="tag-group-label">{{ recommendedTags.length ? '更多标签' : '选择标签' }}</text>
						<text
							v-if="!showAllTags && otherTags.length > 6"
							class="tag-expand"
							@tap="showAllTags = true"
						>展开全部 ›</text>
					</view>
					<view class="tag-row">
						<view
							v-for="tag in displayedOtherTags"
							:key="tag.tag_name"
							class="tag normal-tag"
							:class="{ selected: form.tags.includes(tag.tag_name) }"
							@tap="toggleTag(tag.tag_name)"
						>
							<text class="tag-text">{{ tag.tag_name }}</text>
						</view>
					</view>
				</view>

				<!-- 创建自定义标签 -->
				<view class="custom-tag-row">
					<view class="custom-input-wrap" :class="{ focused: customTagFocused }">
						<text class="custom-input-prefix">#</text>
						<input
							v-model="customTagInput"
							class="custom-input"
							placeholder="创建新标签"
							maxlength="12"
							@focus="customTagFocused = true"
							@blur="customTagFocused = false"
							@confirm="addCustomTag"
						/>
					</view>
					<view
						class="custom-add-btn"
						:class="{ active: canAddCustomTag }"
						@tap="addCustomTag"
					>
						<text>添加</text>
					</view>
				</view>

				<!-- 匹配提示 -->
				<view v-if="customTagInput && matchedExistingTag" class="match-hint" @tap="toggleTag(matchedExistingTag.tag_name)">
					<text class="match-hint-text">已有标签「{{ matchedExistingTag.tag_name }}」，点击添加</text>
				</view>
			</view>

			<!-- 发布设置 -->
			<view class="card setting-card">
				<view class="setting-row" @tap="form.status = form.status === 1 ? 0 : 1">
					<view class="setting-info">
						<text class="setting-label">{{ form.status === 1 ? '公开发布' : '存为草稿' }}</text>
						<text class="setting-desc">{{ form.status === 1 ? '所有人可见，发布后立即展示' : '仅自己可见，随时可切换为公开' }}</text>
					</view>
					<view class="toggle-wrap" :class="{ on: form.status === 1 }">
						<view class="toggle-knob" />
					</view>
				</view>
			</view>

			<!-- 发布按钮 -->
			<view class="submit-area">
				<view
					class="btn-submit"
					:class="{ disabled: !canSubmit }"
					@tap="submitPost"
				>
					<text class="btn-submit-text">{{ submitting ? '发布中...' : (form.status === 1 ? '立即发布' : '保存草稿') }}</text>
				</view>
			</view>

		</view>
	</view>
</template>

<script>
import { createPost, getPostTagAll, getTagRecommend } from '../../api/post'
import { getAuthState } from '../../utils/auth'
import { showError, withLoading } from '../../utils/feedback'

export default {
	data() {
		return {
			auth: null,
			form: {
				title: '',
				content: '',
				images: [],
				tags: [],
				status: 1,
			},
			availableTags: [],
			recommendedTags: [],
			tagLoading: false,
			recommendLoading: false,
			submitting: false,
			showAllTags: false,
			customTagInput: '',
			customTagFocused: false,
			titleDebounceTimer: null,
		}
	},
	computed: {
		// 其余标签：排除已选和推荐
		otherTags() {
			const recommendedSet = new Set(this.recommendedTags.map((t) => t.tag_name))
			return this.availableTags.filter(
				(t) => !this.form.tags.includes(t.tag_name) && !recommendedSet.has(t.tag_name)
			)
		},
		displayedOtherTags() {
			return this.showAllTags ? this.otherTags : this.otherTags.slice(0, 6)
		},
		// 自定义输入匹配已有标签
		matchedExistingTag() {
			const input = this.customTagInput.trim().toLowerCase()
			if (!input) return null
			return (
				this.availableTags.find(
					(t) =>
						t.tag_name.toLowerCase().includes(input) &&
						!this.form.tags.includes(t.tag_name)
				) || null
			)
		},
		canAddCustomTag() {
			const v = this.customTagInput.trim()
			return v.length >= 1 && !this.form.tags.includes(v)
		},
		canSubmit() {
			return !this.submitting && this.form.title.trim().length > 0 && this.form.content.trim().length > 0
		},
	},
	onShow() {
		this.auth = getAuthState()
		if (this.auth && !this.availableTags.length) {
			this.loadTags()
		}
	},
	methods: {
		goLogin() {
			uni.switchTab({ url: '/pages/profile/index' })
		},
		async loadTags() {
			this.tagLoading = true
			try {
				const result = await getPostTagAll()
				this.availableTags = result.tags || []
			} catch (error) {
				console.warn('loadTags failed', error)
			} finally {
				this.tagLoading = false
			}
		},
		onTitleInput() {
			clearTimeout(this.titleDebounceTimer)
			const title = this.form.title.trim()
			if (!title) {
				this.recommendedTags = []
				return
			}
			this.titleDebounceTimer = setTimeout(() => this.fetchRecommend(title), 400)
		},
		async fetchRecommend(title) {
			this.recommendLoading = true
			try {
				const result = await getTagRecommend(title)
				// 过滤掉已选的
				this.recommendedTags = (result.tags || []).filter(
					(t) => !this.form.tags.includes(t.tag_name)
				)
			} catch (error) {
				console.warn('fetchRecommend failed', error)
				this.recommendedTags = []
			} finally {
				this.recommendLoading = false
			}
		},
		toggleTag(tagName) {
			const idx = this.form.tags.indexOf(tagName)
			if (idx >= 0) {
				this.form.tags.splice(idx, 1)
			} else {
				this.form.tags.push(tagName)
			}
		},
		removeTag(tagName) {
			const idx = this.form.tags.indexOf(tagName)
			if (idx >= 0) this.form.tags.splice(idx, 1)
		},
		addCustomTag() {
			const v = this.customTagInput.trim()
			if (!v || this.form.tags.includes(v)) return
			this.form.tags.push(v)
			this.customTagInput = ''
		},
		pickImages() {
			const remaining = 9 - this.form.images.length
			uni.chooseImage({
				count: remaining,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					this.form.images = [...this.form.images, ...res.tempFilePaths].slice(0, 9)
				},
			})
		},
		removeImage(idx) {
			this.form.images.splice(idx, 1)
		},
		async submitPost() {
			if (!this.canSubmit) return
			const title = this.form.title.trim()
			const content = this.form.content.trim()
			if (!title) {
				uni.showToast({ title: '请填写标题', icon: 'none' })
				return
			}
			if (!content) {
				uni.showToast({ title: '请填写内容', icon: 'none' })
				return
			}
			this.submitting = true
			const publishedPublic = this.form.status === 1
			try {
				await withLoading('发布中', () =>
					createPost({
						title,
						content,
						images: this.form.images,
						tags: this.form.tags,
						status: this.form.status,
					})
				)
				uni.showToast({ title: publishedPublic ? '发布成功' : '已保存草稿', icon: 'success' })
				this.resetForm()
				if (publishedPublic) {
					setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 600)
				}
			} catch (error) {
				showError(error)
			} finally {
				this.submitting = false
			}
		},
		resetForm() {
			this.form = { title: '', content: '', images: [], tags: [], status: 1 }
			this.customTagInput = ''
			this.showAllTags = false
		},
	},
}
</script>

<style scoped>
/* ── shell ── */
.publish-shell {
	min-height: 100vh;
	background: var(--bg);
}

/* ── 未登录 ── */
.login-gate {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	padding: 48rpx;
}

.login-gate-inner {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

.login-icon {
	font-size: 80rpx;
	line-height: 1;
}

.login-title {
	display: block;
	margin-top: 24rpx;
	font-size: 40rpx;
	font-weight: 700;
}

.login-desc {
	display: block;
	margin-top: 14rpx;
	font-size: 26rpx;
	color: var(--muted);
	line-height: 1.6;
}

/* ── 发布主体 ── */
.publish-body {
	padding: 20rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

/* ── 通用卡片 ── */
.card {
	border-radius: 28rpx;
	background: rgba(251, 247, 241, 0.9);
	border: 1rpx solid rgba(31, 28, 24, 0.07);
	padding: 24rpx 28rpx;
}

.card-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 18rpx;
}

.card-label {
	font-size: 26rpx;
	font-weight: 700;
	color: var(--text);
}

.card-meta {
	font-size: 22rpx;
	color: var(--muted);
}

/* ── 标题卡 ── */
.title-input {
	width: 100%;
	font-size: 38rpx;
	font-weight: 700;
	line-height: 1.4;
	color: var(--text);
	background: transparent;
	border: none;
	outline: none;
}

.title-bar {
	display: flex;
	justify-content: flex-end;
	margin-top: 12rpx;
}

.char-hint {
	font-size: 22rpx;
	color: var(--muted);
}

/* ── 正文卡 ── */
.content-input {
	width: 100%;
	min-height: 220rpx;
	font-size: 28rpx;
	line-height: 1.75;
	color: var(--text);
	background: transparent;
	border: none;
	outline: none;
}

.content-count {
	display: block;
	text-align: right;
	margin-top: 10rpx;
}

/* ── 图片卡 ── */
.image-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 12rpx;
}

.img-slot {
	aspect-ratio: 1;
	border-radius: 16rpx;
	overflow: hidden;
	position: relative;
}

.img-slot.filled {
	background: var(--surface-strong);
}

.img-thumb {
	width: 100%;
	height: 100%;
	display: block;
}

.img-remove {
	position: absolute;
	top: 6rpx;
	right: 6rpx;
	width: 36rpx;
	height: 36rpx;
	border-radius: 999rpx;
	background: rgba(0, 0, 0, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
}

.img-remove-icon {
	color: #fff;
	font-size: 26rpx;
	line-height: 1;
	margin-top: -2rpx;
}

.add-slot {
	border: 2rpx dashed rgba(201, 109, 68, 0.35);
	background: rgba(201, 109, 68, 0.04);
	display: flex;
	align-items: center;
	justify-content: center;
}

.add-icon {
	font-size: 52rpx;
	color: var(--accent);
	line-height: 1;
}

/* ── 标签卡 ── */
.tag-card {
	padding-bottom: 20rpx;
}

.selected-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	padding-bottom: 18rpx;
	border-bottom: 1rpx solid rgba(31, 28, 24, 0.07);
	margin-bottom: 18rpx;
}

.tag-group {
	margin-top: 4rpx;
	margin-bottom: 18rpx;
}

.tag-group-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
}

.tag-group-label {
	font-size: 22rpx;
	font-weight: 600;
	color: var(--muted);
	letter-spacing: 1rpx;
}

.recommend-label {
	color: #c96d44;
}

.tag-expand {
	font-size: 22rpx;
	color: var(--accent);
}

.tag-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

/* ── 通用 tag ── */
.tag {
	display: inline-flex;
	align-items: center;
	gap: 6rpx;
	padding: 10rpx 20rpx;
	border-radius: 999rpx;
	border: 1rpx solid transparent;
	transition: all 0.15s;
}

.tag-text {
	font-size: 26rpx;
	line-height: 1;
}

.tag-remove {
	font-size: 24rpx;
	line-height: 1;
	margin-left: 2rpx;
	opacity: 0.7;
}

/* 已选 tag */
.selected-tag {
	background: var(--accent);
	border-color: var(--accent);
}

.selected-tag .tag-text,
.selected-tag .tag-remove {
	color: #fff;
}

/* 推荐 tag */
.recommend-tag {
	background: rgba(201, 109, 68, 0.1);
	border-color: rgba(201, 109, 68, 0.3);
}

.recommend-tag .tag-text {
	color: var(--accent-deep);
}

.recommend-tag.selected {
	background: var(--accent);
	border-color: var(--accent);
}

.recommend-tag.selected .tag-text {
	color: #fff;
}

/* 普通 tag */
.normal-tag {
	background: rgba(31, 28, 24, 0.05);
	border-color: rgba(31, 28, 24, 0.1);
}

.normal-tag .tag-text {
	color: var(--text);
}

.normal-tag.selected {
	background: var(--accent);
	border-color: var(--accent);
}

.normal-tag.selected .tag-text {
	color: #fff;
}

/* ── 创建自定义标签 ── */
.custom-tag-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 18rpx;
	padding-top: 18rpx;
	border-top: 1rpx solid rgba(31, 28, 24, 0.07);
}

.custom-input-wrap {
	flex: 1;
	display: flex;
	align-items: center;
	height: 72rpx;
	padding: 0 18rpx;
	border-radius: 999rpx;
	border: 1rpx solid rgba(31, 28, 24, 0.12);
	background: rgba(255, 255, 255, 0.6);
	transition: border-color 0.15s;
}

.custom-input-wrap.focused {
	border-color: var(--accent);
	background: #fff;
}

.custom-input-prefix {
	font-size: 26rpx;
	color: var(--muted);
	margin-right: 6rpx;
}

.custom-input {
	flex: 1;
	height: 100%;
	font-size: 26rpx;
	background: transparent;
	border: none;
	outline: none;
}

.custom-add-btn {
	height: 72rpx;
	padding: 0 28rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(31, 28, 24, 0.07);
	font-size: 26rpx;
	color: var(--muted);
	transition: all 0.15s;
}

.custom-add-btn.active {
	background: var(--accent);
	color: #fff;
}

/* ── 匹配提示 ── */
.match-hint {
	margin-top: 10rpx;
	padding: 12rpx 18rpx;
	border-radius: 16rpx;
	background: rgba(201, 109, 68, 0.08);
}

.match-hint-text {
	font-size: 24rpx;
	color: var(--accent-deep);
}

/* ── 发布设置卡 ── */
.setting-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 24rpx;
}

.setting-info {
	flex: 1;
	min-width: 0;
}

.setting-label {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
}

.setting-desc {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: var(--muted);
	line-height: 1.5;
}

.toggle-wrap {
	flex-shrink: 0;
	width: 96rpx;
	height: 52rpx;
	border-radius: 999rpx;
	background: rgba(31, 28, 24, 0.15);
	padding: 6rpx;
	display: flex;
	align-items: center;
	transition: background 0.2s;
}

.toggle-wrap.on {
	background: var(--accent);
	justify-content: flex-end;
}

.toggle-knob {
	width: 40rpx;
	height: 40rpx;
	border-radius: 999rpx;
	background: #fff;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.18);
}

/* ── 发布按钮 ── */
.submit-area {
	padding-top: 8rpx;
}

.btn-submit {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 96rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #d97a4f 0%, #8e4d2f 100%);
	box-shadow: 0 12rpx 32rpx rgba(201, 109, 68, 0.35);
}

.btn-submit.disabled {
	opacity: 0.45;
	box-shadow: none;
}

.btn-submit-text {
	font-size: 32rpx;
	font-weight: 700;
	color: #fff;
	letter-spacing: 2rpx;
}

/* ── 通用按钮 ── */
.btn-primary {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 88rpx;
	padding: 0 48rpx;
	border-radius: 999rpx;
	background: var(--accent);
	color: #fff;
	font-size: 30rpx;
	font-weight: 600;
}

.mt-32 {
	margin-top: 32rpx;
}
</style>
