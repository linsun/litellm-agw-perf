import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

const LATENCY_RUN = "20260626-114656";
const RESOURCES_RUN = "20260626-115258";
const RUN_CONFIG =
  "32 connections · 3s duration · max QPS · 1,104-byte payload · 18 LiteLLM workers · mock OpenAI backend";

const litellm = {
  name: "litellm",
  qps: 3316.53,
  requests: 10135,
  p50: 7.247,
  p90: 17.665,
  p99: 28.275,
  avg: 9.492,
};

const agentgateway = {
  name: "agentgateway",
  qps: 37264.51,
  requests: 111815,
  p50: 0.819,
  p90: 1.493,
  p99: 1.968,
  avg: 0.858,
};

const resources = {
  litellm: {
    avgCpu: 589.01,
    peakCpu: 1175.1,
    avgMemMib: 11643,
    peakMemMib: 11900,
  },
  agentgateway: {
    avgCpu: 0.08,
    peakCpu: 0.14,
    avgMemMib: 18.39,
    peakMemMib: 27.21,
  },
};

const throughputRatio = agentgateway.qps / litellm.qps;
const p50Ratio = litellm.p50 / agentgateway.p50;
const p99Ratio = litellm.p99 / agentgateway.p99;
const memRatio = resources.litellm.avgMemMib / resources.agentgateway.avgMemMib;

const litellmHistogram = {
  categories: [
    "2.2–3",
    "3–4",
    "4–5",
    "5–7.5",
    "7.5–10",
    "10–20",
    "20–30",
    "30–40",
    "100–597",
  ],
  counts: [375, 529, 1418, 3054, 1764, 2585, 373, 15, 22],
};

const agwHistogram = {
  categories: [
    "≤0.35",
    "0.40–0.45",
    "0.45–0.50",
    "0.50–0.60",
    "0.60–0.70",
    "0.70–0.80",
    "0.80–0.90",
    "0.90–1.0",
    "1–2",
    "2–3",
    "3–4",
    "10–12",
  ],
  counts: [28, 154, 600, 6113, 18611, 25930, 23063, 15681, 21197, 332, 74, 32],
};

const summaryRows = [
  {
    metric: "Throughput",
    litellm: `${litellm.qps.toLocaleString()} req/s`,
    agw: `${agentgateway.qps.toLocaleString()} req/s`,
    delta: `${throughputRatio.toFixed(1)}× higher`,
  },
  {
    metric: "Total requests (3s)",
    litellm: litellm.requests.toLocaleString(),
    agw: agentgateway.requests.toLocaleString(),
    delta: `${(agentgateway.requests / litellm.requests).toFixed(1)}× more`,
  },
  {
    metric: "p50 latency",
    litellm: `${litellm.p50.toFixed(2)} ms`,
    agw: `${agentgateway.p50.toFixed(2)} ms`,
    delta: `${p50Ratio.toFixed(1)}× lower`,
  },
  {
    metric: "p90 latency",
    litellm: `${litellm.p90.toFixed(2)} ms`,
    agw: `${agentgateway.p90.toFixed(2)} ms`,
    delta: `${(litellm.p90 / agentgateway.p90).toFixed(1)}× lower`,
  },
  {
    metric: "p99 latency",
    litellm: `${litellm.p99.toFixed(2)} ms`,
    agw: `${agentgateway.p99.toFixed(2)} ms`,
    delta: `${p99Ratio.toFixed(1)}× lower`,
  },
  {
    metric: "Mean latency",
    litellm: `${litellm.avg.toFixed(2)} ms`,
    agw: `${agentgateway.avg.toFixed(2)} ms`,
    delta: `${(litellm.avg / agentgateway.avg).toFixed(1)}× lower`,
  },
];

const resourceRows = [
  {
    metric: "Avg CPU",
    litellm: `${resources.litellm.avgCpu.toFixed(2)}%`,
    agw: `${resources.agentgateway.avgCpu.toFixed(2)}%`,
    delta: `${(resources.litellm.avgCpu / resources.agentgateway.avgCpu).toFixed(0)}× lower`,
  },
  {
    metric: "Peak CPU",
    litellm: `${resources.litellm.peakCpu.toFixed(2)}%`,
    agw: `${resources.agentgateway.peakCpu.toFixed(2)}%`,
    delta: `${(resources.litellm.peakCpu / resources.agentgateway.peakCpu).toFixed(0)}× lower`,
  },
  {
    metric: "Avg memory",
    litellm: `${(resources.litellm.avgMemMib / 1024).toFixed(2)} GiB`,
    agw: `${resources.agentgateway.avgMemMib.toFixed(2)} MiB`,
    delta: `${memRatio.toFixed(0)}× lower`,
  },
  {
    metric: "Peak memory",
    litellm: `${(resources.litellm.peakMemMib / 1024).toFixed(2)} GiB`,
    agw: `${resources.agentgateway.peakMemMib.toFixed(2)} MiB`,
    delta: `${(resources.litellm.peakMemMib / resources.agentgateway.peakMemMib).toFixed(0)}× lower`,
  },
];

export default function BenchmarkResults() {
  return (
    <Stack gap={20} style={{ padding: 20, maxWidth: 1100 }}>
      <Stack gap={6}>
        <H1>litellm vs agentgateway</H1>
        <Text tone="secondary">
          Latency run {LATENCY_RUN} · {RUN_CONFIG}
        </Text>
        <Text tone="tertiary" size="small">
          Latency source: fortio 1.73.0 · results/{LATENCY_RUN}/fortio-*.json · CPU/memory
          source: docker stats · results/{RESOURCES_RUN}/metrics-1024.csv
        </Text>
      </Stack>

      <Callout tone="info">
        agentgateway handled {throughputRatio.toFixed(1)}× more requests per second with{" "}
        {p50Ratio.toFixed(1)}× lower median latency. Under load it also used ~{memRatio.toFixed(0)}×
        less memory and far less CPU than litellm (18 workers).
      </Callout>

      <Grid columns={4} gap={12}>
        <Stat
          label="Throughput (agentgateway)"
          value={`${Math.round(agentgateway.qps).toLocaleString()} req/s`}
          tone="success"
        />
        <Stat
          label="Throughput (litellm)"
          value={`${Math.round(litellm.qps).toLocaleString()} req/s`}
        />
        <Stat
          label="Avg memory (agentgateway)"
          value={`${resources.agentgateway.avgMemMib.toFixed(1)} MiB`}
          tone="success"
        />
        <Stat
          label="Avg memory (litellm)"
          value={`${(resources.litellm.avgMemMib / 1024).toFixed(1)} GiB`}
          tone="warning"
        />
      </Grid>

      <H2>Throughput and latency</H2>
      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing="req/s">Throughput comparison</CardHeader>
          <CardBody>
            <BarChart
              categories={[litellm.name, agentgateway.name]}
              series={[{ name: "Requests per second", data: [litellm.qps, agentgateway.qps] }]}
              valueSuffix=" req/s"
              showValues
              height={220}
            />
            <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
              Y-axis: requests per second (req/s). Run {LATENCY_RUN}.
            </Text>
          </CardBody>
        </Card>

        <Card>
          <CardHeader trailing="ms">Latency percentiles</CardHeader>
          <CardBody>
            <BarChart
              categories={["p50", "p90", "p99"]}
              series={[
                { name: litellm.name, data: [litellm.p50, litellm.p90, litellm.p99], tone: "warning" },
                {
                  name: agentgateway.name,
                  data: [agentgateway.p50, agentgateway.p90, agentgateway.p99],
                  tone: "success",
                },
              ]}
              valueSuffix=" ms"
              height={220}
            />
            <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
              Y-axis: end-to-end latency (ms). Lower is better. Run {LATENCY_RUN}.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <H2>CPU and memory</H2>
      <Callout tone="neutral" title="Metrics note">
        Run {LATENCY_RUN} did not capture CPU/memory (docker stats template bug on macOS, now
        fixed). Resource data below is from a repeat run ({RESOURCES_RUN}) with the same
        configuration, sampled every 1s during the 6s benchmark window.
      </Callout>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing="% of one core">CPU usage under load</CardHeader>
          <CardBody>
            <BarChart
              categories={["Average", "Peak"]}
              series={[
                {
                  name: litellm.name,
                  data: [resources.litellm.avgCpu, resources.litellm.peakCpu],
                  tone: "warning",
                },
                {
                  name: agentgateway.name,
                  data: [resources.agentgateway.avgCpu, resources.agentgateway.peakCpu],
                  tone: "success",
                },
              ]}
              valueSuffix="%"
              height={220}
            />
            <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
              Y-axis: CPU percent (can exceed 100% with multiple cores). Run {RESOURCES_RUN}.
            </Text>
          </CardBody>
        </Card>

        <Card>
          <CardHeader trailing="MiB">Memory usage under load</CardHeader>
          <CardBody>
            <BarChart
              categories={["Average", "Peak"]}
              series={[
                {
                  name: litellm.name,
                  data: [resources.litellm.avgMemMib, resources.litellm.peakMemMib],
                  tone: "warning",
                },
                {
                  name: agentgateway.name,
                  data: [resources.agentgateway.avgMemMib, resources.agentgateway.peakMemMib],
                  tone: "success",
                },
              ]}
              valueSuffix=" MiB"
              height={220}
            />
            <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
              Y-axis: resident memory (MiB). litellm uses ~11 GiB with 18 workers. Run{" "}
              {RESOURCES_RUN}.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <H2>Latency distributions</H2>
      <Text tone="secondary">
        Request-count histogram buckets from fortio. agentgateway clusters sub-millisecond;
        litellm spans single-digit to tens of milliseconds.
      </Text>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing={`${litellm.requests.toLocaleString()} req`}>
            litellm latency histogram
          </CardHeader>
          <CardBody>
            <BarChart
              categories={litellmHistogram.categories}
              series={[{ name: "Request count", data: litellmHistogram.counts, tone: "warning" }]}
              height={240}
            />
            <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
              X-axis: latency bucket (ms). Y-axis: request count.
            </Text>
          </CardBody>
        </Card>

        <Card>
          <CardHeader trailing={`${agentgateway.requests.toLocaleString()} req`}>
            agentgateway latency histogram
          </CardHeader>
          <CardBody>
            <BarChart
              categories={agwHistogram.categories}
              series={[{ name: "Request count", data: agwHistogram.counts, tone: "success" }]}
              height={240}
            />
            <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
              X-axis: latency bucket (ms). Y-axis: request count.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Latency summary</CardHeader>
          <CardBody style={{ padding: 0 }}>
            <Table
              headers={["Metric", "litellm", "agentgateway", "agentgateway vs litellm"]}
              rows={summaryRows.map((row) => [row.metric, row.litellm, row.agw, row.delta])}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>CPU and memory summary</CardHeader>
          <CardBody style={{ padding: 0 }}>
            <Table
              headers={["Metric", "litellm", "agentgateway", "agentgateway vs litellm"]}
              rows={resourceRows.map((row) => [row.metric, row.litellm, row.agw, row.delta])}
            />
          </CardBody>
        </Card>
      </Grid>
    </Stack>
  );
}
