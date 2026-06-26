#!/usr/bin/env bash
# Generate request/response JSON payloads of a given character size.
set -eu

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT}/payloads"
SIZE="${1:-1024}"

mkdir -p "${OUT_DIR}"

if command -v uv >/dev/null 2>&1; then
  uv run --script "${ROOT}/scripts/gen-req.py" "${SIZE}" \
    > "${OUT_DIR}/req-${SIZE}.json"
  uv run --script "${ROOT}/scripts/gen-resp.py" "${SIZE}" \
    > "${OUT_DIR}/resp-${SIZE}.json"
elif command -v python3 >/dev/null 2>&1; then
  python3 "${ROOT}/scripts/gen-req.py" "${SIZE}" > "${OUT_DIR}/req-${SIZE}.json"
  python3 "${ROOT}/scripts/gen-resp.py" "${SIZE}" > "${OUT_DIR}/resp-${SIZE}.json"
else
  echo "uv or python3 is required" >&2
  exit 1
fi

echo "Wrote ${OUT_DIR}/req-${SIZE}.json ($(wc -c < "${OUT_DIR}/req-${SIZE}.json") bytes)"
echo "Wrote ${OUT_DIR}/resp-${SIZE}.json ($(wc -c < "${OUT_DIR}/resp-${SIZE}.json") bytes)"
