import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// `npm run content:verify`: native g++ verification of every content package (ARCH §3).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["content/verify/**/*.verify.ts"], testTimeout: 120000, hookTimeout: 120000, fileParallelism: false },
});
