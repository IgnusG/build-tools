import path from "path";
import { build, InlineConfig } from "vite";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import entriesPlugin, { PluginOptions } from "../src/vite-plugin-entries.js";
import { __dirname, cleanup, readFile } from "./utilities.js";

const defaultBuidConfig: InlineConfig = {
	cacheDir: ".vite/cache",
	root: path.join(__dirname, "fixtures"),
	build: {
		target: ["node18"],
		outDir: "dist",
		minify: false,
	},
};

describe("vite-plugin-entries", () => {
	beforeEach(() => {
		cleanup();
	});

	afterAll(() => {
		cleanup();
	});

	test("correctly creates the output build files for a simple es configuration", async () => {
		const buildConfig: PluginOptions = {
			formats: ["es"],
			entries: [{ sourcePath: path.join(__dirname, "fixtures/index.ts") }],
		};

		await build({
			...structuredClone(defaultBuidConfig),
			plugins: [entriesPlugin(buildConfig)],
		});

		expect(readFile("fixtures/dist/index.es.js")).toMatchSnapshot();

		expect(JSON.parse(readFile("fixtures/package.json"))).toEqual(
			expect.objectContaining({
				exports: {
					"./index": {
						import: "./dist/index.es.js",
						default: "./dist/index.es.js",
					},
				},
			}),
		);
	});

	test("correctly creates the output build files for a es/cjs mixed configuration", async () => {
		const buildConfig: PluginOptions = {
			formats: ["es", "cjs"],
			entries: [{ sourcePath: path.join(__dirname, "fixtures/index.ts") }],
		};

		await build({
			...structuredClone(defaultBuidConfig),
			plugins: [entriesPlugin(buildConfig)],
		});

		expect(readFile("fixtures/dist/index.es.js")).toMatchSnapshot();
		expect(readFile("fixtures/dist/cjs/index.cjs.js")).toMatchSnapshot();

		expect(JSON.parse(readFile("fixtures/dist/cjs/package.json"))).toEqual(
			expect.objectContaining({
				type: "commonjs",
			}),
		);

		expect(JSON.parse(readFile("fixtures/package.json"))).toEqual(
			expect.objectContaining({
				exports: {
					"./index": {
						import: "./dist/index.es.js",
						require: "./dist/cjs/index.cjs.js",
						default: "./dist/index.es.js",
					},
				},
			}),
		);
	});

	test("correctly creates the output build files for a es/cjs mixed configuration for multiple entries", async () => {
		const buildConfig: PluginOptions = {
			formats: ["es", "cjs"],
			entries: [
				{ sourcePath: path.join(__dirname, "fixtures/index.ts") },
				{ sourcePath: path.join(__dirname, "fixtures/other.ts") },
			],
		};

		await build({
			...structuredClone(defaultBuidConfig),
			plugins: [entriesPlugin(buildConfig)],
		});

		expect(readFile("fixtures/dist/index.es.js")).toMatchSnapshot();
		expect(readFile("fixtures/dist/other.es.js")).toMatchSnapshot();
		expect(readFile("fixtures/dist/cjs/index.cjs.js")).toMatchSnapshot();
		expect(readFile("fixtures/dist/cjs/other.cjs.js")).toMatchSnapshot();

		expect(JSON.parse(readFile("fixtures/dist/cjs/package.json"))).toEqual(
			expect.objectContaining({
				type: "commonjs",
			}),
		);

		expect(JSON.parse(readFile("fixtures/package.json"))).toEqual(
			expect.objectContaining({
				exports: {
					"./index": {
						import: "./dist/index.es.js",
						require: "./dist/cjs/index.cjs.js",
						default: "./dist/index.es.js",
					},
					"./other": {
						import: "./dist/other.es.js",
						require: "./dist/cjs/other.cjs.js",
						default: "./dist/other.es.js",
					},
				},
			}),
		);
	});

	test("creates main & module references for main exports", async () => {
		const buildConfig: PluginOptions = {
			formats: ["es", "cjs"],
			entries: [
				{ sourcePath: path.join(__dirname, "fixtures/index.ts"), exports: { isMain: true } },
				{ sourcePath: path.join(__dirname, "fixtures/other.ts") },
			],
		};

		await build({
			...structuredClone(defaultBuidConfig),
			plugins: [entriesPlugin(buildConfig)],
		});

		expect(JSON.parse(readFile("fixtures/package.json"))).toEqual(
			expect.objectContaining({
				module: "./dist/index.es.js",
				main: "./dist/cjs/index.cjs.js",
			}),
		);
	});

	test("supports modifying output and exports paths", async () => {
		const buildConfig: PluginOptions = {
			formats: ["es", "cjs"],
			entries: [
				{
					sourcePath: path.join(__dirname, "fixtures/index.ts"),
					outputPath: "nestedFolder/helloWorld",
				},
				{
					sourcePath: path.join(__dirname, "fixtures/other.ts"),
					exports: { exportPath: "virtualFolder/bestGreeting" },
				},
			],
		};

		await build({
			...structuredClone(defaultBuidConfig),
			plugins: [entriesPlugin(buildConfig)],
		});

		expect(readFile("fixtures/dist/nestedFolder/helloWorld.es.js")).toMatchSnapshot();
		expect(readFile("fixtures/dist/cjs/nestedFolder/helloWorld.cjs.js")).toMatchSnapshot();

		expect(JSON.parse(readFile("fixtures/package.json"))).toEqual(
			expect.objectContaining({
				exports: {
					"./nestedFolder/helloWorld": {
						import: "./dist/nestedFolder/helloWorld.es.js",
						require: "./dist/cjs/nestedFolder/helloWorld.cjs.js",
						default: "./dist/nestedFolder/helloWorld.es.js",
					},
					"./virtualFolder/bestGreeting": {
						import: "./dist/other.es.js",
						require: "./dist/cjs/other.cjs.js",
						default: "./dist/other.es.js",
					},
				},
			}),
		);
	});
});
