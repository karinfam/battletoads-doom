'use strict'
// What the lobby and the engine need from a router, whichever one is running:
// the local dev-server, the Worker under `wrangler dev`, or production.

const assert = require('node:assert')
const WebSocket = require('ws')

// To and From are 32-bit little-endian ids, then the Doom packet.
function envelope(to, from, payload) {
  const head = Buffer.alloc(8)
  head.writeUInt32LE(to, 0)
  head.writeUInt32LE(from, 4)
  return Buffer.concat([head, Buffer.from(payload)])
}

const opened = (ws) => new Promise((resolve, reject) => ws.once('open', resolve).once('error', reject))
const nextMessage = (ws) => new Promise((resolve) => ws.once('message', (data) => resolve(Buffer.from(data))))

async function checkRouter(origin) {
  assert.strictEqual((await fetch(`${origin}/api/room/nope-nope`)).status, 404)

  const { room } = await (await fetch(`${origin}/api/newroom`)).json()
  assert.match(room, /^[a-z0-9]+-[a-z0-9]+$/, 'room ids must fit the pattern the lobby accepts')
  const state = await (await fetch(`${origin}/api/room/${room}`)).json()
  assert.strictEqual(state.gameStarted, false)

  const wsOrigin = origin.replace(/^http/, 'ws')
  const host = new WebSocket(`${wsOrigin}/api/ws/${room}`)
  const guest = new WebSocket(`${wsOrigin}/api/ws/${room}`)
  try {
    await Promise.all([opened(host), opened(guest)])

    // The host (id 1) announces itself; the guest (id 7) then reaches it.
    host.send(envelope(0, 1, 'hello'))
    await new Promise((resolve) => setTimeout(resolve, 200))
    const atHost = nextMessage(host)
    guest.send(envelope(1, 7, 'syn'))
    const received = await atHost
    assert.strictEqual(received.readUInt32LE(0), 7, 'the To field is stripped, From comes first')
    assert.strictEqual(received.subarray(4).toString(), 'syn')

    const atGuest = nextMessage(guest)
    host.send(envelope(7, 1, 'ack'))
    assert.strictEqual((await atGuest).subarray(4).toString(), 'ack')

    await fetch(`${origin}/api/room/${room}/started`)
    assert.strictEqual((await (await fetch(`${origin}/api/room/${room}`)).json()).gameStarted, true)
  } finally {
    host.close()
    guest.close()
  }
}

module.exports = { checkRouter }
