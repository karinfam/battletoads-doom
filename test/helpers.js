'use strict'
// Builds a small synthetic IWAD so the tests need no real game data.

const fs = require('fs')
const os = require('os')
const path = require('path')
const { writeWad } = require('../scripts/lib/wad')

// An empty Doom picture: header, column offsets, one end-of-column byte each.
function picture(width, height, left, top) {
  const buf = Buffer.alloc(8 + width * 4 + width, 0xff)
  buf.writeInt16LE(width, 0)
  buf.writeInt16LE(height, 2)
  buf.writeInt16LE(left, 4)
  buf.writeInt16LE(top, 6)
  for (let x = 0; x < width; x++) buf.writeInt32LE(8 + width * 4 + x, 8 + x * 4)
  return buf
}

function palette() {
  const buf = Buffer.alloc(768)
  for (let i = 0; i < 256; i++) buf.fill(i, i * 3, i * 3 + 3)
  return buf
}

const marker = (name) => ({ name, data: Buffer.alloc(0) })

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toads-test-'))
}

// TROO has frames A and B across mixed rotations, PLAY has frame A only, and
// STFST00/STFST01 are graphics outside the sprite block.
function makeIwad(dir) {
  const file = path.join(dir, 'test.wad')
  writeWad(file, 'IWAD', [
    { name: 'PLAYPAL', data: palette() },
    { name: 'STFST00', data: picture(24, 29, -5, -2) },
    { name: 'STFST01', data: picture(24, 29, -5, -2) },
    { name: 'DEMO1', data: Buffer.from('not a picture') },
    marker('S_START'),
    { name: 'TROOA2A8', data: picture(40, 55, 20, 50) },
    { name: 'TROOA1', data: picture(41, 57, 19, 52) },
    { name: 'TROOB1', data: picture(37, 59, 17, 54) },
    { name: 'TROOB2B8', data: picture(36, 58, 16, 53) },
    { name: 'PLAYA1', data: picture(31, 56, 15, 51) },
    marker('S_END'),
  ])
  return file
}

module.exports = { picture, makeIwad, tempDir }
