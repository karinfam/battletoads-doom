'use strict'
// Tiny PNG writer (8-bit RGBA, no interlace) and header reader.

const fs = require('fs')
const zlib = require('zlib')

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 4, 'latin1')
  data.copy(out, 8)
  out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

// rgba: Buffer of width * height * 4 bytes.
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: truecolour with alpha
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function readPngInfo(file) {
  const buf = fs.readFileSync(file)
  if (!buf.subarray(0, 8).equals(SIGNATURE) || buf.toString('latin1', 12, 16) !== 'IHDR') {
    throw new Error(`${file}: not a PNG file`)
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bitDepth: buf[24],
    colourType: buf[25],
  }
}

module.exports = { encodePng, readPngInfo }
