import { createClient } from "@libsql/client";
import { settings } from "../config";

/**
 * Executes a SQL query against the SQLite database and returns the rows.
 * @param sqlQuery The SQL string to execute
 * @returns Array of record objects
 */
export async function executeSql(sqlQuery: string): Promise<Record<string, any>[]> {
    const client = createClient({
        url: `file:${settings.dbPath}`
    });

    try {
        const result = await client.execute(sqlQuery);

        if (result.columns.length > 0) {
            return result.rows as unknown as Record<string, any>[];
        } else {
            return [{
                changes: result.rowsAffected,
                lastInsertRowid: result.lastInsertRowid ? result.lastInsertRowid.toString() : null
            }];
        }
    } catch (error) {
        throw error;
    } finally {
        client.close();
    }
}