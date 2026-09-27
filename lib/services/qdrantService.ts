import { QdrantClient } from "@qdrant/js-client-rest";
import { settings } from "../config";

export const qdrantClient = new QdrantClient({
    url: settings.qdrantUrl,
});