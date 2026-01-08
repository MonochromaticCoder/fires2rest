/**
 * Value Conversion Unit Tests
 */

import { describe, expect, it } from "vitest";
import {
    extractDeleteFields,
    extractFieldTransforms,
    FieldValue,
    fromFirestoreFields,
    fromFirestoreValue,
    GeoPoint,
    isFieldValue,
    Timestamp,
    toFirestoreFields,
    toFirestoreValue,
} from "../src/value.js";

describe("toFirestoreValue", () => {
    it("converts null", () => {
        expect(toFirestoreValue(null)).toEqual({ nullValue: null });
        expect(toFirestoreValue(undefined)).toEqual({ nullValue: null });
    });

    it("converts booleans", () => {
        expect(toFirestoreValue(true)).toEqual({ booleanValue: true });
        expect(toFirestoreValue(false)).toEqual({ booleanValue: false });
    });

    it("converts integers", () => {
        expect(toFirestoreValue(42)).toEqual({ integerValue: "42" });
        expect(toFirestoreValue(-100)).toEqual({ integerValue: "-100" });
        expect(toFirestoreValue(0)).toEqual({ integerValue: "0" });
    });

    it("converts doubles", () => {
        expect(toFirestoreValue(3.14)).toEqual({ doubleValue: 3.14 });
        expect(toFirestoreValue(-0.5)).toEqual({ doubleValue: -0.5 });
    });

    it("converts strings", () => {
        expect(toFirestoreValue("hello")).toEqual({ stringValue: "hello" });
        expect(toFirestoreValue("")).toEqual({ stringValue: "" });
    });

    it("converts dates", () => {
        const date = new Date("2024-01-15T12:00:00Z");
        expect(toFirestoreValue(date)).toEqual({
            timestampValue: "2024-01-15T12:00:00.000Z",
        });
    });

    it("converts Timestamp", () => {
        const timestamp = new Timestamp(1705320000, 0);
        const result = toFirestoreValue(timestamp);
        expect(result).toHaveProperty("timestampValue");
    });

    it("converts GeoPoint", () => {
        const point = new GeoPoint(37.7749, -122.4194);
        expect(toFirestoreValue(point)).toEqual({
            geoPointValue: {
                latitude: 37.7749,
                longitude: -122.4194,
            },
        });
    });

    it("converts arrays", () => {
        expect(toFirestoreValue([1, "two", true])).toEqual({
            arrayValue: {
                values: [
                    { integerValue: "1" },
                    { stringValue: "two" },
                    { booleanValue: true },
                ],
            },
        });
    });

    it("converts objects", () => {
        expect(toFirestoreValue({ name: "test", count: 5 })).toEqual({
            mapValue: {
                fields: {
                    name: { stringValue: "test" },
                    count: { integerValue: "5" },
                },
            },
        });
    });

    it("converts nested objects", () => {
        expect(
            toFirestoreValue({
                user: { name: "Alice", age: 30 },
                tags: ["a", "b"],
            }),
        ).toEqual({
            mapValue: {
                fields: {
                    user: {
                        mapValue: {
                            fields: {
                                name: { stringValue: "Alice" },
                                age: { integerValue: "30" },
                            },
                        },
                    },
                    tags: {
                        arrayValue: {
                            values: [
                                { stringValue: "a" },
                                { stringValue: "b" },
                            ],
                        },
                    },
                },
            },
        });
    });

    it("converts Uint8Array to bytes", () => {
        const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
        expect(toFirestoreValue(bytes)).toEqual({
            bytesValue: "SGVsbG8=", // base64 of "Hello"
        });
    });
});

describe("fromFirestoreValue", () => {
    it("converts null", () => {
        expect(fromFirestoreValue({ nullValue: null })).toBe(null);
    });

    it("converts booleans", () => {
        expect(fromFirestoreValue({ booleanValue: true })).toBe(true);
        expect(fromFirestoreValue({ booleanValue: false })).toBe(false);
    });

    it("converts integers", () => {
        expect(fromFirestoreValue({ integerValue: "42" })).toBe(42);
        expect(fromFirestoreValue({ integerValue: "-100" })).toBe(-100);
    });

    it("converts doubles", () => {
        expect(fromFirestoreValue({ doubleValue: 3.14 })).toBe(3.14);
    });

    it("converts timestamps to Date", () => {
        const result = fromFirestoreValue({
            timestampValue: "2024-01-15T12:00:00.000Z",
        });
        expect(result).toBeInstanceOf(Date);
        expect((result as Date).toISOString()).toBe("2024-01-15T12:00:00.000Z");
    });

    it("converts strings", () => {
        expect(fromFirestoreValue({ stringValue: "hello" })).toBe("hello");
    });

    it("converts bytes", () => {
        const result = fromFirestoreValue({ bytesValue: "SGVsbG8=" });
        expect(result).toBeInstanceOf(Uint8Array);
        expect(Array.from(result as Uint8Array)).toEqual([
            72, 101, 108, 108, 111,
        ]);
    });

    it("converts geopoints", () => {
        const result = fromFirestoreValue({
            geoPointValue: { latitude: 37.7749, longitude: -122.4194 },
        });
        expect(result).toBeInstanceOf(GeoPoint);
        expect((result as GeoPoint).latitude).toBe(37.7749);
        expect((result as GeoPoint).longitude).toBe(-122.4194);
    });

    it("converts arrays", () => {
        expect(
            fromFirestoreValue({
                arrayValue: {
                    values: [{ integerValue: "1" }, { stringValue: "two" }],
                },
            }),
        ).toEqual([1, "two"]);
    });

    it("converts maps", () => {
        expect(
            fromFirestoreValue({
                mapValue: {
                    fields: {
                        name: { stringValue: "test" },
                        count: { integerValue: "5" },
                    },
                },
            }),
        ).toEqual({ name: "test", count: 5 });
    });
});

describe("FieldValue", () => {
    it("creates serverTimestamp sentinel", () => {
        const value = FieldValue.serverTimestamp();
        expect(isFieldValue(value)).toBe(true);
    });

    it("creates delete sentinel", () => {
        const value = FieldValue.delete();
        expect(isFieldValue(value)).toBe(true);
    });

    it("creates increment sentinel", () => {
        const value = FieldValue.increment(5);
        expect(isFieldValue(value)).toBe(true);
    });

    it("creates arrayUnion sentinel", () => {
        const value = FieldValue.arrayUnion("a", "b");
        expect(isFieldValue(value)).toBe(true);
    });

    it("creates arrayRemove sentinel", () => {
        const value = FieldValue.arrayRemove("x");
        expect(isFieldValue(value)).toBe(true);
    });
});

describe("extractFieldTransforms", () => {
    it("extracts serverTimestamp transform", () => {
        const data = {
            name: "test",
            createdAt: FieldValue.serverTimestamp(),
        };
        const transforms = extractFieldTransforms(data);
        expect(transforms).toHaveLength(1);
        expect(transforms[0].fieldPath).toBe("createdAt");
        expect(transforms[0].setToServerValue).toBe("REQUEST_TIME");
    });

    it("extracts increment transform", () => {
        const data = {
            count: FieldValue.increment(5),
        };
        const transforms = extractFieldTransforms(data);
        expect(transforms).toHaveLength(1);
        expect(transforms[0].fieldPath).toBe("count");
        expect(transforms[0].increment).toEqual({ integerValue: "5" });
    });

    it("extracts nested transforms", () => {
        const data = {
            stats: {
                views: FieldValue.increment(1),
            },
        };
        const transforms = extractFieldTransforms(data);
        expect(transforms).toHaveLength(1);
        expect(transforms[0].fieldPath).toBe("stats.views");
    });
});

describe("extractDeleteFields", () => {
    it("extracts delete field paths", () => {
        const data = {
            name: "test",
            obsoleteField: FieldValue.delete(),
        };
        const deletePaths = extractDeleteFields(data);
        expect(deletePaths).toEqual(["obsoleteField"]);
    });

    it("extracts nested delete fields", () => {
        const data = {
            user: {
                oldName: FieldValue.delete(),
            },
        };
        const deletePaths = extractDeleteFields(data);
        expect(deletePaths).toEqual(["user.oldName"]);
    });
});

describe("GeoPoint", () => {
    it("creates valid geopoint", () => {
        const point = new GeoPoint(37.7749, -122.4194);
        expect(point.latitude).toBe(37.7749);
        expect(point.longitude).toBe(-122.4194);
    });

    it("throws for invalid latitude", () => {
        expect(() => new GeoPoint(91, 0)).toThrow("Latitude must be between");
        expect(() => new GeoPoint(-91, 0)).toThrow("Latitude must be between");
    });

    it("throws for invalid longitude", () => {
        expect(() => new GeoPoint(0, 181)).toThrow("Longitude must be between");
        expect(() => new GeoPoint(0, -181)).toThrow(
            "Longitude must be between",
        );
    });

    it("compares equality", () => {
        const p1 = new GeoPoint(37, -122);
        const p2 = new GeoPoint(37, -122);
        const p3 = new GeoPoint(37, -121);
        expect(p1.isEqual(p2)).toBe(true);
        expect(p1.isEqual(p3)).toBe(false);
    });
});

describe("Timestamp", () => {
    it("creates from Date", () => {
        const date = new Date("2024-01-15T12:00:00Z");
        const timestamp = Timestamp.fromDate(date);
        expect(timestamp.toDate().toISOString()).toBe(
            "2024-01-15T12:00:00.000Z",
        );
    });

    it("creates from milliseconds", () => {
        const timestamp = Timestamp.fromMillis(1705320000000);
        expect(timestamp.toMillis()).toBe(1705320000000);
    });

    it("compares equality", () => {
        const t1 = new Timestamp(1000, 500);
        const t2 = new Timestamp(1000, 500);
        const t3 = new Timestamp(1000, 501);
        expect(t1.isEqual(t2)).toBe(true);
        expect(t1.isEqual(t3)).toBe(false);
    });
});

describe("toFirestoreFields / fromFirestoreFields", () => {
    it("converts and round-trips object", () => {
        const original = {
            name: "Test",
            count: 42,
            active: true,
            tags: ["a", "b"],
        };
        const fields = toFirestoreFields(original);
        const restored = fromFirestoreFields(fields);
        expect(restored).toEqual(original);
    });
});
