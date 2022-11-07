import * as fs from "node:fs";
import * as path from "node:path";

import { BuildOptions, LibraryFormats, Plugin, UserConfig } from "vite";

import { Entry, EntryOptions, PackageJsonExports, PluginOptions } from "./types.js";
import { getPackageJSONPath } from "./utilities.js";

export type { PluginOptions };

type InputOptions = { [entryAlias: string]: string };

type RollupOutputOptions = Exclude<BuildOptions["rollupOptions"], undefined>["output"];
type RollupSingleOutputOptions = Exclude<RollupOutputOptions, unknown[] | undefined>;

function reduceEntryMapToInput(result: InputOptions, [id, entry]: [string, Entry]): InputOptions {
	return {
		...result,

		[id]: entry.sourcePath,
	};
}

function createReduceEntriesToPackageExports({
	outDir,
	formats,
}: {
	outDir?: string;
	formats: LibraryFormats[];
}) {
	return function reduceEntriesToPackageExports(
		result: PackageJsonExports,
		entry: Entry,
	): PackageJsonExports {
		const esmExport = "./" + path.join(outDir ?? "", `${entry.outputPath}.es.js`);
		const cjsExport = "./" + path.join(outDir ?? "", "cjs", `${entry.outputPath}.cjs.js`);

		return {
			...result,

			[entry.exportPath]: {
				...(formats.includes("es") ? { import: esmExport } : undefined),
				...(formats.includes("cjs") ? { require: cjsExport } : undefined),

				...(formats[0] === "es"
					? { default: esmExport }
					: formats[0] === "cjs"
					? { default: cjsExport }
					: undefined),
			},
		};
	};
}

export function reduceEntryOptionsToEntries(
	result: Record<string, Entry>,
	entryOptions: EntryOptions,
	index: number,
): Record<string, Entry> {
	const outputPath = entryOptions.outputPath ?? path.parse(entryOptions.sourcePath).name;

	const entry: Entry = {
		sourcePath: entryOptions.sourcePath,
		outputPath,
		exportPath: entryOptions.exports?.isMain
			? "."
			: `./${entryOptions.exports?.exportPath ?? outputPath}`,
	};

	return {
		...result,
		[index.toString()]: entry,
	};
}

function createMapFormatToOutputOptions(
	isEsModule: boolean,
	outputOptions: RollupOutputOptions,
	entries: Map<string, Entry>,
) {
	return function mapFormatToOutputOptions(format: LibraryFormats): RollupSingleOutputOptions {
		return {
			...outputOptions,
			format,
			interop: isEsModule && format === "cjs",

			entryFileNames: (chunkInfo) => {
				const entry = entries.get(chunkInfo.name);

				if (!entry) {
					throw new Error(
						`Cannot find entry for chunk ${chunkInfo.name}. Searched chunks: ${entries.keys()}`,
					);
				}

				const outputFilename = `${entry.outputPath}.[format].js`;

				if (format === "cjs") return `cjs/${outputFilename}`;
				else return `${outputFilename}`;
			},
		};
	};
}

export default async function entriesPlugin(opts: PluginOptions): Promise<Plugin> {
	let config: UserConfig;
	let entries: Map<string, Entry>;

	return {
		name: "vite:entries",
		config(userConfig) {
			const packageDetails = JSON.parse(fs.readFileSync(getPackageJSONPath(userConfig)).toString());

			const isEsModule = packageDetails.type === "module";

			userConfig.build ??= {};

			entries = new Map(Object.entries(opts.entries.reduce(reduceEntryOptionsToEntries, {})));

			userConfig.build.rollupOptions = {
				...userConfig.build.rollupOptions,
				preserveEntrySignatures: "strict",
				input: Array.from(entries.entries()).reduce(reduceEntryMapToInput, {}),

				output: opts.formats.map(
					createMapFormatToOutputOptions(
						isEsModule,
						userConfig.build.rollupOptions?.output,
						entries,
					),
				),
			};

			config = userConfig;
		},

		generateBundle(outputOptions) {
			if (outputOptions.format === "cjs") {
				this.emitFile({
					type: "asset",
					fileName: `cjs/package.json`,
					source: JSON.stringify(
						{
							"#type":
								"Force these files being recognized as commonjs without .cjs (which some tools don't support)",
							type: "commonjs",
						},
						undefined,
						4,
					),
				});
			}
		},

		closeBundle() {
			const packageDetails = JSON.parse(fs.readFileSync(getPackageJSONPath(config)).toString());

			const { dependencies, peerDependencies, devDependencies, ...restPackageDetails } =
				packageDetails;

			delete restPackageDetails.exports;

			this.warn(
				"Adding an `exports` field to your package.json based on your build configuration ✅",
			);

			const exports = Array.from(entries.values()).reduce(
				createReduceEntriesToPackageExports({ ...config.build, ...opts }),
				{},
			);

			fs.writeFileSync(
				getPackageJSONPath(config),
				JSON.stringify(
					{
						...restPackageDetails,
						module: opts.formats.includes("es") ? exports["."]?.import : undefined,
						main: opts.formats.includes("cjs") ? exports["."]?.require : undefined,
						"#exports": "Generated automatically by @ignsg/vite-build-tools",
						exports,
						dependencies,
						peerDependencies,
						devDependencies,
					},
					undefined,
					4,
				),
			);
		},
	};
}
