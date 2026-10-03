'use strict'
// Starts desktop Chocolate Doom with build/toads.wad merged and checks it is
// still running after a few seconds. With -nogui a sprite error at start-up
// (a frame with both a rotation 0 lump and angled lumps, say) exits at once.
// Opens a game window, so it is not part of `make test`.
//
//   node --test smoke/desktop.smoke.js        (IWAD=iwads/doom.wad to switch base game)

const assert = require('node:assert')
const fs = require('fs')
const { spawn } = require('child_process')
const { test } = require('node:test')
const { rel, resolveIwad, findTool } = require('../scripts/lib/env')

const wad = rel('build', 'toads.wad')

test('the engine starts with toads.wad merged and no sprite errors', { skip: !fs.existsSync(wad) && 'run `make wad` first' }, async () => {
  fs.mkdirSync(rel('build', 'run'), { recursive: true })
  const args = ['-iwad', resolveIwad(), '-merge', wad, '-warp', '1', '1', '-window', '-nogui', '-nosound', '-nograbmouse']
  const game = spawn(findTool('chocolate-doom', 'CHOCOLATE_DOOM'), args, { cwd: rel('build', 'run') })
  let output = ''
  game.stdout.on('data', (d) => (output += d))
  game.stderr.on('data', (d) => (output += d))
  const exited = new Promise((resolve) => game.once('exit', (code) => resolve(code)))
  const code = await Promise.race([exited, new Promise((resolve) => setTimeout(() => resolve('running'), 6000))])
  game.kill()
  assert.strictEqual(code, 'running', `the engine exited early (code ${code}):\n${output}`)
  // stdout is buffered while piped, so only stderr is reliable here.
  assert.doesNotMatch(output, /R_InitSprites|Error:/)
})
