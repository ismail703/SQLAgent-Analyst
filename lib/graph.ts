import { StateGraph, END, START } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { writeFileSync } from "fs";

import {
    AgentState,
    VectorDBQueries,
    SemanticCheckResult,
    VisualizationChoice
} from "./states";

import {
    text2SqlDecompositionSystemPrompt,
    getText2SqlGenerationPrompt,
    getText2SqlDebuggerSystemPrompt,
    getText2SqlSemanticSystemPrompt,
    getText2SqlSemanticUserPrompt,
    text2SqlFormatSystemPrompt,
    getText2SqlFormatUserPrompt,
    chooseVisualizationSystemPrompt,
    getChooseVisualizationUserPrompt
} from "./prompts";

import {
    ChartConfigSpec,
    ChartType,
    FormattedChart,
    AgentResponse
} from "./types";

import {
    formatBarData,
    formatLineData,
    formatPieData,
    formatScatterData,
    formatOtherVisualization,
    normalizeRows,
    generateChartTitle
} from "./visualizationUtils";

import { executeSql } from "./services/databaseService";
import { embedModel } from "./services/embeddingService";
import { llm } from "./services/llmService";
import { qdrantClient } from "./services/qdrantService";
import { QdrantVectorStore } from "@langchain/qdrant";

// --- Node Functions ---

async function generateVectDbQuery(state: typeof AgentState.State) {
    console.info(`Entering generateVectDbQuery for question: ${state.question}`);

    const structuredLlm = llm.withStructuredOutput(VectorDBQueries);

    try {
        const queries = await structuredLlm.invoke([
            new SystemMessage(text2SqlDecompositionSystemPrompt),
            new HumanMessage(state.question)
        ]);

        console.debug(`Decomposed queries — schema=${queries.schemaQuery}, value=${queries.valueQuery}, example=${queries.exampleQuery}`);

        return {
            vectQueries: {
                schema: queries.schemaQuery,
                value: queries.valueQuery,
                example: queries.exampleQuery
            }
        };
    } catch (error) {
        console.error("LLM call failed in generateVectDbQuery", error);
        throw error;
    }
}

async function getTableSchema(state: typeof AgentState.State) {
    console.info("Entering getTableSchema");

    const queries = state.vectQueries.schema;

    console.log("Schema queries:", queries);

    const resSchema = new Set<string>();

    const vectorStore = new QdrantVectorStore(embedModel, {
        client: qdrantClient,
        collectionName: "table_schemas",
    });

    const retriever = vectorStore.asRetriever({
        k: 2,
    });

    for (const qText of queries) {
        console.log(
            `Querying vector DB for schema with term: ${qText}`
        );

        try {
            const documents = await retriever.invoke(qText);

            console.log(
                `Retrieved ${documents.length} documents`
            );

            for (const doc of documents) {
                console.log("Document:", doc);

                if (doc.pageContent?.trim()) {
                    resSchema.add(doc.pageContent);
                }
            }

        } catch (error) {
            console.error(
                `Retriever failed for query: ${qText}`,
                error
            );
        }
    }

    console.log(`getTableSchema retrieved ${resSchema.size} unique schema(s)`);

    const finalSchema = Array.from(resSchema).join("\n\n");

    console.log(
        "Final schema:",
        finalSchema
    );

    return { dbResults: [finalSchema] };
}

async function getExamples(state: typeof AgentState.State) {
    console.info("Entering getExamples");
    const queries = state.vectQueries.example;
    const searchTerms = queries.length > 0 ? queries : [state.question];

    const examplesList: string[] = [];
    const seenQuestions = new Set<string>();

    const vectorStore = new QdrantVectorStore(embedModel, {
        client: qdrantClient,
        collectionName: "sql_qa_pairs",
    });

    const retriever = vectorStore.asRetriever({
        k: 2 // Equivalent to limit: 2
    });

    for (const term of searchTerms) {
        try {
            const documents = await retriever.invoke(term);

            for (const doc of documents) {
                const docText = doc.metadata?.question || doc.pageContent || "No question found";
                const sqlCode = doc.metadata?.sql_query || "No SQL found";

                // Deduplicate by the actual question text instead of Qdrant ID
                if (!seenQuestions.has(docText)) {
                    seenQuestions.add(docText);
                    examplesList.push(`Question: ${docText}\nSQL: ${sqlCode}`);
                }
            }
        } catch (error) {
            console.error(`Vector query failed in getExamples for term: ${term}`, error);
            throw error;
        }
    }

    const examplesTxt = examplesList.length > 0
        ? `### Reference Examples:\n\n${examplesList.join("\n\n")}`
        : "No examples found.";

    console.info(`getExamples found ${examplesList.length} example(s)`);
    return { dbResults: [examplesTxt] };
}

async function getUniqueNoun(state: typeof AgentState.State) {
    console.info("Entering getUniqueNoun");
    const searchTerms = state.vectQueries.value;
    const uniqueValueMappings = new Set<string>();

    const vectorStore = new QdrantVectorStore(embedModel, {
        client: qdrantClient,
        collectionName: "categorical_values",
    });

    const retriever = vectorStore.asRetriever({
        k: 4 // Equivalent to limit: 4
    });

    for (const term of searchTerms) {
        try {
            const documents = await retriever.invoke(term);

            for (const doc of documents) {
                const meta = doc.metadata;
                if (meta) {
                    const val = meta.value || "Unknown";
                    const col = meta.column || "Unknown";
                    const tbl = meta.table || "Unknown";

                    uniqueValueMappings.add(`Found Value: '${val}' in Table: ${tbl}, Column: ${col}`);
                }
            }
        } catch (error) {
            console.error(`Vector query failed in getUniqueNoun for term: ${term}`, error);
            throw error;
        }
    }

    let valuesTxt = "No specific categorical value matches found.";
    if (uniqueValueMappings.size > 0) {
        const formattedValues = Array.from(uniqueValueMappings).sort().map(v => `- ${v}`).join("\n");
        valuesTxt = `### Matched Database Values:\n${formattedValues}`;
        console.info(`getUniqueNoun found ${uniqueValueMappings.size} value mapping(s)`);
    }

    console.debug(`getUniqueNoun results:\n${valuesTxt}`);

    return { dbResults: [valuesTxt] };
}
async function generateSql(state: typeof AgentState.State) {
    console.info("Entering generateSql");
    const fullContext = state.dbResults.join("\n\n");
    const prompt = getText2SqlGenerationPrompt(fullContext, state.question);

    try {
        const response = await llm.invoke([prompt]);
        const cleanedSql = (response.content as string)
            .replace(/```sql/gi, "")
            .replace(/```/g, "")
            .trim();

        console.info("Generated SQL candidate");
        console.debug(`Generated SQL:\n${cleanedSql}`);

        return { sqlCandidate: cleanedSql };
    } catch (error) {
        console.error("LLM call failed in generateSql", error);
        throw error;
    }
}

async function syntaxChecker(state: typeof AgentState.State) {
    const currentSql = state.sqlCandidate;
    const retries = state.syntaxRetry || 0;
    console.info(`Entering syntaxChecker (attempt ${retries + 1})`);
    console.debug(`Checking SQL:\n${currentSql}`);

    try {
        // Assuming executeSql is a utility function that handles connection pooling/fetching
        const resultData = await executeSql(currentSql);

        console.info(`syntaxChecker: query executed successfully, ${resultData.length} row(s) returned`);
        return {
            queryResult: JSON.stringify(resultData),
            isSqlModified: false,
            syntaxRetry: 0,
        };
    } catch (exc: any) {
        const errorMsg = exc.message || String(exc);
        console.warn(`syntaxChecker: SQL execution failed on attempt ${retries + 1}: ${errorMsg}`);

        if (retries >= 3) {
            console.error(`syntaxChecker: exhausted retries (3), giving up. Last error: ${errorMsg}`);
            return {
                isSqlModified: false,
                queryResult: `Error: Failed after 3 attempts. Last error: ${errorMsg}`,
                syntaxRetry: 0,
            };
        }

        const fullContext = state.dbResults.join("\n\n");
        const systemPrompt = getText2SqlDebuggerSystemPrompt(fullContext);

        try {
            const response = await llm.invoke([
                new SystemMessage(systemPrompt),
                new HumanMessage(`Original Query: ${currentSql}\nSQLite Error: ${errorMsg}`)
            ]);

            const fixedSql = (response.content as string)
                .replace(/```sql/gi, "")
                .replace(/```/g, "")
                .trim();

            console.info("syntaxChecker: LLM produced a fixed SQL candidate, retrying");
            return {
                sqlCandidate: fixedSql,
                isSqlModified: true,
                syntaxRetry: retries + 1,
            };
        } catch (fixError) {
            console.error("LLM call failed while attempting to fix SQL in syntaxChecker", fixError);
            throw fixError;
        }
    }
}

function shouldContinueSyntax(state: typeof AgentState.State): "syntaxChecker" | "semanticChecker" {
    const nextNode = state.isSqlModified ? "syntaxChecker" : "semanticChecker";
    console.debug(`shouldContinueSyntax routing to: ${nextNode}`);
    return nextNode;
}

async function semanticChecker(state: typeof AgentState.State) {
    const currentSql = state.sqlCandidate;
    const originalQuestion = state.question;
    const semanticRetry = state.semanticRetry ?? 0;

    console.info(
        `Entering semanticChecker (attempt ${semanticRetry + 1})`
    );

    const fullContext = state.dbResults.join("\n\n");
    const structuredLlm = llm.withStructuredOutput(SemanticCheckResult);
    const systemPrompt = getText2SqlSemanticSystemPrompt(fullContext);
    const userPrompt = getText2SqlSemanticUserPrompt(
        originalQuestion,
        currentSql
    );

    try {
        const result = await structuredLlm.invoke([
            new SystemMessage({
                content: systemPrompt
            }),
            new HumanMessage({
                content: userPrompt
            })
        ]);

        console.info(
            "Semantic checker result:",
            JSON.stringify(result, null, 2)
        );

        if (result.isSemanticallyCorrect === true) {
            console.info(
                "semanticChecker: SQL judged semantically correct"
            );

            return {
                isSqlModified: false,
                isSemanticallyVerified: true,
                semanticRetry: 0
            };
        }

        console.warn(
            "semanticChecker: SQL judged semantically incorrect"
        );

        if (result.isSemanticallyCorrect === false && result.correctedSql?.toLowerCase() === "none") {
            console.log(
                "semanticChecker: LLM returned an invalid correctedSql"
            );

            return {
                isSqlModified: false,
                isSemanticallyVerified: false,
                semanticRetry: 0
            };
        }

        // Maximum 1 semantic correction
        if (semanticRetry >= 1) {
            console.error(
                "semanticChecker: exhausted semantic retries, proceeding with current SQL"
            );

            return {
                isSqlModified: false,
                isSemanticallyVerified: false,
                semanticRetry: 0
            };
        }
        if (
            !result.correctedSql ||
            typeof result.correctedSql !== "string" ||
            result.correctedSql.trim().length === 0
        ) {
            console.error(
                "semanticChecker: LLM returned an invalid correctedSql"
            );

            return {
                isSqlModified: false,
                isSemanticallyVerified: false,
                semanticRetry: 0
            };
        }

        console.info(
            "semanticChecker: applying corrected SQL"
        );

        console.debug(
            `Corrected SQL:\n${result.correctedSql}`
        );

        return {
            sqlCandidate: result.correctedSql.trim(),
            isSqlModified: true,
            syntaxRetry: 0,
            semanticRetry: semanticRetry + 1,
            isSemanticallyVerified: false
        };

    } catch (error) {
        console.error(
            "LLM call failed in semanticChecker:",
            error
        );

        throw error;
    }
}

function checkSemanticModification(state: typeof AgentState.State): "syntaxChecker" | "prepareFinal" {
    const nextNode = state.isSqlModified ? "syntaxChecker" : "prepareFinal";
    console.debug(`checkSemanticModification routing to: ${nextNode}`);
    return nextNode;
}

async function prepareFinal(_state: typeof AgentState.State) {
    console.debug("Entering prepareFinal (fan-out to formatResult + chooseVisualization)");
    return {};
}

async function formatResult(state: typeof AgentState.State) {
    console.info("Entering formatResult");
    let answer: string;

    if (state.queryResult?.includes("Error:")) {
        answer = `I'm sorry, I encountered an issue: ${state.queryResult}`;
        console.warn("formatResult: returning error message to user");
    } else {
        const userMessage = getText2SqlFormatUserPrompt(state.question, state.queryResult);

        try {
            const response = await llm.invoke([
                new SystemMessage(text2SqlFormatSystemPrompt),
                new HumanMessage(userMessage)
            ]);
            answer = response.content as string;
        } catch (error) {
            console.error("LLM call failed in formatResult", error);
            throw error;
        }
    }

    console.info(`Query: ${state.sqlCandidate}\nAnswer: ${answer}`);
    return { formattedResult: answer };
}

async function chooseVisualization(state: typeof AgentState.State) {
    console.info("Entering chooseVisualization");

    if (state.queryResult?.includes("Error:")) {
        console.info("chooseVisualization: skipping, query failed");
        return {
            visualization: "none",
            visualizationReason: "No visualization for a failed query."
        };
    }

    const structuredLlm = llm.withStructuredOutput(VisualizationChoice);
    const userPrompt = getChooseVisualizationUserPrompt(
        state.question,
        state.sqlCandidate,
        state.queryResult
    );

    try {
        const result = await structuredLlm.invoke([
            new SystemMessage(chooseVisualizationSystemPrompt),
            new HumanMessage(userPrompt)
        ]);

        console.info(
            `chooseVisualization: recommended '${result.visualization}' — ${result.reason}`
        );

        return {
            visualization: result.visualization,
            visualizationReason: result.reason
        };
    } catch (error) {
        console.error("chooseVisualization: LLM call failed, defaulting to none", error);
        return {
            visualization: "none",
            visualizationReason: "Visualization recommendation failed; defaulting to none."
        };
    }
}

async function formatDataForVisualization(state: typeof AgentState.State) {
    console.info(`Entering formatDataForVisualization (visualization=${state.visualization})`);

    const { visualization, question, sqlCandidate: sqlQuery, queryResult } = state;

    if (!visualization || visualization === "none") {
        return { chartConfig: null };
    }

    let rows: any[];
    try {
        rows = normalizeRows(queryResult);
    } catch (error) {
        console.error("formatDataForVisualization: could not parse queryResult", error);
        return { chartConfig: null };
    }

    if (!rows || rows.length === 0) {
        console.warn("formatDataForVisualization: no rows to visualize");
        return { chartConfig: null };
    }

    const runFormatter = async (): Promise<FormattedChart> => {
        switch (visualization) {
            case "scatter":
                return formatScatterData(rows);
            case "bar":
            case "horizontal_bar":
                return formatBarData(rows, question);
            case "line":
                return formatLineData(rows, question);
            case "pie":
                return formatPieData(rows);
            default:
                return formatOtherVisualization(visualization, question, sqlQuery, rows);
        }
    };

    let formatted: FormattedChart;
    try {
        formatted = await runFormatter();
    } catch (error) {
        console.warn(
            `formatDataForVisualization: structured formatting failed for '${visualization}', falling back to generic formatter`,
            error
        );
        try {
            formatted = await formatOtherVisualization(visualization, question, sqlQuery, rows);
        } catch (fallbackError) {
            console.error(
                "formatDataForVisualization: fallback formatting also failed",
                fallbackError
            );
            return { chartConfig: null };
        }
    }

    const title = await generateChartTitle(question, visualization);

    const chartConfig: ChartConfigSpec = {
        type: visualization as ChartType,
        title,
        ...(formatted.xlabel ? { xlabel: formatted.xlabel } : {}),
        ...(formatted.ylabel ? { ylabel: formatted.ylabel } : {}),
        data: formatted.data
    };

    console.info("data for visualization:", chartConfig.data);

    return { chartConfig };
}


// --- Graph Compilation ---


const workflow = new StateGraph(AgentState)
    .addNode("generateVectDbQuery", generateVectDbQuery)
    .addNode("schemaDb", getTableSchema)
    .addNode("exampleDb", getExamples)
    .addNode("cellValueDb", getUniqueNoun)
    .addNode("generateQuery", generateSql)
    .addNode("syntaxChecker", syntaxChecker)
    .addNode("semanticChecker", semanticChecker)
    .addNode("prepareFinal", prepareFinal)
    .addNode("formatResult", formatResult)
    .addNode("chooseVisualization", chooseVisualization)
    .addNode("formatDataForVisualization", formatDataForVisualization)

    .addEdge(START, "generateVectDbQuery")
    // Parallel execution of vector db queries
    .addEdge("generateVectDbQuery", "schemaDb")
    .addEdge("generateVectDbQuery", "exampleDb")
    .addEdge("generateVectDbQuery", "cellValueDb")

    // Wait for all parallel tasks to finish before generating the query
    .addEdge("schemaDb", "generateQuery")
    .addEdge("exampleDb", "generateQuery")
    .addEdge("cellValueDb", "generateQuery")

    .addEdge("generateQuery", "syntaxChecker")

    // Routing loops
    .addConditionalEdges("syntaxChecker", shouldContinueSyntax, {
        syntaxChecker: "syntaxChecker",
        semanticChecker: "semanticChecker"
    })
    .addConditionalEdges("semanticChecker", checkSemanticModification, {
        syntaxChecker: "syntaxChecker",
        prepareFinal: "prepareFinal"
    })

    // Fan out: text answer and chart both derive from the same finalized SQL
    .addEdge("prepareFinal", "formatResult")
    .addEdge("prepareFinal", "chooseVisualization")
    .addEdge("chooseVisualization", "formatDataForVisualization")

    .addEdge("formatDataForVisualization", END)
    .addEdge("formatResult", END);

export const text2sqlAgent = workflow.compile();

export async function runText2SqlAgent(
    question: string,
    threadId?: string
): Promise<AgentResponse> {
    console.info(`runText2SqlAgent: starting run for question: "${question}"`);

    const invokeConfig = threadId
        ? { configurable: { thread_id: threadId } }
        : undefined;

    const pngBuffer = await text2sqlAgent.getGraph().drawMermaidPng();
    writeFileSync("assets/agent-graph.png", Buffer.from(await pngBuffer.arrayBuffer()));

    try {
        const finalState = await text2sqlAgent.invoke(
            { question } as typeof AgentState.State,
            invokeConfig
        );

        const sql = finalState.sqlCandidate ?? "";
        const result = finalState.formattedResult ?? "";
        const chartConfig =
            finalState.chartConfig && finalState.visualization !== "none"
                ? finalState.chartConfig
                : undefined;

        console.info("runText2SqlAgent: run completed successfully");
        console.debug(`Final SQL:\n${sql}`);
        console.debug(`Final formatted result:\n${result}`);
        console.debug(`Chart config:\n${JSON.stringify(chartConfig)}`);

        return {
            sql,
            result,
            ...(chartConfig ? { chartConfig } : {})
        };
    } catch (error) {
        console.error("runText2SqlAgent: agent run failed", error);

        return {
            sql: "",
            result:
                "I'm sorry, something went wrong while processing your question. Please try again."
        };
    }
}