import { config } from "dotenv";
import { FieldValue, Firestore } from "../src/index.js";
import { run } from "./shared";

config();

const db = new Firestore({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
});

async function main() {
    await run(db, FieldValue);
}

main().catch(console.error);
