import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

export const settings = {
    llmProvider: process.env.LLM_PROVIDER || "ollama",
    llmModel: process.env.LLM_MODEL || "",
    llmApiKey: process.env.GROQ_API_KEY || "",
    llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || "0.0"),

    embeddingModel: process.env.NEWS_AGENT_EMBEDDING_MODEL || "qwen3-embedding:4b",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",

    qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",

    dbPath: process.env.DB_PATH || path.resolve(process.cwd(), "lib", "ice_cream_shop.db")
};