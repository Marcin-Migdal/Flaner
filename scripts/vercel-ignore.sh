#!/usr/bin/env bash
# Vercel Ignored Build Step for one app: exit 0 skips the build, exit 1 builds.
# Usage (from packages/<app>/vercel.json): bash ../../scripts/vercel-ignore.sh <app>
# nx-ignore exits 0 on its own errors too (issue #35), so we skip only on its explicit "skip" messages and build otherwise.

# develop always builds: on a new branch Vercel reports the production SHA as the previous one,
# so nx-ignore would skip and a rarely-changed remote would never reach the DEV domains.
[ "$VERCEL_GIT_COMMIT_REF" = "develop" ] && exit 1

cd "$(dirname "$0")/.." || exit 1
out=$(npx nx-ignore "$1" 2>&1)
echo "$out"

case "$out" in
  *"is not affected"* | *"Skip build due to commit message"*) exit 0 ;;
  *) exit 1 ;;
esac
