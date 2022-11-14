/// <reference types="vitest" />

import * as url from "node:url";

import { defineConfig } from "vite";

import dtsPlugin from "./src/vite-plugin-dts.js";
import entriesPlugin, { PluginOptions } from "./src/vite-plugin-entries.js";

export const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const buildConfig: PluginOptions = {
	formats: ["es"],
	sourceRoot: "./src",
	entries: [
		{
			sourcePath: "./src/vite-plugin-entries.ts",
		},
		{
			sourcePath: "./src/vite-plugin-dts.ts",
		},
	],
};

export default defineConfig(async (env) => {
	return {
		plugins: [env.mode !== "test" && [entriesPlugin(buildConfig), dtsPlugin(buildConfig)]],
		cacheDir: ".vite/cache",
		build: {
			target: ["node18"],
			sourcemap: true,
			outDir: "./dist",
			minify: false,
			rollupOptions: {
				external: [/node:.*/],
			},
		},
		test: {
			threads: false,
			watchExclude: ["end-2-end/fixtures"],
		},
	};
});
