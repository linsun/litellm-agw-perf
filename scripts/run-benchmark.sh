#!/usr/bin/env bash
# End-to-end performance benchmark for LiteLLM and agentgateway.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_DIR="${RESULTS_DIR:-${ROOT}/results}"
PAYLOAD_SIZES="${PAYLOAD_SIZES:-1024}"
CONNECTIONS="${CONNECTIONS:-32}"
QPS="${QPS:-0}"
DURATION="${DURATION:-3}"
TOOL="${TOOL:-fortio}"
LITELLM_WORKERS="${LITELLM_WORKERS:-}"
KEEP_RUNNING="${KEEP_RUNNING:-false}"
COMPOSE_FILE="${ROOT}/docker-compose.yml"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Runs LiteLLM and agentgateway against a mock OpenAI backend, measures
throughput/latency (via fortio) and CPU/memory (via docker stats).

Options:
  -s, --payload-sizes   Comma-separated payload sizes in chars (default: 1024)
  -c, --connections     Concurrent connections (default: 32)
  -q, --qps             Target QPS, 0 = max (default: 0)
  -d, --duration        Benchmark duration in seconds (default: 3)
  -t, --tool            Load generator: fortio, hey, oha, wrk (default: fortio)
  -w, --workers         LiteLLM worker count (default: CPU count)
  --skip-up             Skip docker compose up (services already running)
  --skip-down           Leave containers running after the benchmark
  -h, --help            Show this help

Environment:
  RESULTS_DIR           Output directory (default: ./results)
  PAYLOAD_FILE          Deprecated; mock payload is written to MOCK_SERVER_ENV_FILE
  MOCK_SERVER_ENV_FILE    Env file for hyper-server (set automatically by run-benchmark.sh)

Examples:
  $(basename "$0")
  $(basename "$0") -s 1024,4096 -c 32 -d 10 -q 0
  $(basename "$0") --skip-up --skip-down -d 5
EOF
}

SKIP_UP=false
SKIP_DOWN=false

while (( "$#" )); do
  case "$1" in
    -s|--payload-sizes) PAYLOAD_SIZES="$2"; shift 2 ;;
    -c|--connections) CONNECTIONS="$2"; shift 2 ;;
    -q|--qps) QPS="$2"; shift 2 ;;
    -d|--duration) DURATION="$2"; shift 2 ;;
    -t|--tool) TOOL="$2"; shift 2 ;;
    -w|--workers) LITELLM_WORKERS="$2"; shift 2 ;;
    --skip-up) SKIP_UP=true; shift ;;
    --skip-down) SKIP_DOWN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "${LITELLM_WORKERS}" ]]; then
  LITELLM_WORKERS="$(sysctl -n hw.ncpu 2>/dev/null || nproc)"
fi

export RESULTS_DIR
mkdir -p "${RESULTS_DIR}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need_cmd docker
need_cmd jq
need_cmd column
need_cmd "${TOOL}"

RUN_ID="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="${RESULTS_DIR}/${RUN_ID}"
mkdir -p "${RUN_DIR}"

echo "==> Run ID: ${RUN_ID}"
echo "==> Results: ${RUN_DIR}"
echo "==> LiteLLM workers: ${LITELLM_WORKERS}"

for size in ${PAYLOAD_SIZES//,/ }; do
  "${ROOT}/scripts/generate-payloads.sh" "${size}"
done

compose_down() {
  if [[ "${SKIP_DOWN}" == "true" ]]; then
    return
  fi
  docker compose -f "${COMPOSE_FILE}" down --remove-orphans >/dev/null 2>&1 || true
}

if [[ "${SKIP_DOWN}" != "true" ]]; then
  trap compose_down EXIT
fi

if [[ "${SKIP_UP}" != "true" ]]; then
  compose_down
fi

LATENCY_SUMMARY="${RUN_DIR}/latency.csv"
echo "DEST,CLIENT,QPS,CONS,DUR,PAYLOAD,SUCCESS,THROUGHPUT,P50,P90,P99" > "${LATENCY_SUMMARY}"
METRICS_SUMMARY="${RUN_DIR}/resources.csv"
echo "PAYLOAD,CONTAINER,SAMPLES,AVG_CPU%,PEAK_CPU%,AVG_MEM,PEAK_MEM" > "${METRICS_SUMMARY}"

for size in ${PAYLOAD_SIZES//,/ }; do
  REQ_FILE="${ROOT}/payloads/req-${size}.json"
  RESP_FILE="${ROOT}/payloads/resp-${size}.json"

  if [[ ! -f "${REQ_FILE}" || ! -f "${RESP_FILE}" ]]; then
    echo "Missing payload files for size ${size}" >&2
    exit 1
  fi

  echo "==> Benchmarking payload size ${size} bytes"

  if [[ "${SKIP_UP}" != "true" ]]; then
    MOCK_SERVER_ENV="${RUN_DIR}/mock-server-${size}.env"
    "${ROOT}/scripts/write-mock-server-env.sh" "${RESP_FILE}" "${MOCK_SERVER_ENV}"
    export MOCK_SERVER_ENV_FILE="${MOCK_SERVER_ENV}"
    export LITELLM_WORKERS
    docker compose -f "${COMPOSE_FILE}" up -d
    "${ROOT}/scripts/wait-for-urls.sh" 300 \
      "http://127.0.0.1:8081/" \
      "http://127.0.0.1:4000/health/liveliness" \
      "POST:http://127.0.0.1:4001/v1/chat/completions|${REQ_FILE}"
    echo "==> All services ready"
  fi

  METRICS_FILE="${RUN_DIR}/metrics-${size}.csv"
  # bt benchmarks litellm then agentgateway sequentially.
  METRICS_DURATION=$((DURATION * 2 + 3))
  "${ROOT}/scripts/collect-metrics.sh" \
    "${METRICS_DURATION}" \
    "${METRICS_FILE}" \
    1 \
    "perf-litellm,perf-agentgateway,perf-mock-server" &
  METRICS_PID=$!

  LATENCY_FILE="${RUN_DIR}/latency-${size}.csv"
  cat "${REQ_FILE}" | RESULTS_DIR="${RUN_DIR}" "${ROOT}/scripts/bt" \
    -d "${DURATION}" \
    -c "${CONNECTIONS}" \
    -q "${QPS}" \
    -t "${TOOL}" \
    --csv \
    --payload-content \
    "http://127.0.0.1:4000/v1/chat/completions#litellm,http://127.0.0.1:4001/v1/chat/completions#agentgateway" \
    | tee "${LATENCY_FILE}"

  wait "${METRICS_PID}" || true

  tail -n +2 "${LATENCY_FILE}" >> "${LATENCY_SUMMARY}"

  METRICS_AGG="${RUN_DIR}/metrics-${size}-summary.txt"
  "${ROOT}/scripts/summarize-metrics.sh" "${METRICS_FILE}" | tee "${METRICS_AGG}"
  tail -n +2 "${METRICS_AGG}" | while IFS=',' read -r container samples avg_cpu peak_cpu avg_mem peak_mem; do
    echo "${size},${container},${samples},${avg_cpu},${peak_cpu},${avg_mem},${peak_mem}" >> "${METRICS_SUMMARY}"
  done

  if [[ "${SKIP_UP}" != "true" && "${SKIP_DOWN}" != "true" ]]; then
    docker compose -f "${COMPOSE_FILE}" down --remove-orphans >/dev/null
  fi
done

echo
echo "==> Latency / throughput"
column -ts, "${LATENCY_SUMMARY}"

echo
echo "==> CPU / memory"
column -ts, "${METRICS_SUMMARY}"

echo
echo "Full results written to ${RUN_DIR}"
