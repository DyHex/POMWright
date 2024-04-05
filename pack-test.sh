#!/bin/bash

pnpm i && pnpm build && pnpm pack
cd example
pnpm i -D ../pomwright-1.0.0.tgz
pnpm playwright test

# Reverts pomwright to be latest version instead of locally packed version
pnpm i pomwright@latest