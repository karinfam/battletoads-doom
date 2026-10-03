'use strict'
// WAD reading, placeholder generation and check-assets, on a synthetic IWAD.
// Run with `make test` or `node --test test/`.

const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { test } = require('node:test')
const wadlib = require('../scripts/lib/wad')
const { readPngInfo } = require('../scripts/lib/png')
const { readWadinfo, parseWadinfo } = require('../scripts/lib/wadinfo')
const { makePlaceholders } = require('../scripts/make-placeholders')
const { checkAssets } = require('../scripts/check-assets')
const { makeIwad, tempDir } = require('./helpers')

test('parseSpriteName handles plain and mirrored lumps', () => {
  assert.deepStrictEqual(wadlib.parseSpriteName('TROOA1'), { prefix: 'TROO', views: [{ frame: 'A', rot: 1 }] })
  assert.deepStrictEqual(wadlib.parseSpriteName('TROOA2A8').views, [{ frame: 'A', rot: 2 }, { frame: 'A', rot: 8 }])
  assert.strictEqual(wadlib.parseSpriteName('STFST00'), null)
})

test('spriteFrames lists frames and prefers the front view for offsets', () => {
  const wad = wadlib.readWad(makeIwad(tempDir()))
  const frames = wadlib.spriteFrames(wad, 'TROO')
  assert.deepStrictEqual([...frames.keys()], ['A', 'B'])
  assert.strictEqual(frames.get('A').lump.name, 'TROOA1')
  assert.deepStrictEqual(wadlib.pictureHeader(wad, frames.get('A').lump), { width: 41, height: 57, left: 19, top: 52 })
  assert.strictEqual(wadlib.pictureHeader(wad, wadlib.findLump(wad, 'DEMO1')), null)
})

test('parseWadinfo reads sections, offsets and comments', () => {
  const info = parseWadinfo('# note\n[sprites]\nTROOA0\t19\t52 ; front\nplaya0 = 15 51\n[graphics]\nSTFST00 -5 -2\n')
  assert.deepStrictEqual(info.get('sprites'), [{ name: 'TROOA0', x: 19, y: 52 }, { name: 'PLAYA0', x: 15, y: 51 }])
  assert.deepStrictEqual(info.get('graphics'), [{ name: 'STFST00', x: -5, y: -2 }])
})

test('placeholders take size and offsets from the IWAD and pass check-assets', () => {
  const dir = tempDir()
  const iwad = makeIwad(dir)
  const out = path.join(dir, 'assets')
  const written = makePlaceholders(iwad, out, ['TROO', 'STFST'])
  assert.deepStrictEqual(written, ['TROOA0', 'TROOB0', 'STFST00', 'STFST01'])

  const png = readPngInfo(path.join(out, 'sprites', 'TROOA0.png'))
  assert.deepStrictEqual(png, { width: 41, height: 57, bitDepth: 8, colourType: 6 })
  const info = readWadinfo(path.join(out, 'wadinfo.txt'))
  assert.deepStrictEqual(info.get('sprites')[0], { name: 'TROOA0', x: 19, y: 52 })
  assert.deepStrictEqual(info.get('graphics')[0], { name: 'STFST00', x: -5, y: -2 })

  assert.deepStrictEqual(checkAssets(iwad, out).problems, [])
  assert.deepStrictEqual(checkAssets(iwad, out, ['TROO', 'STFST']).problems, [])
})

test('placeholders never overwrite existing art', () => {
  const dir = tempDir()
  const iwad = makeIwad(dir)
  const out = path.join(dir, 'assets')
  fs.mkdirSync(path.join(out, 'sprites'), { recursive: true })
  fs.writeFileSync(path.join(out, 'sprites', 'TROOA0.png'), 'real art')
  assert.deepStrictEqual(makePlaceholders(iwad, out, ['TROO']), ['TROOB0'])
  assert.strictEqual(fs.readFileSync(path.join(out, 'sprites', 'TROOA0.png'), 'utf8'), 'real art')
})

test('check-assets reports missing, extra, angled and unlisted art', () => {
  const dir = tempDir()
  const iwad = makeIwad(dir)
  const out = path.join(dir, 'assets')
  makePlaceholders(iwad, out, ['TROO'])
  const sprites = path.join(out, 'sprites')
  fs.renameSync(path.join(sprites, 'TROOB0.png'), path.join(sprites, 'TROOC0.png'))
  fs.copyFileSync(path.join(sprites, 'TROOA0.png'), path.join(sprites, 'TROOA1.png'))

  const { problems } = checkAssets(iwad, out, ['PLAY'])
  const has = (text) => assert.ok(problems.some((p) => p.includes(text)), `expected a problem mentioning "${text}" in:\n${problems.join('\n')}`)
  has('TROO: missing frames B')
  has('TROO: extra frames C')
  has('TROOA1.png: v1 art is single-angle')
  has('PLAY: missing frames A')
  has('no [sprites] entry for TROOC0')
  has('lists TROOB0 but sprites/TROOB0.png does not exist')
})
