"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  adaptChart,
  CATEGORY_KEY,
  describeChart,
  type AdaptedChart,
} from "@/lib/chart-adapter"
import type { ChartConfigSpec } from "@/lib/types"

const AXIS_TICK = { fontSize: 11 }

function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        The query returned no rows to visualize.
      </p>
    </div>
  )
}

function CartesianChart({
  spec,
  adapted,
}: {
  spec: ChartConfigSpec
  adapted: Extract<AdaptedChart, { kind: "cartesian" }>
}) {
  const horizontal = spec.type === "horizontal_bar"
  const isLine = spec.type === "line"

  if (isLine) {
    return (
      <ChartContainer config={adapted.config} className="h-[280px] w-full">
        <LineChart data={adapted.rows} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey={CATEGORY_KEY}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={AXIS_TICK}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={44}
            tick={AXIS_TICK}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {adapted.series.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {adapted.series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              type="monotone"
              stroke={`var(--color-${s.key})`}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0, fill: `var(--color-${s.key})` }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={adapted.config} className="h-[280px] w-full">
      <BarChart
        data={adapted.rows}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ left: 4, right: 12, top: 8 }}
      >
        <CartesianGrid
          vertical={horizontal}
          horizontal={!horizontal}
          strokeDasharray="3 3"
        />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
            />
            <YAxis
              type="category"
              dataKey={CATEGORY_KEY}
              tickLine={false}
              axisLine={false}
              width={100}
              tick={AXIS_TICK}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={CATEGORY_KEY}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={AXIS_TICK}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={44}
              tick={AXIS_TICK}
            />
          </>
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        {adapted.series.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
        {adapted.series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={`var(--color-${s.key})`}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

function PieChartView({
  adapted,
}: {
  adapted: Extract<AdaptedChart, { kind: "pie" }>
}) {
  return (
    <ChartContainer
      config={adapted.config}
      className="mx-auto aspect-square h-[280px]"
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie
          data={adapted.rows}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={104}
          paddingAngle={2}
          strokeWidth={2}
        >
          {adapted.rows.map((row) => (
            <Cell key={row.name} fill={row.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          className="flex-wrap gap-x-4 gap-y-1"
        />
      </PieChart>
    </ChartContainer>
  )
}

function ScatterChartView({
  spec,
  adapted,
}: {
  spec: ChartConfigSpec
  adapted: Extract<AdaptedChart, { kind: "scatter" }>
}) {
  return (
    <ChartContainer config={adapted.config} className="h-[280px] w-full">
      <ScatterChart margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name={spec.xlabel ?? "x"}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={AXIS_TICK}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={spec.ylabel ?? "y"}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={48}
          tick={AXIS_TICK}
        />
        <ZAxis range={[60, 60]} />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={<ChartTooltipContent />}
        />
        {adapted.series.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
        {adapted.series.map((s) => (
          <Scatter
            key={s.key}
            name={s.label}
            data={s.points}
            fill={`var(--color-${s.key})`}
          />
        ))}
      </ScatterChart>
    </ChartContainer>
  )
}

export function ChartRenderer({ spec }: { spec: ChartConfigSpec }) {
  const adapted = adaptChart(spec)

  return (
    <figure className="mt-3 rounded-xl border border-border bg-card p-4 shadow-blue-soft">
      <figcaption className="mb-3 flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">
          {spec.title}
        </span>
        {(spec.xlabel || spec.ylabel) && spec.type !== "pie" && (
          <span className="text-xs text-muted-foreground">
            {spec.ylabel}
            {spec.ylabel && spec.xlabel ? " vs " : ""}
            {spec.xlabel}
          </span>
        )}
      </figcaption>

      {adapted.empty ? (
        <EmptyState title={spec.title} />
      ) : adapted.kind === "cartesian" ? (
        <CartesianChart spec={spec} adapted={adapted} />
      ) : adapted.kind === "pie" ? (
        <PieChartView adapted={adapted} />
      ) : (
        <ScatterChartView spec={spec} adapted={adapted} />
      )}

      <span className="sr-only">{describeChart(spec)}</span>
    </figure>
  )
}
