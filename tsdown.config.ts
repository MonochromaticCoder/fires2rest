import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["./src/index.ts"],
    dts: {
        sourcemap: true,
        compilerOptions: {
            isolatedDeclarations: true,
        },
    },
    clean: true,
    exports: true,
    platform: "neutral",
});
