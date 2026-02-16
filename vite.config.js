var _a, _b, _c;
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
var basePath = (_c = (_b = (_a = globalThis.process) === null || _a === void 0 ? void 0 : _a.env) === null || _b === void 0 ? void 0 : _b.VITE_BASE_PATH) !== null && _c !== void 0 ? _c : "/";
export default defineConfig({
    base: basePath,
    plugins: [react()],
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"]
    }
});
