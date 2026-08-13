#!/usr/bin/env bash
# Generate request/response JSON payloads of a given character size.
#
# Usage:
#   ./scripts/generate-payloads.sh [size] [openai|anthropic|both]
#
# Defaults: size=1024, format=both
#   openai   -> payloads/req-<size>.json, payloads/resp-<size>.json
#   anthropic -> payloads/req-anthropic-<size>.json, payloads/resp-anthropic-<size>.json
set -eu

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT}/payloads"
SIZE="${1:-1024}"
FORMAT="${2:-both}"

mkdir -p "${OUT_DIR}"

run_gen() {
  local script="$1"
  shift
  if command -v uv >/dev/null 2>&1; then
    uv run --script "${ROOT}/scripts/${script}" "$@"
  elif command -v python3 >/dev/null 2>&1; then
    python3 "${ROOT}/scripts/${script}" "$@"
  else
    echo "uv or python3 is required" >&2
    exit 1
  fi
}

write_pair() {
  local fmt="$1"
  local req_name="$2"
  local resp_name="$3"

  run_gen gen-req.py "${SIZE}" "${fmt}" > "${OUT_DIR}/${req_name}"
  run_gen gen-resp.py "${SIZE}" "${fmt}" > "${OUT_DIR}/${resp_name}"

  echo "Wrote ${OUT_DIR}/${req_name} ($(wc -c < "${OUT_DIR}/${req_name}" | tr -d ' ') bytes)"
  echo "Wrote ${OUT_DIR}/${resp_name} ($(wc -c < "${OUT_DIR}/${resp_name}" | tr -d ' ') bytes)"
}

case "${FORMAT}" in
  openai|chat)
    write_pair openai "req-${SIZE}.json" "resp-${SIZE}.json"
    ;;
  anthropic|messages|claude)
    write_pair anthropic "req-anthropic-${SIZE}.json" "resp-anthropic-${SIZE}.json"
    ;;
  both|all)
    write_pair openai "req-${SIZE}.json" "resp-${SIZE}.json"
    write_pair anthropic "req-anthropic-${SIZE}.json" "resp-anthropic-${SIZE}.json"
    ;;
  *)
    echo "unknown format: ${FORMAT} (expected openai|anthropic|both)" >&2
    exit 1
    ;;
esac
