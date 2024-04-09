#!/bin/bash

TEST_DIR="example"

# Function to revert to the latest published version, ensuring it's executed in the ./$TEST_DIR directory
cleanup() {
    # Check if the current directory is ./test, if not, try to change to it
    if [[ $(basename "$PWD") != "$TEST_DIR" ]]; then
        echo "Not in ./$TEST_DIR directory. Trying to change to ./$TEST_DIR directory..."
        if [[ -d "$TEST_DIR" ]]; then
            cd $TEST_DIR || { echo "Failed to change to ./$TEST_DIR directory"; return 1; }
        else
            echo "The ./$TEST_DIR directory does not exist. Exiting cleanup."
            return 1
        fi
    fi

    echo "Reverting to latest published version of POMWright in the ./$TEST_DIR directory..."
    pnpm i -D pomwright@latest || { echo "Failed to revert to latest POMWright version"; exit 1; }
}

# Trap statement that calls cleanup function on exit
trap cleanup EXIT

# Stop the script if any command fails
set -e

# Extract version from package.json
VERSION=$(node -pe "require('./package.json').version")

# Install, Build & Pack
pnpm i --frozen-lockfile || { echo "Installation failed"; exit 1; }
pnpm build || { echo "Build failed"; exit 1; }
pnpm pack || { echo "Packaging failed"; exit 1; }

# Move to the test directory
cd $TEST_DIR || { echo "Changing directory failed"; exit 1; }

# Install the local package
pnpm i -D ../pomwright-$VERSION.tgz || { echo "Local package installation failed"; exit 1; }

# Install dependencies and run playwright tests
pnpm i --frozen-lockfile || { echo "Installation failed"; exit 1; }
pnpm playwright install --with-deps || { echo "Playwright dependencies installation failed"; exit 1; }
pnpm playwright test || { echo "Tests failed"; exit 1; }

echo "Testing completed successfully."
