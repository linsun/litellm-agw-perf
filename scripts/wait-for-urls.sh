#!/usr/bin/env bash
# Wait until HTTP endpoints return success.
#
# Checks are passed as arguments. Prefix with "POST:" and separate URL from payload with "|":
#   POST:http://127.0.0.1:4001/v1/chat/completions|payloads/req-1024.json
set -euo pipefail

TIMEOUT="${1:-300}"
shift

if (( $# == 0 )); then
  echo "usage: $0 [timeout_seconds] URL [POST:url|payload_file ...]" >&2
  exit 1
fi

check_url() {
  local spec="$1"
  if [[ "${spec}" == POST:* ]]; then
    local body="${spec#POST:}"
    local url="${body%%|*}"
    local payload="${body#*|}"
    curl -4 -fsS -o /dev/null -X POST \
      -H "Content-Type: application/json" \
      --data-binary "@${payload}" \
      "${url}"
  else
    curl -4 -fsS -o /dev/null "${spec}"
  fi
}

deadline=$((SECONDS + TIMEOUT))
last_report="${SECONDS}"

while (( SECONDS < deadline )); do
  pending=()
  for spec in "$@"; do
    if ! check_url "${spec}" 2>/dev/null; then
      pending+=("${spec}")
    fi
  done

  if (( ${#pending[@]} == 0 )); then
    exit 0
  fi

  if (( SECONDS - last_report >= 10 )); then
    echo "Still waiting (${SECONDS}s/${TIMEOUT}s):" >&2
    for spec in "${pending[@]}"; do
      echo "  - ${spec}" >&2
    done
    last_report="${SECONDS}"
  fi

  sleep 2
done

echo "Timed out after ${TIMEOUT}s waiting for:" >&2
for spec in "$@"; do
  echo "  - ${spec}" >&2
  if ! check_url "${spec}" 2>/dev/null; then
    echo "    still failing" >&2
    check_url "${spec}" 2>&1 | sed 's/^/      /' >&2 || true
  fi
done
exit 1
