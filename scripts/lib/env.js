'use strict'
// Shared paths, pinned versions and tool lookup for the build scripts.

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const rel = (...parts) => path.join(ROOT, ...parts)

const FREEDOOM_VERSION = '0.13.0'
const DEFAULT_IWAD = rel('iwads', 'freedoom1.wad')

// Options are --name value or --flag; everything else is positional.
function parseArgs(argv, valueOptions = []) {
  const opts = {}
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) rest.push(arg)
    else if (valueOptions.includes(arg.slice(2))) opts[arg.slice(2)] = argv[++i]
    else opts[arg.slice(2)] = true
  }
  return { opts, rest }
}

// IWAD= on the make command line arrives as an env var or --iwad.
function resolveIwad(opt) {
  const iwad = path.resolve(ROOT, opt || process.env.IWAD || DEFAULT_IWAD)
  if (!fs.existsSync(iwad)) {
    const hint = iwad === DEFAULT_IWAD ? ' Run `make iwad` (scripts/fetch-freedoom) first.' : ''
    fail(`IWAD not found: ${iwad}.${hint}`)
  }
  return iwad
}

// Looks for a binary in $ENVVAR, then tools/ (filled by scripts/fetch-tools),
// then PATH.
function findTool(name, envVar) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name
  if (process.env[envVar]) return process.env[envVar]
  const toolsDir = rel('tools')
  if (fs.existsSync(toolsDir)) {
    for (const dir of fs.readdirSync(toolsDir)) {
      const candidate = path.join(toolsDir, dir, exe)
      if (fs.existsSync(candidate)) return candidate
    }
  }
  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' })
  if (probe.status === 0) return probe.stdout.split(/\r?\n/)[0].trim()
  fail(`${name} not found. Install it, run scripts/fetch-tools (Windows), or set ${envVar}.`)
}

function fail(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}

module.exports = { ROOT, rel, FREEDOOM_VERSION, DEFAULT_IWAD, parseArgs, resolveIwad, findTool, fail }
