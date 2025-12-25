#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-help}"

case "$cmd" in
help | --help | -h)
    cat <<'EOF'
Usage: ./scripts/dev.sh <command>

Commands:
  test        Run unit tests
  lint        Run eslint
  typecheck   Run TypeScript typecheck
EOF
    ;;
test)
    pnpm test
    ;;
lint)
    pnpm run lint
    ;;
typecheck)
    pnpm run typecheck
    ;;
*)
    echo "Unknown command: $cmd" >&2
    exit 1
    ;;
esac
