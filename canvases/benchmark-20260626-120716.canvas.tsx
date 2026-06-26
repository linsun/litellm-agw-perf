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

const RUN_ID = "20260626-120716";
const RUN_CONFIG =
  "32 connections · 3s duration · max QPS · 1,104-byte payload · 18 LiteLLM workers · mock OpenAI backend";

const litellm = {
  name: "litellm",
  qps: 3198.48,
  requests: 10186,
  p50: 7.076,
  p90: 17.986,
  p99: 32.192,
  avg: 9.471,
};

const agentgateway = {
  name: "agentgateway",
  qps: 36933.62,
  requests: 110831,
  p50: 0.831,
  p90: 1.533,
  p99: 1.97,
  avg: 0.866,
};

const resources = {
  litellm: {
    avgCpu: 330.79,
    peakCpu: 1075.38,
    avgMemMib: 12093,
    peakMemMib: 12093,
  },
  agentgateway: {
    avgCpu: 104.8,
    peakCpu: 243.02,
    avgMemMib: 22.38,
    peakMemMib: 28.79,
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
    "40–100",
    "100–514",
  ],
  counts: [495, 633, 1310, 3198, 1622, 2391, 413, 101, 5, 18],
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
    "10–17",
  ],
  counts: [25, 125, 595, 5612, 17174, 24762, 22960, 16308, 22858, 403, 7, 2],
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
    delta: `${(resources.litellm.avgCpu / resources.agentgateway.avgCpu).toFixed(1)}× higher`,
  },
  {
    metric: "Peak CPU",
    litellm: `${resources.litellm.peakCpu.toFixed(2)}%`,
    agw: `${resources.agentgateway.peakCpu.toFixed(2)}%`,
    delta: `${(resources.litellm.peakCpu / resources.agentgateway.peakCpu).toFixed(1)}× higher`,
  },
  {
    metric: "Avg memory",
    litellm: `${(resources.litellm.avgMemMib / 1024).toFixed(2)} GiB`,
    agw: `${resources.agentgateway.avgMemMib.toFixed(2)} MiB`,
    delta: `${memRatio.toFixed(0)}× higher`,
  },
  {
    metric: "Peak memory",
    litellm: `${(resources.litellm.peakMemMib / 1024).toFixed(2)} GiB`,
    agw: `${resources.agentgateway.peakMemMib.toFixed(2)} MiB`,
    delta: `${(resources.litellm.peakMemMib / resources.agentgateway.peakMemMib).toFixed(0)}× higher`,
  },
];

export default function BenchmarkResults() {
  return (
    <Stack gap={20} style={{ padding: 20, maxWidth: 1100 }}>
      <Stack gap={6}>
        <H1>litellm vs agentgateway</H1>
        <Text tone="secondary">
          Run {RUN_ID} · {RUN_CONFIG}
        </Text>
        <Text tone="tertiary" size="small">
          Source: fortio 1.73.0 · docker stats · results/{RUN_ID}/
        </Text>
      </Stack>

      <Callout tone="info">
        agentgateway handled {throughputRatio.toFixed(1)}× more requests per second with{" "}
        {p50Ratio.toFixed(1)}× lower median latency, while using ~{memRatio.toFixed(0)}× less memory.
        Both gateways returned HTTP 200 for every request.
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
              Y-axis: requests per second (req/s). X-axis: gateway under test.
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
              Y-axis: end-to-end latency (ms). Lower is better.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <H2>CPU and memory</H2>
      <Text tone="secondary">
        Sampled every 1s via docker stats during the 9s benchmark window (4 samples).
      </Text>

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
              Y-axis: CPU percent (can exceed 100% with multiple cores).
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
              Y-axis: resident memory (MiB). litellm uses ~11.8 GiB with 18 workers.
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
