'use strict'
// Turns a generated or drawn image into Doom-scale art: cut out the magenta
// background, trim, shrink, and snap every pixel to the game's palette.

const sharp = require('sharp')

const GREEN_RAMP = [112, 127] // recoloured per player by the engine
const DEUTEX_TRANSPARENT = 247 // DeuTex reads this palette colour as "no pixel"

// Per-player colour ramps the engine swaps the green ramp for.
const PLAYER_RAMPS = { green: 112, indigo: 96, brown: 64, red: 32 }

const isMagenta = (r, g, b) => r - g > 60 && b - g > 20
const isGreen = (r, g, b) => g > r * 1.12 && g > b * 1.12

// Clears the background by flood-filling magenta inwards from the edges, so
// magenta-ish pixels inside the character survive.
function keyOutBackground(rgba, width, height) {
  const seen = new Uint8Array(width * height)
  const stack = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = y * width + x
    if (seen[i]) return
    seen[i] = 1
    if (isMagenta(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])) stack.push(i)
  }
  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }
  while (stack.length) {
    const i = stack.pop()
    rgba[i * 4 + 3] = 0
    const x = i % width
    const y = (i - x) / width
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }
  // Pockets of background the fill cannot reach (between an arm and the body)
  // are cleared only when they are unmistakably magenta.
  for (let i = 0; i < width * height; i++) {
    if (rgba[i * 4] - rgba[i * 4 + 1] > 110 && rgba[i * 4 + 2] - rgba[i * 4 + 1] > 60) rgba[i * 4 + 3] = 0
  }
}

function nearestIndex(palette, r, g, b, from = 0, to = 255) {
  let best = from
  let bestDist = Infinity
  for (let i = from; i <= to; i++) {
    if (i === DEUTEX_TRANSPARENT) continue
    const dr = palette[i][0] - r
    const dg = palette[i][1] - g
    const db = palette[i][2] - b
    const dist = dr * dr * 2 + dg * dg * 4 + db * db * 3
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

// source: file path or Buffer of any image sharp reads.
// fit: { height } scales to that height, { width, height } fills that box.
// -> { width, height, indices } where indices[i] is a palette index or -1.
async function doomify(source, palette, fit) {
  const input = sharp(source).ensureAlpha()
  const { data, info } = await input.raw().toBuffer({ resolveWithObject: true })
  keyOutBackground(data, info.width, info.height)

  let image = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim()
  image = fit.width
    ? image.resize(fit.width, fit.height, { fit: 'cover', position: 'top' })
    : image.resize({ height: fit.height })
  const out = await image.raw().toBuffer({ resolveWithObject: true })

  const { width, height } = out.info
  const indices = new Int16Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const [r, g, b, a] = out.data.subarray(i * 4, i * 4 + 4)
    if (a < 128) indices[i] = -1
    // Green skin is kept inside the ramp so every player gets their colour.
    else if (isGreen(r, g, b)) indices[i] = nearestIndex(palette, r, g, b, GREEN_RAMP[0], GREEN_RAMP[1])
    else indices[i] = nearestIndex(palette, r, g, b)
  }
  return { width, height, indices }
}

// Palette indices -> RGBA. ramp picks the player colour to preview.
function toRgba({ width, height, indices }, palette, ramp = 'green') {
  const shift = PLAYER_RAMPS[ramp] - GREEN_RAMP[0]
  const rgba = Buffer.alloc(width * height * 4)
  indices.forEach((index, i) => {
    if (index < 0) return
    const mapped = index >= GREEN_RAMP[0] && index <= GREEN_RAMP[1] ? index + shift : index
    rgba[i * 4] = palette[mapped][0]
    rgba[i * 4 + 1] = palette[mapped][1]
    rgba[i * 4 + 2] = palette[mapped][2]
    rgba[i * 4 + 3] = 255
  })
  return rgba
}

module.exports = { doomify, toRgba, PLAYER_RAMPS }
