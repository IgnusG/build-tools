import { defineConfig } from "vite";

import dtsPlugin from "./src/vite-plugin-dts.js";
import entriesPlugin, { PluginOptions } from "./src/vite-plugin-entries.js";

const buildConfig: PluginOptions = {
	formats: ["es"],
	entries: [
		{
			sourcePath: "./src/vite-plugin-entries.ts",
		},
		{
			sourcePath: "./src/vite-plugin-dts.ts",
		},
	],
};

export default defineConfig(async () => {
	return {
		plugins: [entriesPlugin(buildConfig), dtsPlugin(buildConfig)],
		cacheDir: ".vite/cache",
		build: {
			target: ["node18"],
			outDir: "dist",
			minify: false,
			rollupOptions: {
				external: [/node:.*/],
			},
		},
	};
});
