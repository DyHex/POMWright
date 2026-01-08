#!/bin/bash

set -e

VERSION=$(node -pe "require('./package.json').version")

pnpm i --frozen-lockfile || { echo "Installation failed"; exit 1; }
pnpm build || { echo "Build failed"; exit 1; }
pnpm pack || { echo "Packaging failed"; exit 1; }

echo "Built pomwright-$VERSION.tgz"
