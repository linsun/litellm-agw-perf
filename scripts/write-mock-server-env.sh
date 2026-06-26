#!/usr/bin/env bash
# Write a docker env_file for howardjohn/hyper-server (distroless, no shell).
set -euo pipefail

RESP_FILE="${1:?response json path required}"
OUT_FILE="${2:?output env file path required}"

python3 - "${RESP_FILE}" "${OUT_FILE}" <<'PY'
import json
import sys

resp_path, out_path = sys.argv[1], sys.argv[2]
payload = open(resp_path, encoding="utf-8").read().rstrip("\n")

with open(out_path, "w", encoding="utf-8") as f:
    f.write("PORT=8081\n")
    f.write(f"PAYLOAD={json.dumps(payload)}\n")
PY
