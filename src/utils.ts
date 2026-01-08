/**
 * Firestore Utility Functions
 */

import type { FirestoreValue } from "./types.js";

/**
 * Regular expression for valid unquoted Firestore field path segments.
 * Unquoted segments must start with a letter or underscore, followed by
 * letters, underscores, or digits.
 */
const SIMPLE_FIELD_PATH_REGEX = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

/**
 * Quote a field path segment if it contains special characters.
 * Segments that don't match the simple identifier pattern must be quoted with backticks.
 */
export function quoteFieldPathSegment(segment: string): string {
    if (SIMPLE_FIELD_PATH_REGEX.test(segment)) {
        return segment;
    }
    // Escape backticks and backslashes in the segment
    const escaped = segment.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
    return `\`${escaped}\``;
}

/**
 * Quote a full field path, handling each segment individually.
 * Splits the path by dots and quotes each segment if needed.
 */
export function quoteFieldPath(path: string): string {
    return path.split(".").map(quoteFieldPathSegment).join(".");
}

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
        const quotedKey = quoteFieldPathSegment(key);
        // Check if key contains dots (dot-notation path)
        if (key.includes(".")) {
            // For dot-notation keys, quote each segment
            paths.push(quoteFieldPath(key));
        } else {
            const fullPath = prefix ? `${prefix}.${quotedKey}` : quotedKey;
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
