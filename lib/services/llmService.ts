import { ChatOllama } from "@langchain/ollama";
import { ChatGroq } from "@langchain/groq";
import { settings } from "../config";

export const getLlm = (temperature?: number) => {
    const temp = temperature ?? settings.llmTemperature;

    if (settings.llmProvider.toLowerCase() === "groq") {
        return new ChatGroq({
            model: settings.llmModel,
            apiKey: settings.llmApiKey,
            temperature: temp,
        });
    }

    return new ChatOllama({
        model: settings.llmModel,
        baseUrl: settings.ollamaBaseUrl,
        temperature: temp,
    });
};
export const llm = getLlm();