import { z } from "zod";
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { ChartConfigSpec } from "./types";

// ==========================================
// Supervisor Agent States
// ==========================================

export const SupervisorState = Annotation.Root({
  ...MessagesAnnotation.spec,

  userRequest: Annotation<string>,
  finalResult: Annotation<string>,
  subQuestions: Annotation<string[]>({
    reducer: (x, y) => y,
    default: () => []
  }),

  dataResults: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => []
  })
});

export const Text2SqlRequests = z.object({
  subQuestions: z.array(z.string()).describe("A list of analytical sub-questions to ask"),
  data: z.array(z.string()).describe("A list of data results")
});

// ==========================================
// Text2SQL Agent States
// ==========================================

export const VectorDBQueries = z.object({
  schemaQuery: z.array(z.string())
    .describe("List of queries to fetch schema information (table/column)"),
  valueQuery: z.array(z.string())
    .describe("List of queries for specific data values"),
  exampleQuery: z.array(z.string())
    .describe("List of queries to find similar SQL patterns")
});

export const SemanticCheckResult = z.object({
  reasoning: z.string()
    .describe("Explanation of why the SQL is correct or incorrect based on the user question."),
  isSemanticallyCorrect: z.boolean()
    .describe("True if the SQL perfectly matches the user intent. False if logic needs fixing."),
  correctedSql: z.string().nullable()
    .describe("The fixed SQL query if incorrect. If correct or if no confident fix is possible, return the original SQL string (never null).")
}).strict();

export const VisualizationChoice = z.object({
  visualization: z
    .enum(["bar", "horizontal_bar", "line", "pie", "scatter", "none"])
    .describe(
      "The single best chart type for this question and result data, or 'none' if no visualization is appropriate."
    ),
  reason: z
    .string()
    .describe("Brief explanation for the recommendation.")
    .default("No reason provided.")
}).strict();

export const AgentState = Annotation.Root({
  question: Annotation<string>,

  vectQueries: Annotation<Record<string, string[]>>({
    reducer: (x, y) => y,
    default: () => ({})
  }),

  dbResults: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),

  sqlCandidate: Annotation<string>,
  isSqlModified: Annotation<boolean>({
    reducer: (x, y) => y,
    default: () => false
  }),
  queryResult: Annotation<string>,
  syntaxRetry: Annotation<number>({
    reducer: (x, y) => y,
    default: () => 0
  }),
  semanticRetry: Annotation<number>({
    reducer: (x, y) => y,
    default: () => 0
  }),
  formattedResult: Annotation<string>,
  dataResults: Annotation<string[]>({
    reducer: (x, y) => y,
    default: () => []
  }),
  isSemanticallyVerified: Annotation<boolean>({
    reducer: (x, y) => y,
    default: () => false
  }),
  visualization: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "none"
  }),
  visualizationReason: Annotation<string>({
    reducer: (x, y) => y,
    default: () => ""
  }),
  chartConfig: Annotation<ChartConfigSpec | null>({
    reducer: (x, y) => y,
    default: () => null
  })
});