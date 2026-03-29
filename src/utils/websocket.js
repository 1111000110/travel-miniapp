/**
 * WebSocket 单例管理器（UniApp 小程序版）
 *
 * 消息格式（服务端 WritePump 批量打包）：
 *   frame = JSON.stringify([jsonStr1, jsonStr2, ...])
 *   其中每个 jsonStr = JSON.stringify({ notify_type: string, notify_val: string })
 *
 * 使用方式：
 *   import { wsManager } from '@/utils/websocket'
 *   wsManager.connect(token)              // 登录后调用
 *   wsManager.on('new_message', handler)  // 订阅事件
 *   wsManager.off('new_message', handler) // 取消订阅
 *   wsManager.disconnect()               // 登出时调用
 */

const isDev = process.env.NODE_ENV === 'development'
const WS_BASE = isDev ? 'ws://127.0.0.1:9012' : 'wss://www.xalearn.com'

class WsManager {
	constructor() {
		this._socket = null        // uni.connectSocket 返回的 SocketTask
		this._listeners = {}       // eventName → [handler]
		this._reconnectTimer = null
		this._reconnectDelay = 1000
		this._maxReconnectDelay = 30000
		this._shouldReconnect = false
		this._token = ''
		this._opened = false       // 标记本次连接是否曾经 open 成功
	}

	/** 登录后调用，建立 WebSocket 连接并开启自动重连 */
	connect(token) {
		if (!token) return
		this._token = token
		this._shouldReconnect = true
		this._reconnectDelay = 1000
		this._doConnect()
	}

	_doConnect() {
		if (this._socket) {
			try { this._socket.close({}) } catch {}
			this._socket = null
		}
		this._opened = false
		// 小程序通过 Authorization Header 传递 token（小程序支持自定义 Header）
		const url = `${WS_BASE}/websocket/client?client_type=mini`
		this._socket = uni.connectSocket({
			url,
			header: { Authorization: `Bearer ${this._token}` },
			complete: () => {},
		})

		this._socket.onOpen(() => {
			this._opened = true
			this._reconnectDelay = 1000 // 连接成功后重置退避延迟
			this._emit('open')
		})

		this._socket.onMessage(({ data }) => {
			try {
				const msgs = JSON.parse(data)
				if (!Array.isArray(msgs)) return
				for (const raw of msgs) {
					try {
						const evt = JSON.parse(raw)
						if (evt && evt.notify_type) {
							this._emit(evt.notify_type, evt)
						}
					} catch {}
				}
			} catch {}
		})

		this._socket.onClose(() => {
			this._emit('close')
			// 从未 open 就断开，说明握手被拒（如 401 token 过期），停止重连并通知上层
			if (!this._opened) {
				this._shouldReconnect = false
				this._emit('auth_failed')
				return
			}
			this._scheduleReconnect()
		})

		this._socket.onError(() => {
			// onError 之后必定触发 onClose，不在此处重连，避免重复
			this._emit('error')
		})
	}

	_scheduleReconnect() {
		if (!this._shouldReconnect || !this._token) return
		clearTimeout(this._reconnectTimer)
		this._reconnectTimer = setTimeout(() => {
			this._reconnectDelay = Math.min(this._reconnectDelay * 2, this._maxReconnectDelay)
			this._doConnect()
		}, this._reconnectDelay)
	}

	/** 登出时调用，断开连接并停止自动重连 */
	disconnect() {
		this._shouldReconnect = false
		this._token = ''
		clearTimeout(this._reconnectTimer)
		this._reconnectTimer = null
		if (this._socket) {
			try { this._socket.close({}) } catch {}
			this._socket = null
		}
		this._emit('disconnect')
	}

	/** 订阅事件，同一 handler 注册多次时不去重（调用方负责管理） */
	on(event, fn) {
		if (!this._listeners[event]) this._listeners[event] = []
		this._listeners[event].push(fn)
	}

	/** 取消订阅，fn 为空时清除该事件全部监听器 */
	off(event, fn) {
		if (!this._listeners[event]) return
		if (fn) {
			this._listeners[event] = this._listeners[event].filter(f => f !== fn)
		} else {
			delete this._listeners[event]
		}
	}

	_emit(event, data) {
		const fns = this._listeners[event] || []
		for (const fn of fns) {
			try { fn(data) } catch {}
		}
	}
}

export const wsManager = new WsManager()
