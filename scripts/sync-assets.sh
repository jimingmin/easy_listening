#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="/Users/mingminji/workspace/server_106_14_147_33/frontend/assets"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_ROOT="$PROJECT_ROOT/references/source-assets"
MOBILE_ASSET_ROOT="$PROJECT_ROOT/apps/mobile/assets/seed"

mkdir -p "$TARGET_ROOT/home"
mkdir -p "$MOBILE_ASSET_ROOT/home"

cp "$SOURCE_ROOT/introduce.png" "$TARGET_ROOT/"
cp "$SOURCE_ROOT/introduce.gif" "$TARGET_ROOT/"
cp "$SOURCE_ROOT/logo.svg" "$TARGET_ROOT/"
cp "$SOURCE_ROOT/default_avatar.svg" "$TARGET_ROOT/"
cp -R "$SOURCE_ROOT/home/." "$TARGET_ROOT/home/"
cp "$SOURCE_ROOT/home/study-1.jpg" "$MOBILE_ASSET_ROOT/home/"

printf 'Synced assets into %s and %s\n' "$TARGET_ROOT" "$MOBILE_ASSET_ROOT"
