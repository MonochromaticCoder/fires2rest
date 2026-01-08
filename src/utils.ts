/**
 * Firestore Utility Functions
 */

import type { FirestoreValue } from "./types.js";

/**
 * Generate a random document ID (20 characters, alphanumeric)
 */
export function generateDocumentId(): string {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 20; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Parse a document path into collection and document ID
 */
export function parseDocumentPath(path: string): {
    collection: string;
    docId: string;
} {
    const parts = path.split("/");
    if (parts.length < 2 || parts.length % 2 !== 0) {
        throw new Error(`Invalid document path: ${path}`);
    }
    return {
        collection: parts.slice(0, -1).join("/"),
        docId: parts[parts.length - 1],
    };
}

/**
 * Extract document ID from full resource name
 */
export function extractDocumentId(name: string): string {
    const parts = name.split("/");
    return parts[parts.length - 1];
}

/**
 * Extract document path from full resource name
 */
export function extractDocumentPath(name: string): string {
    // Format: projects/{project}/databases/{db}/documents/{path}
    const match = name.match(/documents\/(.+)$/);
    return match ? match[1] : name;
}

/**
 * Get all field paths from an object.
 */
export function getFieldPaths(
    obj: Record<string, unknown>,
    prefix = "",
    isFieldValue: (v: unknown) => boolean,
): string[] {
    const paths: string[] = [];
    for (const key of Object.keys(obj)) {
        // Check if key contains dots (dot-notation path)
        if (key.includes(".")) {
            // For dot-notation keys, the entire key is the path
            paths.push(key);
        } else {
            const fullPath = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            if (
                typeof value === "object" &&
                value !== null &&
                !Array.isArray(value) &&
                !(value instanceof Date) &&
                !isFieldValue(value) &&
                Object.keys(value).length > 0 &&
                !("latitude" in value && "longitude" in value)
            ) {
                paths.push(
                    ...getFieldPaths(
                        value as Record<string, unknown>,
                        fullPath,
                        isFieldValue,
                    ),
                );
            } else {
                paths.push(fullPath);
            }
        }
    }
    return paths;
}

/**
 * Build Firestore fields from update data, handling dot-notation paths.
 */
export function buildUpdateFields(
    data: Record<string, unknown>,
    toFirestoreValue: (v: unknown) => FirestoreValue,
    isFieldValue: (v: unknown) => boolean,
): Record<string, FirestoreValue> {
    const fields: Record<string, FirestoreValue> = {};

    for (const [key, value] of Object.entries(data)) {
        // Skip FieldValue sentinels
        if (isFieldValue(value)) {
            continue;
        }

        // Handle dot-notation paths like "user.age"
        if (key.includes(".")) {
            const parts = key.split(".");
            let current = fields;

            // Navigate/create nested structure
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = {
                        mapValue: { fields: {} },
                    };
                }
                const mapVal = current[part] as {
                    mapValue: { fields: Record<string, FirestoreValue> };
                };
                if (!mapVal.mapValue.fields) {
                    mapVal.mapValue.fields = {};
                }
                current = mapVal.mapValue.fields;
            }

            // Set the final value
            current[parts[parts.length - 1]] = toFirestoreValue(value);
        } else {
            // Regular field
            fields[key] = toFirestoreValue(value);
        }
    }

    return fields;
}
