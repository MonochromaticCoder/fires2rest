---
"fires2rest": patch
---

Fix field path quoting for segments with special characters

Field paths containing segments with special characters (like hyphens, spaces, or characters that don't match the pattern `[a-zA-Z_][a-zA-Z_0-9]*`) are now properly quoted with backticks as required by the Firestore REST API.

This fixes errors like:

```
Invalid property path "itemsSold.item-001". Unquoted property paths must match regex...
```

Added utility functions `quoteFieldPathSegment` and `quoteFieldPath` to handle proper escaping, and updated `getFieldPaths`, `extractFieldTransforms`, `extractDeleteFields`, and `extractTransformFields` to use them.
