# Battletoads Doom. Every target calls a Node script in scripts/, so the same
# commands work from make, from `npm run <target>` and on Windows.
#
#   IWAD=iwads/doom.wad        base game for wad, run and check (default: Freedoom)
#   PLACEHOLDERS="p0 TROO"     prefixes to fill with labelled test art where real art
#                              is missing (default: p0, the player lumps; "none"
#                              for a strict build)
#   ARGS="-warp 1 3 -nosound"  extra arguments for make run

IWAD ?= iwads/freedoom1.wad
PLACEHOLDERS ?=
ARGS ?=

export IWAD PLACEHOLDERS ARGS

.PHONY: setup iwad tools check check-p0 wad run engine site dev dev-worker deploy test clean

setup:
	node scripts/setup

iwad:
	node scripts/fetch-freedoom

tools:
	node scripts/fetch-tools

check:
	node scripts/check-assets

check-p0:
	node scripts/check-assets --require p0

wad:
	node scripts/build-wad

run:
	node scripts/run-doom

engine:
	node scripts/build-engine

site:
	node scripts/build-site

dev:
	node scripts/dev-server

dev-worker:
	npx wrangler dev --config router/wrangler.toml

deploy: site
	npx wrangler deploy --config router/wrangler.toml

test:
	node --test

clean:
	node -e "for (const d of ['build', 'dist']) require('fs').rmSync(d, { recursive: true, force: true })"
