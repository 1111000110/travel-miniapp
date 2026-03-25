/**
 * Generate tabbar PNG icons using only Node.js built-ins (zlib).
 * Outputs 81×81 RGBA PNGs to src/static/tabbar/
 */
const zlib = require('node:zlib')
const fs = require('node:fs')
const path = require('node:path')

const W = 81, H = 81
const OUT = path.join(__dirname, '../src/static/tabbar')

// ── PNG writer ────────────────────────────────────────────────────────────────
function writePNG(filepath, getPixel) {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  const crc32 = buf => { let c = -1; for (const b of buf) c = (c >>> 8) ^ t[(c ^ b) & 0xff]; return ~c }
  const chunk = (type, data) => {
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const out = Buffer.alloc(4 + td.length + 4)
    out.writeUInt32BE(data.length, 0); td.copy(out, 4); out.writeInt32BE(crc32(td), 4 + td.length)
    return out
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc(H * (1 + W * 4))
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0
    for (let x = 0; x < W; x++) {
      const [r, g, b, a] = getPixel(x, y)
      const o = y * (1 + W * 4) + 1 + x * 4
      raw[o] = r; raw[o+1] = g; raw[o+2] = b; raw[o+3] = a
    }
  }
  fs.writeFileSync(filepath, Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]))
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const d = (x, y, cx, cy) => Math.sqrt((x-cx)**2 + (y-cy)**2)

// Rounded-rect hit test
function inRR(x, y, x1, y1, x2, y2, r) {
  if (x < x1 || x > x2 || y < y1 || y > y2) return false
  const cx = x < x1+r ? x1+r : x > x2-r ? x2-r : x
  const cy = y < y1+r ? y1+r : y > y2-r ? y2-r : y
  return d(x, y, cx, cy) <= r + 0.5
}

// ── Icon shapes ───────────────────────────────────────────────────────────────

// 🏠 Home: roof triangle + body + door hole
function shapeHome(x, y) {
  const cx = 40
  // Roof triangle: apex (40,9) → base y=42, half-width 27
  if (y >= 9 && y <= 42) {
    const hw = (y - 9) * 27 / 33
    if (Math.abs(x - cx) <= hw + 0.5) return true
  }
  // Body rectangle
  if (x >= 16 && x <= 64 && y >= 36 && y <= 68) {
    // Door hole (transparent)
    if (x >= 33 && x <= 47 && y >= 52) return false
    return true
  }
  return false
}

// 🧭 Tools: compass dial — outer ring + 4 cardinal tick marks + center dot
function shapeTools(x, y) {
  const cx = 40, cy = 40
  const dist = d(x, y, cx, cy)
  // Outer filled circle
  if (dist > 33) return false
  // Inner hole (donut)
  if (dist < 18) {
    // Center dot
    if (dist < 5) return true
    return false
  }
  // Ring: keep
  if (dist >= 18 && dist <= 33) return true
  return false
}

// ✦ AI: 4-pointed sparkle star
function shapeAI(x, y) {
  const cx = 40, cy = 40
  const dist = d(x, y, cx, cy)
  if (dist > 36) return false
  const angle = Math.atan2(y - cy, x - cx)
  // Normalize angle to nearest axis (0, π/2, π, 3π/2)
  const a4 = ((angle % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2)
  const fromAxis = Math.min(a4, Math.PI / 2 - a4)
  // Taper: wide near center, narrow at tips
  const maxAngle = 0.22 * Math.max(0, 1 - dist / 36) + 0.055
  if (fromAxis < maxAngle) return true
  // Small center square
  if (Math.abs(x - cx) + Math.abs(y - cy) < 9) return true
  return false
}

// 💬 Message: rounded rect bubble + tail
function shapeMessage(x, y) {
  // Bubble body
  if (inRR(x, y, 8, 10, 72, 54, 11)) return true
  // Tail: triangle from (16,54) → (14,68) → (30,54)
  if (y > 54 && y <= 68) {
    const t = (y - 54) / 14
    const left  = Math.round(16 - t * 2)
    const right = Math.round(30 - t * 16)
    if (right >= left && x >= left && x <= right) return true
  }
  return false
}

// 👤 Profile: circle head + rounded body
function shapeProfile(x, y) {
  const cx = 40
  // Head
  if (d(x, y, cx, 22) <= 15) return true
  // Body: upper half of ellipse, clipped
  if (y >= 44 && y <= 70) {
    const nx = (x - cx) / 25
    const ny = (y - 70) / 26
    if (nx*nx + ny*ny <= 1) return true
  }
  return false
}

// ── Render ────────────────────────────────────────────────────────────────────
const ICONS = [
  { name: 'home',    shape: shapeHome    },
  { name: 'tools',   shape: shapeTools   },
  { name: 'ai',      shape: shapeAI      },
  { name: 'message', shape: shapeMessage },
  { name: 'profile', shape: shapeProfile },
]

// Normal: #7A726B  Active: #E05C2A
const COLORS = {
  normal: [122, 114, 107, 255],
  active: [224,  92,  42, 255],
}

for (const { name, shape } of ICONS) {
  for (const [state, color] of Object.entries(COLORS)) {
    const suffix = state === 'active' ? '-active' : ''
    const file = path.join(OUT, `${name}${suffix}.png`)
    writePNG(file, (x, y) => shape(x, y) ? color : [0, 0, 0, 0])
    console.log('✓', path.basename(file))
  }
}

console.log('\nDone — icons written to src/static/tabbar/')
