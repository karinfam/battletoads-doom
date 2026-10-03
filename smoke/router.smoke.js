'use strict'
// Runs the router contract against a live origin: the Worker under
// `make dev-worker`, or the production domain after a deploy.
//
//   ROUTER_ORIGIN=http://localhost:8787 node --test smoke/router.smoke.js

const { test } = require('node:test')
const { checkRouter } = require('../test/router-contract')

const origin = process.env.ROUTER_ORIGIN

test(`router at ${origin || '(ROUTER_ORIGIN not set)'} passes the contract`, { skip: !origin }, async () => {
  await checkRouter(origin.replace(/\/$/, ''))
})
