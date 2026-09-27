import { SystemMessage, HumanMessage } from "@langchain/core/messages";

import {
    ChartData,
    BarData,
    LineData,
    PieData,
    ScatterData,
    FormattedChart
} from "./types";

import { llm } from "./services/llmService";
import { graphInstructions } from "./graphInstructions";


/**
 * Normalizes raw query rows into arrays-of-values regardless of whether
 * executeSql returned rows as arrays (e.g. sqlite raw tuples) or as
 * objects keyed by column name.
 */
export function normalizeRows(queryResult: string): any[] {
    const parsed = JSON.parse(queryResult);
    if (!Array.isArray(parsed)) {
        throw new Error("Query result is not an array of rows");
    }
    return parsed.map((row) => (Array.isArray(row) ? row : Object.values(row)));
}

const isLabelLike = (v: any): boolean =>
    typeof v === "string" && isNaN(parseFloat(v)) && !v.includes("/");

export async function generateLabel(systemPrompt: string, question: string, sampleRows: any[]): Promise<string> {
    const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(
            `Question: ${question}\nData (first few rows): ${JSON.stringify(
                sampleRows.slice(0, 2)
            )}\n\nProvide a concise label.`
        )
    ]);
    return (response.content as string).trim();
}

export async function generateChartTitle(question: string, visualization: string): Promise<string> {
    try {
        const response = await llm.invoke([
            new SystemMessage(
                "You are a data labeling expert. Given a user's question and the chart type chosen to answer it, provide a short, human-readable chart title (a few words, title case, no trailing punctuation)."
            ),
            new HumanMessage(`Question: ${question}\nChart type: ${visualization}\n\nProvide a concise chart title.`)
        ]);
        return (response.content as string).trim();
    } catch (error) {
        console.warn("generateChartTitle: LLM call failed, falling back to the question text", error);
        return question;
    }
}

export async function formatLineData(rows: any[], question: string): Promise<FormattedChart> {
    if (rows[0].length === 2) {
        const xValues = rows.map((r) => String(r[0]));
        const yValues = rows.map((r) => parseFloat(r[1]));
        const label = await generateLabel(
            "You are a data labeling expert. Given a question and some data, provide a concise and relevant label for the data series.",
            question,
            rows
        );
        const data: LineData = { xValues, yValues: [{ data: yValues, label }] };
        return { data, ylabel: label };
    }

    if (rows[0].length === 3) {
        const dataByLabel: Record<string, any[]> = {};
        const xValues: string[] = [];

        const labels = [
            ...new Set(
                rows
                    .filter(([a, b]) => isLabelLike(b) || isLabelLike(a))
                    .map(([a, b]) => (isLabelLike(b) ? b : a))
            )
        ];

        for (const [item1, item2, item3] of rows) {
            let label: string, x: any, y: any;
            if (isLabelLike(item1)) {
                [label, x, y] = [item1, item2, item3];
            } else {
                [x, label, y] = [item1, item2, item3];
            }

            if (!xValues.includes(String(x))) xValues.push(String(x));
            if (!dataByLabel[label]) dataByLabel[label] = [];
            dataByLabel[label].push(parseFloat(y));

            for (const otherLabel of labels) {
                if (otherLabel !== label) {
                    if (!dataByLabel[otherLabel as string]) dataByLabel[otherLabel as string] = [];
                    dataByLabel[otherLabel as string].push(null);
                }
            }
        }

        const yValues = Object.entries(dataByLabel).map(([label, data]) => ({ data, label }));
        const ylabel = await generateLabel(
            "You are a data labeling expert. Given a question and some data, provide a concise and relevant label for the y-axis.",
            question,
            rows
        );

        const data: LineData = { xValues, yValues };
        return { data, ylabel };
    }

    throw new Error("Unexpected data format in results for line chart");
}

export async function formatScatterData(rows: any[]): Promise<FormattedChart> {
    const series: ScatterData["series"] = [];

    if (rows[0].length === 2) {
        series.push({
            data: rows.map(([x, y]: [number, number], i: number) => ({ x, y, id: i + 1 })),
            label: "Data Points"
        });
        return { data: { series } };
    }

    if (rows[0].length === 3) {
        const entities: Record<string, any[]> = {};

        for (const [item1, item2, item3] of rows) {
            let label: string, x: number, y: number;
            if (isLabelLike(item1)) {
                [label, x, y] = [item1, item2, item3];
            } else {
                [x, label, y] = [item1, item2, item3];
            }
            if (!entities[label]) entities[label] = [];
            entities[label].push({ x, y, id: entities[label].length + 1 });
        }

        for (const [label, data] of Object.entries(entities)) {
            series.push({ data, label });
        }
        return { data: { series } };
    }

    throw new Error("Unexpected data format in results for scatter plot");
}

export async function formatBarData(rows: any[], question: string): Promise<FormattedChart> {
    if (rows[0].length === 2) {
        const labels = rows.map((r) => String(r[0]));
        const values = rows.map((r) => parseFloat(r[1]));
        const label = await generateLabel(
            "You are a data labeling expert. Given a question and some data, provide a concise and relevant label for the data series.",
            question,
            rows
        );
        const data: BarData = { labels, values: [{ data: values, label }] };
        return { data, ylabel: label };
    }

    if (rows[0].length === 3) {
        const categories = new Set(rows.map((r) => r[1]));
        const labels = Array.from(categories) as string[];
        const entities = new Set(rows.map((r) => r[0]));
        const values = Array.from(entities).map((entity) => ({
            data: rows.filter((r) => r[0] === entity).map((r) => parseFloat(r[2])),
            label: String(entity)
        }));

        const ylabel = await generateLabel(
            "You are a data labeling expert. Given a question and some data, provide a concise and relevant label for the y-axis.",
            question,
            rows
        );

        const data: BarData = { labels, values };
        return { data, ylabel };
    }

    throw new Error("Unexpected data format in results for bar chart");
}

/**
 * Pie needs one label and one numeric value per row — deterministic, no LLM
 * call required. Picks the first numeric-looking cell as the value and the
 * first non-numeric cell as the label, so it tolerates either
 * (label, value) or (value, label) column ordering.
 */
export async function formatPieData(rows: any[]): Promise<FormattedChart> {
    const data: PieData = rows.map((row, i) => {
        const valueIdx = row.findIndex(
            (v: any) => typeof v === "number" || (typeof v === "string" && !isNaN(parseFloat(v)))
        );
        const labelIdx = row.findIndex((_: any, idx: number) => idx !== valueIdx);

        const rawValue = valueIdx >= 0 ? row[valueIdx] : row[row.length - 1];
        const rawLabel = labelIdx >= 0 ? row[labelIdx] : row[0];

        return {
            id: i,
            value: typeof rawValue === "number" ? rawValue : parseFloat(rawValue),
            label: String(rawLabel)
        };
    });

    return { data };
}

/** Last-resort fallback for any row shape the dedicated formatters reject. */
export async function formatOtherVisualization(
    visualization: string,
    question: string,
    sqlQuery: string,
    rows: any[]
): Promise<FormattedChart> {
    const instructions = graphInstructions[visualization as keyof typeof graphInstructions];

    const response = await llm.invoke([
        new SystemMessage(
            "You are a Data expert who formats data according to the required needs. You are given the question asked by the user, its SQL query, the result of the query and the format you need to format it in."
        ),
        new HumanMessage(
            `For the given question: ${question}\n\nSQL query: ${sqlQuery}\nResult: ${JSON.stringify(
                rows
            )}\n\nUse the following example to structure the data: ${instructions}. Return only the JSON for the "data" field, with no markdown fences or extra commentary.`
        )
    ]);

    const raw = (response.content as string)
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    return { data: JSON.parse(raw) as ChartData };
}
