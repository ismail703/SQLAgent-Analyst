import { OllamaEmbeddings } from "@langchain/ollama";
import { settings } from "../config";

export const embedModel = new OllamaEmbeddings({
    model: settings.embeddingModel,
    baseUrl: settings.ollamaBaseUrl,
});