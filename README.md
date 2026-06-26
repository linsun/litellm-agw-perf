# litellm vs agentgateway performance benchmark

Compare **litellm** and **agentgateway** proxy overhead under load: throughput, latency, CPU, and memory. Both gateways forward chat completion requests to a local mock OpenAI backend so results reflect proxy performance only (no real model inference or external API calls).

## Architecture

```
fortio (bt) ──► litellm :4000 ──┐
                                 ├──► mock-server (hyper-server) :8081
fortio (bt) ──► agentgateway :4001 ──┘
```

| Component | Role |
|-----------|------|
| `perf-mock-server` | Fake OpenAI API — returns a fixed JSON response for every request |
| `perf-litellm` | [LiteLLM](https://github.com/BerriAI/litellm) proxy on port 4000 |
| `perf-agentgateway` | [agentgateway](https://github.com/agentgateway/agentgateway) on port 4001 |
| `scripts/bt` | Load generator wrapper around [fortio](https://fortio.org/) |

## Prerequisites

- **Docker** and **Docker Compose**
- **[fortio](https://github.com/fortio/fortio)** — `go install fortio.org/fortio@latest`
- **jq**, **curl**, **column** (usually pre-installed on macOS/Linux)
- **uv** or **python3** — for generating request/response payloads (`uv` recommended)

```bash
# macOS
brew install go jq
go install fortio.org/fortio@latest

# verify
docker compose version
fortio version
jq --version
```

## Quick start

```bash
git clone https://github.com/linsun/litellm-agw-perf.git
cd litellm-agw

# one-command benchmark (starts stack, runs load, collects metrics, tears down)
./scripts/run-benchmark.sh
```

Output is written to `results/<run-id>/`. The script prints latency/throughput and CPU/memory tables when finished.

### Default settings

| Parameter | Default | Notes |
|-----------|---------|-------|
| Payload size | 1024 chars | JSON chat completion body |
| Connections | 32 | Concurrent fortio threads |
| Duration | 3s | Per gateway (litellm then agentgateway) |
| QPS | 0 (max) | As fast as possible |
| LiteLLM workers | CPU count | Set via `DEFAULT_NUM_WORKERS_LITELLM_PROXY` |

## Running benchmarks

### Full run (recommended)

```bash
./scripts/run-benchmark.sh
```

### Custom parameters

```bash
# larger payloads, longer run, fewer litellm workers
./scripts/run-benchmark.sh -s 1024,4096 -c 32 -d 10 -q 0 -w 8

# fixed QPS instead of max throughput
./scripts/run-benchmark.sh -q 500 -d 30

# leave containers running after the benchmark
./scripts/run-benchmark.sh --skip-down
```

### Options

```
-s, --payload-sizes   Comma-separated payload sizes in chars (default: 1024)
-c, --connections     Concurrent connections (default: 32)
-q, --qps             Target QPS, 0 = max (default: 0)
-d, --duration        Benchmark duration in seconds per gateway (default: 3)
-t, --tool            Load generator: fortio, hey, oha, wrk (default: fortio)
-w, --workers         LiteLLM worker count (default: CPU count)
--skip-up             Skip docker compose up (services already running)
--skip-down           Leave containers running after the benchmark
```

### Manual / piecemeal

```bash
# 1. Generate payloads
./scripts/generate-payloads.sh 1024

# 2. Start the stack
./scripts/write-mock-server-env.sh payloads/resp-1024.json /tmp/mock-server.env
export MOCK_SERVER_ENV_FILE=/tmp/mock-server.env
export LITELLM_WORKERS=$(nproc)   # or: sysctl -n hw.ncpu on macOS
docker compose up -d

# 3. Wait for readiness
./scripts/wait-for-urls.sh 300 \
  "http://127.0.0.1:8081/" \
  "http://127.0.0.1:4000/health/liveliness" \
  "POST:http://127.0.0.1:4001/v1/chat/completions|payloads/req-1024.json"

# 4. Run load test against both gateways
cat payloads/req-1024.json | ./scripts/bt -d 3 -c 32 -q 0 --csv --payload-content \
  "http://127.0.0.1:4000/v1/chat/completions#litellm,http://127.0.0.1:4001/v1/chat/completions#agentgateway"

# 5. Tear down
docker compose down
```

## Results

Each run creates a timestamped directory:

```
results/20260626-115258/
├── latency.csv                 # combined latency / throughput summary
├── latency-1024.csv            # per-run CSV from bt
├── fortio-litellm.json         # full fortio report (histograms, percentiles)
├── fortio-agentgateway.json
├── metrics-1024.csv            # docker stats time series (1 sample/sec)
├── metrics-1024-summary.txt    # avg/peak CPU and memory per container
└── resources.csv               # CPU/memory summary across payload sizes
```

### Inspect results

```bash
RUN=results/20260626-115258

# latency summary
column -ts, "$RUN/latency.csv"

# CPU / memory
column -ts, "$RUN/resources.csv"

# fortio percentiles and QPS
jq '{qps: .ActualQPS, p50: .DurationHistogram.Percentiles[0].Value, p99: .DurationHistogram.Percentiles[3].Value}' \
  "$RUN/fortio-litellm.json" "$RUN/fortio-agentgateway.json"
```

### What gets measured

| Metric | Source |
|--------|--------|
| Throughput (QPS) | fortio `ActualQPS` |
| Latency (p50/p90/p99) | fortio `DurationHistogram.Percentiles` |
| CPU (avg/peak %) | `docker stats` during benchmark |
| Memory (avg/peak) | `docker stats` during benchmark |

CPU/memory is sampled every 1 second for the full benchmark window (both gateways). Containers tracked: `perf-litellm`, `perf-agentgateway`, `perf-mock-server`.

## Visualizing results (Cursor Canvas)

This repo includes an example interactive dashboard as a [Cursor Canvas](https://cursor.com) file. Canvases are live React charts you open beside the editor.

### Open the example canvas

1. Clone this repo and open it in **Cursor**.
2. Copy the example into Cursor's canvases folder (path = absolute repo path with `/` → `-`):

   ```bash
   WORKSPACE_SLUG=$(pwd | sed 's|^/||;s|/|-|g')
   mkdir -p "$HOME/.cursor/projects/$WORKSPACE_SLUG/canvases"
   cp canvases/example.canvas.tsx \
     "$HOME/.cursor/projects/$WORKSPACE_SLUG/canvases/benchmark.canvas.tsx"
   ```

3. Open `benchmark.canvas.tsx` in Cursor — it renders as an interactive panel beside the editor.

### Create a canvas from your own run

Canvases embed data inline (no network calls). After a benchmark:

1. Read your result files:

   ```bash
   RUN=results/<your-run-id>

   cat "$RUN/latency-1024.csv"
   cat "$RUN/metrics-1024-summary.txt"
   jq '.ActualQPS, .DurationHistogram' "$RUN/fortio-litellm.json"
   jq '.ActualQPS, .DurationHistogram' "$RUN/fortio-agentgateway.json"
   ```

2. Copy `canvases/example.canvas.tsx` to a new file, e.g. `canvases/my-run.canvas.tsx`.

3. Update the constants at the top of the file:
   - `litellm` / `agentgateway` — QPS, p50/p90/p99, request counts
   - `resources` — avg/peak CPU and memory (from `metrics-*-summary.txt`)
   - `litellmHistogram` / `agwHistogram` — bucket labels and counts from `fortio-*.json` → `DurationHistogram.Data`

4. Open the `.canvas.tsx` file in Cursor.

You can also ask Cursor AI to generate the canvas from your `results/<run-id>/` directory.

## Sharing results on GitHub

`results/` and `payloads/` are gitignored by default (generated locally). To share:

**Option A — paste in an issue/PR:**

```bash
./scripts/run-benchmark.sh
column -ts, results/*/latency.csv
column -ts, results/*/resources.csv
```

**Option B — commit a specific run** (remove from `.gitignore` or force-add):

```bash
git add -f results/20260626-115258/
git commit -m "Add benchmark results from $(hostname)"
```

**Option C — open a PR** with your machine info:

- OS and CPU count
- `LITELLM_WORKERS` used
- `results/<run-id>/latency.csv` and `resources.csv`
- Optional: screenshot or Cursor canvas export

Please include hardware details — results vary significantly by CPU count and LiteLLM worker settings.

## Configuration

| File | Purpose |
|------|---------|
| `configs/litellm-config.yaml` | Points litellm at `mock-server:8081` |
| `configs/agentgateway.yaml` | Routes `/` to `mock-server:8081` |
| `docker-compose.yml` | Orchestrates all three containers |

### LiteLLM workers

More workers → more throughput but more memory:

```bash
# default: one worker per CPU core
./scripts/run-benchmark.sh -w $(nproc)
```

Equivalent to `DEFAULT_NUM_WORKERS_LITELLM_PROXY` in the original litellm docker run.

### Linux: host networking (optional)

On Linux you can use `--network host` for slightly lower overhead by running containers manually instead of compose port mapping. The default compose setup uses bridge networking and works on macOS and Linux.

## Project layout

```
litellm-agw/
├── README.md
├── docker-compose.yml
├── configs/
│   ├── litellm-config.yaml
│   └── agentgateway.yaml
├── scripts/
│   ├── run-benchmark.sh      # main entrypoint
│   ├── bt                    # fortio/hey/oha/wrk wrapper
│   ├── generate-payloads.sh
│   ├── gen-req.py / gen-resp.py
│   ├── collect-metrics.sh
│   ├── summarize-metrics.sh
│   ├── wait-for-urls.sh
│   └── write-mock-server-env.sh
└── canvases/
    └── example.canvas.tsx    # example Cursor dashboard
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `load: command not found` | Ensure `fortio` is on your `PATH` |
| `Timed out waiting for litellm` | LiteLLM with many workers can take 30s+ to start; wait or reduce `-w` |
| Empty `metrics-*.csv` | Ensure Docker is running; `docker stats` must work for container names `perf-*` |
| `MOCK_SERVER_ENV_FILE must be set` | Use `run-benchmark.sh` or run `write-mock-server-env.sh` before `docker compose up` |
| Very different results between runs | Normal — close other load; note CPU count and worker settings |

## Acknowledgements

Thanks to [John Howard](https://github.com/howardjohn) for sharing the initial benchmark scripts that this repo builds on and the [`hyper-server`](https://github.com/howardjohn/hyper-server) mock OpenAI backend (`howardjohn/hyper-server`).

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).

