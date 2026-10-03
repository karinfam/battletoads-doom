'use strict'
// import-art on a synthetic image and IWAD: background removal, scaling,
// palette snapping and offsets.

const assert = require('node:assert')
const path = require('path')
const { test } = require('node:test')
const sharp = require('sharp')
const { readPngInfo } = require('../scripts/lib/png')
const { readWadinfo } = require('../scripts/lib/wadinfo')
const { importArt } = require('../scripts/import-art')
const { checkAssets } = require('../scripts/check-assets')
const { makeIwad, tempDir } = require('./helpers')

// A green figure with a black belt on magenta, with a magenta pocket inside.
async function makeSource(dir) {
  const file = path.join(dir, 'source.png')
  const box = (width, height, colour) => sharp({ create: { width, height, channels: 3, background: colour } }).png().toBuffer()
  await sharp({ create: { width: 200, height: 300, channels: 3, background: '#ff00aa' } })
    .composite([
      { input: await box(100, 228, '#30c030'), left: 50, top: 36 },
      { input: await box(100, 20, '#000000'), left: 50, top: 150 },
      { input: await box(10, 10, '#ff00aa'), left: 60, top: 60 },
    ])
    .png()
    .toFile(file)
  return file
}

const pixel = async (file, x, y) => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  return [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)]
}

test('a world sprite is cut out, scaled to the original height and put on the floor', async () => {
  const dir = tempDir()
  const iwad = makeIwad(dir)
  const assets = path.join(dir, 'assets')
  const result = await importArt(await makeSource(dir), 'TROOA0', { iwadFile: iwad, assetsDir: assets })

  // The original TROOA1 is 41x57 with top offset 52: the figure is 100x228, so 25x57.
  assert.deepStrictEqual([result.width, result.height, result.x, result.y], [25, 57, 13, 52])
  assert.strictEqual(readPngInfo(result.file).colourType, 6)
  assert.deepStrictEqual(readWadinfo(path.join(assets, 'wadinfo.txt')).get('sprites'), [{ name: 'TROOA0', x: 13, y: 52 }])

  // The test palette is grey, index i = (i, i, i): green must land in the ramp.
  const [r, , , a] = await pixel(result.file, 20, 50)
  assert.strictEqual(a, 255)
  assert.ok(r >= 112 && r <= 127, `green skin should use the player ramp, got index ${r}`)
  assert.strictEqual((await pixel(result.file, 4, 7))[3], 0, 'the magenta pocket inside the figure is cleared')

  await importArt(await makeSource(dir), 'TROOB0', { iwadFile: iwad, assetsDir: assets })
  assert.deepStrictEqual(checkAssets(iwad, assets).problems, [])
})

test('a graphic is fitted to the box and offsets of the lump it replaces', async () => {
  const dir = tempDir()
  const iwad = makeIwad(dir)
  const assets = path.join(dir, 'assets')
  const result = await importArt(await makeSource(dir), 'STFST00', { iwadFile: iwad, assetsDir: assets, crop: '50,36,100,120' })
  assert.deepStrictEqual([result.width, result.height, result.x, result.y], [24, 29, -5, -2])
  assert.deepStrictEqual(readWadinfo(path.join(assets, 'wadinfo.txt')).get('graphics'), [{ name: 'STFST00', x: -5, y: -2 }])
})
