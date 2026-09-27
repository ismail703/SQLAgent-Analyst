import {
  BarChart3,
  IceCream,
  LineChart,
  PieChart,
  ScatterChart,
} from "lucide-react"

const SUGGESTIONS = [
  {
    icon: LineChart,
    label: "Total revenue",
    prompt: "What is the total revenue generated from all completed orders?",
  },
  {
    icon: BarChart3,
    label: "Best-selling flavors",
    prompt: "What are the top 5 best-selling products by quantity sold?",
  },
  {
    icon: PieChart,
    label: "Sales by category",
    prompt: "Show the distribution of products sold across categories like Cones, Cups, and Gelato",
  },
  {
    icon: LineChart,
    label: "Monthly orders",
    prompt: "How many orders were placed in each month of 2025?",
  },
] as const

export function WelcomeScreen({
  onPick,
}: {
  onPick: (prompt: string) => void
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl gradient-brand text-white shadow-blue-md">
        <IceCream className="size-7" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-foreground">
        Ice Cream Shop Analytics
      </h1>
      <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
        Ask questions about your sales, flavors, stock, and orders. The agent
        generates the SQL, runs the numbers, and charts the answers for you.
      </p>

      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            type="button"
            onClick={() => onPick(prompt)}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-blue-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-blue-md"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:gradient-brand group-hover:text-white">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {prompt}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}