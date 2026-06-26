#!/usr/bin/env bash
# Summarize docker stats CSV into peak/average CPU and memory per container.
set -eu

CSV="${1:?metrics csv required}"

python3 - "${CSV}" <<'PY'
import csv
import re
import sys
from collections import defaultdict

path = sys.argv[1]
rows = defaultdict(list)

with open(path, newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row["container"]
        cpu = float(row["cpu_percent"].rstrip("%") or 0)
        mem = row["mem_usage"].split("/")[0].strip()
        m = re.match(r"([\d.]+)\s*([KMG]i?B)", mem)
        if not m:
            continue
        val, unit = float(m.group(1)), m.group(2)
        scale = {"B": 1, "KiB": 1024, "MiB": 1024**2, "GiB": 1024**3, "KB": 1000, "MB": 1e6, "GB": 1e9}
        mem_bytes = val * scale.get(unit, 1)
        rows[name].append((cpu, mem_bytes))

print("CONTAINER,SAMPLES,AVG_CPU%,PEAK_CPU%,AVG_MEM,PEAK_MEM")
for name in sorted(rows):
    cpus = [c for c, _ in rows[name]]
    mems = [m for _, m in rows[name]]
    avg_cpu = sum(cpus) / len(cpus)
    peak_cpu = max(cpus)
    avg_mem = sum(mems) / len(mems)
    peak_mem = max(mems)

    def fmt_mem(b):
        for div, suffix in ((1024**3, "GiB"), (1024**2, "MiB"), (1024, "KiB")):
            if b >= div:
                return f"{b / div:.2f}{suffix}"
        return f"{b:.0f}B"

    print(
        f"{name},{len(cpus)},"
        f"{avg_cpu:.2f}%,{peak_cpu:.2f}%,"
        f"{fmt_mem(avg_mem)},{fmt_mem(peak_mem)}"
    )
PY
