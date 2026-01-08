/**
 * Fires2REST - Firestore REST API Client
 *
 * A lightweight TypeScript library for Firestore operations via REST API.
 */

// Main client
export { Firestore } from "./client.js";
export { CollectionReference, DocumentReference } from "./references.js";
export { Transaction } from "./transaction.js";

// Value utilities
export {
    FieldValue,
    GeoPoint,
    Timestamp,
    fromFirestoreValue,
    toFirestoreValue,
} from "./value.js";

// Auth utilities
export { createJWT, getFirestoreToken } from "./auth.js";

// Types
export type {
    DocumentData,
    DocumentSnapshot,
    FieldTransform,
    FirestoreDocument,
    FirestoreValue,
    TransactionOptions,
    Write,
    WriteResult,
} from "./types.js";
