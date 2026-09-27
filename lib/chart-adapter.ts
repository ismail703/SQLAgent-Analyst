// Isolated adaptation layer: converts the backend `chartConfig` data shapes
// into the `chartData` array + `ChartConfig` object that the shadcn/ui chart
// primitives (Recharts) expect. Keeping this pure and free of JSX makes it
// straightforward to unit test independently of rendering, and lets the
// charting library be swapped without touching the rest of the app.

import type { ChartConfig } from "@/components/ui/chart"
import type {
  BarData,
  ChartConfigSpec,
  LineData,
  PieData,
  ScatterData,
} from "@/lib/types"

// The frontend owns all color decisions. Colors reference the app's blue
// theme tokens (see globals.css). Never wrap `--chart-N` in hsl()/rgb().
export const CHART_PALETTE = [
  "var(--chart-3)",
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-2)",
  "var(--chart-4)",
] as const

export function colorForIndex(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]
}

// A stable, property-safe key for a series (labels may contain spaces/symbols).
function seriesKey(index: number): string {
  return `s${index}`
}

export const CATEGORY_KEY = "__category"

export interface CartesianAdapted {
  kind: "cartesian"
  categoryKey: string
  rows: Record<string, number | string>[]
  series: { key: string; label: string; color: string }[]
  config: ChartConfig
  empty: boolean
}

export interface PieAdapted {
  kind: "pie"
  nameKey: string
  dataKey: string
  rows: { name: string; value: number; fill: string }[]
  config: ChartConfig
  empty: boolean
}

export interface ScatterAdapted {
  kind: "scatter"
  series: {
    key: string
    label: string
    color: string
    points: { x: number; y: number }[]
  }[]
  config: ChartConfig
  empty: boolean
}

export type AdaptedChart = CartesianAdapted | PieAdapted | ScatterAdapted

function adaptBar(data: BarData): CartesianAdapted {
  const values = data.values ?? []
  const labels = data.labels ?? []
  const series = values.map((v, i) => ({
    key: seriesKey(i),
    label: v.label,
    color: colorForIndex(i),
  }))

  const rows = labels.map((label, rowIndex) => {
    const row: Record<string, number | string> = { [CATEGORY_KEY]: label }
    values.forEach((v, i) => {
      row[seriesKey(i)] = v.data?.[rowIndex] ?? 0
    })
    return row
  })

  const config: ChartConfig = {}
  series.forEach((s) => {
    config[s.key] = { label: s.label, color: s.color }
  })

  return {
    kind: "cartesian",
    categoryKey: CATEGORY_KEY,
    rows,
    series,
    config,
    empty: labels.length === 0 || values.length === 0,
  }
}

function adaptLine(data: LineData): CartesianAdapted {
  const yValues = data.yValues ?? []
  const xValues = data.xValues ?? []
  const series = yValues.map((v, i) => ({
    key: seriesKey(i),
    label: v.label,
    color: colorForIndex(i),
  }))

  const rows = xValues.map((x, rowIndex) => {
    const row: Record<string, number | string> = { [CATEGORY_KEY]: x }
    yValues.forEach((v, i) => {
      row[seriesKey(i)] = v.data?.[rowIndex] ?? 0
    })
    return row
  })

  const config: ChartConfig = {}
  series.forEach((s) => {
    config[s.key] = { label: s.label, color: s.color }
  })

  return {
    kind: "cartesian",
    categoryKey: CATEGORY_KEY,
    rows,
    series,
    config,
    empty: xValues.length === 0 || yValues.length === 0,
  }
}

function adaptPie(data: PieData): PieAdapted {
  const slices = data ?? []
  const config: ChartConfig = {}
  // The legend/tooltip resolve config by the slice's `name` value (nameKey),
  // so the config must be keyed by the human-readable label itself.
  const rows = slices.map((slice, i) => {
    config[slice.label] = { label: slice.label, color: colorForIndex(i) }
    return {
      name: slice.label,
      value: slice.value,
      fill: colorForIndex(i),
    }
  })

  return {
    kind: "pie",
    nameKey: "name",
    dataKey: "value",
    rows,
    config,
    empty: slices.length === 0,
  }
}

function adaptScatter(data: ScatterData): ScatterAdapted {
  const rawSeries = data.series ?? []
  const series = rawSeries.map((s, i) => ({
    key: seriesKey(i),
    label: s.label,
    color: colorForIndex(i),
    points: (s.data ?? []).map((p) => ({ x: p.x, y: p.y })),
  }))

  const config: ChartConfig = {}
  series.forEach((s) => {
    config[s.key] = { label: s.label, color: s.color }
  })

  return {
    kind: "scatter",
    series,
    config,
    empty:
      rawSeries.length === 0 ||
      rawSeries.every((s) => (s.data ?? []).length === 0),
  }
}

export function adaptChart(spec: ChartConfigSpec): AdaptedChart {
  switch (spec.type) {
    case "bar":
    case "horizontal_bar":
      return adaptBar(spec.data as BarData)
    case "line":
      return adaptLine(spec.data as LineData)
    case "pie":
      return adaptPie(spec.data as PieData)
    case "scatter":
      return adaptScatter(spec.data as ScatterData)
    default:
      // Exhaustiveness guard; callers should also handle unknown types in UI.
      return {
        kind: "cartesian",
        categoryKey: CATEGORY_KEY,
        rows: [],
        series: [],
        config: {},
        empty: true,
      }
  }
}

// Produces a concise, screen-reader-friendly description of the chart.
export function describeChart(spec: ChartConfigSpec): string {
  const adapted = adaptChart(spec)
  if (adapted.empty) return `${spec.title}: no data to display.`

  switch (adapted.kind) {
    case "cartesian": {
      const seriesNames = adapted.series.map((s) => s.label).join(", ")
      return `${spec.title}. A ${spec.type.replace("_", " ")} chart with ${adapted.rows.length} categories across series: ${seriesNames}.`
    }
    case "pie": {
      const total = adapted.rows.reduce((sum, r) => sum + r.value, 0)
      const parts = adapted.rows
        .map(
          (r) =>
            `${r.name} ${total ? Math.round((r.value / total) * 100) : 0}%`
        )
        .join(", ")
      return `${spec.title}. A pie chart: ${parts}.`
    }
    case "scatter": {
      const count = adapted.series.reduce(
        (sum, s) => sum + s.points.length,
        0
      )
      return `${spec.title}. A scatter chart with ${count} points across ${adapted.series.length} series.`
    }
  }
}
