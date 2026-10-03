'use strict'
// Download a pinned release archive, verify its SHA-256 and unpack entries.

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

// Downloads url into cacheFile unless a copy with the right hash is there.
async function download(url, cacheFile, expectedSha256) {
  if (fs.existsSync(cacheFile) && sha256(fs.readFileSync(cacheFile)) === expectedSha256) {
    return fs.readFileSync(cacheFile)
  }
  console.log(`downloading ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const actual = sha256(buf)
  if (actual !== expectedSha256) {
    throw new Error(`${url}: SHA-256 mismatch\n  expected ${expectedSha256}\n  actual   ${actual}`)
  }
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
  fs.writeFileSync(cacheFile, buf)
  return buf
}

// Minimal zip reader: stored and deflated entries, no zip64.
// -> [{ name, data() }]
function zipEntries(buf) {
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error('zip: end of central directory not found')
  const count = buf.readUInt16LE(eocd + 10)
  let pos = buf.readUInt32LE(eocd + 16)
  const entries = []
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) throw new Error('zip: bad central directory')
    const method = buf.readUInt16LE(pos + 10)
    const compressedSize = buf.readUInt32LE(pos + 20)
    const nameLen = buf.readUInt16LE(pos + 28)
    const extraLen = buf.readUInt16LE(pos + 30)
    const commentLen = buf.readUInt16LE(pos + 32)
    const local = buf.readUInt32LE(pos + 42)
    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLen)
    entries.push({
      name,
      data() {
        const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
        const raw = buf.subarray(start, start + compressedSize)
        if (method === 0) return Buffer.from(raw)
        if (method === 8) return zlib.inflateRawSync(raw)
        throw new Error(`zip: ${name}: unsupported compression method ${method}`)
      },
    })
    pos += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

// Writes every file entry into dir, dropping the archive's own folders.
function unzipFlat(buf, dir) {
  fs.mkdirSync(dir, { recursive: true })
  for (const entry of zipEntries(buf)) {
    if (entry.name.endsWith('/')) continue
    fs.writeFileSync(path.join(dir, path.basename(entry.name)), entry.data())
  }
}

module.exports = { sha256, download, zipEntries, unzipFlat }
