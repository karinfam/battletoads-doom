'use strict'
// Minimal WAD reader/writer. Enough to list lumps, find the sprite block and
// read picture headers and PLAYPAL. Converting art into lumps is DeuTex's job.

const fs = require('fs')

function readWad(file) {
  const buf = fs.readFileSync(file)
  const type = buf.toString('latin1', 0, 4)
  if (type !== 'IWAD' && type !== 'PWAD') throw new Error(`${file}: not a WAD file`)
  const count = buf.readInt32LE(4)
  const dir = buf.readInt32LE(8)
  const lumps = []
  for (let i = 0; i < count; i++) {
    const e = dir + i * 16
    lumps.push({
      index: i,
      pos: buf.readInt32LE(e),
      size: buf.readInt32LE(e + 4),
      name: buf.toString('latin1', e + 8, e + 16).replace(/\0[\s\S]*$/, '').toUpperCase(),
    })
  }
  return { file, type, buf, lumps }
}

// lumps: [{ name, data: Buffer }]. Markers are lumps with empty data.
function writeWad(file, type, lumps) {
  const header = Buffer.alloc(12)
  const dir = Buffer.alloc(lumps.length * 16)
  let pos = 12
  lumps.forEach((lump, i) => {
    dir.writeInt32LE(pos, i * 16)
    dir.writeInt32LE(lump.data.length, i * 16 + 4)
    dir.write(lump.name, i * 16 + 8, 8, 'latin1')
    pos += lump.data.length
  })
  header.write(type, 0, 4, 'latin1')
  header.writeInt32LE(lumps.length, 4)
  header.writeInt32LE(pos, 8)
  fs.writeFileSync(file, Buffer.concat([header, ...lumps.map((l) => l.data), dir]))
}

function lumpData(wad, lump) {
  return wad.buf.subarray(lump.pos, lump.pos + lump.size)
}

// The last lump with a name wins, as in the engine.
function findLump(wad, name) {
  for (let i = wad.lumps.length - 1; i >= 0; i--) {
    if (wad.lumps[i].name === name) return wad.lumps[i]
  }
  return null
}

// Lumps between the sprite markers. IWADs use S_START/S_END; PWADs built by
// DeuTex use SS_START and either end marker.
function spriteLumps(wad) {
  const out = []
  let inside = false
  for (const lump of wad.lumps) {
    if (lump.name === 'S_START' || lump.name === 'SS_START') inside = true
    else if (lump.name === 'S_END' || lump.name === 'SS_END') inside = false
    else if (inside && lump.size > 0) out.push(lump)
  }
  return out
}

function isSpriteLump(wad, lump) {
  return spriteLumps(wad).includes(lump)
}

// TROOA1 -> prefix TROO, views [{frame:'A', rot:1}]
// TROOA2A8 -> views [{frame:'A', rot:2}, {frame:'A', rot:8}] (second is mirrored)
function parseSpriteName(name) {
  if (name.length !== 6 && name.length !== 8) return null
  const views = []
  for (let i = 4; i < name.length; i += 2) {
    const rot = name.charCodeAt(i + 1) - 48
    if (rot < 0 || rot > 8) return null
    views.push({ frame: name[i], rot })
  }
  return { prefix: name.slice(0, 4), views }
}

// Frame letters a prefix uses, in order, each with the lump that best stands
// for the frame seen from the front (rotation 0 or 1, else the first found).
function spriteFrames(wad, prefix) {
  const frames = new Map()
  for (const lump of spriteLumps(wad)) {
    if (!lump.name.startsWith(prefix)) continue
    const parsed = parseSpriteName(lump.name)
    if (!parsed) continue
    for (const view of parsed.views) {
      const seen = frames.get(view.frame)
      if (!seen) frames.set(view.frame, { lump, rot: view.rot })
      else if (view.rot <= 1 && seen.rot > 1) frames.set(view.frame, { lump, rot: view.rot })
    }
  }
  return new Map([...frames.entries()].sort(([a], [b]) => a.charCodeAt(0) - b.charCodeAt(0)))
}

// Doom picture header: width, height, left offset, top offset. Returns null if
// the lump does not look like a picture.
function pictureHeader(wad, lump) {
  if (lump.size < 8) return null
  const d = lumpData(wad, lump)
  const width = d.readInt16LE(0)
  const height = d.readInt16LE(2)
  if (width < 1 || width > 4096 || height < 1 || height > 4096) return null
  if (lump.size < 8 + width * 4) return null
  for (let x = 0; x < width; x++) {
    const ofs = d.readInt32LE(8 + x * 4)
    if (ofs < 8 + width * 4 || ofs >= lump.size) return null
  }
  return { width, height, left: d.readInt16LE(4), top: d.readInt16LE(6) }
}

// First of the 14 palettes in PLAYPAL, as [[r, g, b], ...] with 256 entries.
function playpal(wad) {
  const lump = findLump(wad, 'PLAYPAL')
  if (!lump || lump.size < 768) throw new Error(`${wad.file}: no PLAYPAL`)
  const d = lumpData(wad, lump)
  const pal = []
  for (let i = 0; i < 256; i++) pal.push([d[i * 3], d[i * 3 + 1], d[i * 3 + 2]])
  return pal
}

module.exports = {
  readWad,
  writeWad,
  lumpData,
  findLump,
  spriteLumps,
  isSpriteLump,
  parseSpriteName,
  spriteFrames,
  pictureHeader,
  playpal,
}
