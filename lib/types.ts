// Shared contract between the message model, the mock agent, and the chart renderer.

export type ChartType =
  | "bar"
  | "horizontal_bar"
  | "line"
  | "pie"
  | "scatter"

export type VisualizationChoiceType = ChartType | "none";

export interface FormattedChart {
  data: ChartData;
  xlabel?: string;
  ylabel?: string;
}

export interface BarData {
  labels: string[]
  values: { data: number[]; label: string }[]
}

export interface LineData {
  xValues: (number | string)[]
  yValues: { data: number[]; label: string }[]
}

export type PieData = { id: number; value: number; label: string }[]

export interface ScatterData {
  series: { data: { x: number; y: number; id: number }[]; label: string }[]
}

export type ChartData = BarData | LineData | PieData | ScatterData

export interface ChartConfigSpec {
  type: ChartType
  title: string
  xlabel?: string
  ylabel?: string
  data: ChartData
}

export interface AgentResponse {
  sql: string
  result: string
  chartConfig?: ChartConfigSpec
}

export type MessageRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: MessageRole
  // For user messages this is the raw question. For assistant messages it is
  // the markdown `result`.
  content: string
  sql?: string
  chartConfig?: ChartConfigSpec
  error?: string
  // Assistant message still streaming/loading from the backend.
  pending?: boolean
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}
