import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: false,
		setupFiles: ["src/setup-vitest.ts"],
		environment: "jsdom"
	}
});
