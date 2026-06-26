#!/usr/bin/env bash
# Sample container CPU and memory usage while a benchmark runs.
set -euo pipefail

DURATION="${1:?duration seconds required}"
OUTPUT="${2:?output csv path required}"
INTERVAL="${3:-1}"
CONTAINERS="${4:-}"

mkdir -p "$(dirname "${OUTPUT}")"
echo "timestamp,container,cpu_percent,mem_usage" > "${OUTPUT}"

read -r -a container_args <<< "${CONTAINERS//,/ }"

end=$((SECONDS + DURATION))
while (( SECONDS < end )); do
  ts="$(date +%s)"
  if (( ${#container_args[@]} > 0 )); then
    stats_cmd=(docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}}")
    stats_cmd+=("${container_args[@]}")
    while IFS= read -r line; do
      [[ -z "${line}" ]] && continue
      echo "${ts},${line}" >> "${OUTPUT}"
    done < <("${stats_cmd[@]}" 2>/dev/null || true)
  else
    while IFS= read -r line; do
      [[ -z "${line}" ]] && continue
      echo "${ts},${line}" >> "${OUTPUT}"
    done < <(docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}}" 2>/dev/null || true)
  fi
  sleep "${INTERVAL}"
done
