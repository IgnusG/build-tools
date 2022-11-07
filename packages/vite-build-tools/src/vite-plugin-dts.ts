import * as fs from "node:fs";
import * as path from "node:path";

import { Plugin, UserConfig } from "vite";

import { Entry, PackageJsonExports, PluginOptions } from "./types.js";
import { reduceEntryOptionsToEntries } from "./vite-plugin-entries.js";

export type { PluginOptions };

interface PackageJsonTypeExports {
	[exportPath: string]: {
		types: string;
	};
}

function createReduceEntriesToPackageExports({ outDir }: { outDir?: string }) {
	return function reduceEntriesToPackageExports(
		result: PackageJsonTypeExports,
		entry: Entry,
	): PackageJsonTypeExports {
		return {
			...result,

			[entry.exportPath]: {
				types: "./" + path.join(outDir ?? "", `${entry.outputPath}.d.ts`),
			},
		};
	};
}

function createReduceExistingExportsEntriesToTypedPackageExports(
	entryTypeExports: Map<string, { types: string }>,
) {
	return function reduceExistingExportsEntriesToTypedPackageExports(
		result: PackageJsonExports,
		[entryExportPath, entryExports]: [string, PackageJsonExports[string]],
	): PackageJsonExports {
		const entryTypeExport = entryTypeExports.get(entryExportPath);

		if (!entryTypeExport) {
			throw new Error(
				`Cannot find type definitions for export ${entryExportPath}. Searched exports ${exports.keys()}`,
			);
		}

		return {
			...result,
			[entryExportPath]: {
				...entryTypeExport,
				...entryExports,
			},
		};
	};
}

export default async function dtsPlugin(opts: PluginOptions): Promise<Plugin> {
	let entries: Map<string, Entry>;
	let config: UserConfig;

	let bundleGenerated = false;

	return {
		name: "vite:dts",
		config(userConfig) {
			entries = new Map(Object.entries(opts.entries.reduce(reduceEntryOptionsToEntries, {})));
			config = userConfig;
		},

		generateBundle(options) {
			if (bundleGenerated) return;

			for (const { outputPath, sourcePath } of entries.values()) {
				if (!options.dir) {
					throw new Error("");
				}

				const file = fs.readFileSync(sourcePath).toString();
				const outputDir = path.parse(outputPath).dir;

				const relativePath = path.relative(
					path.resolve(path.join(options.dir, outputDir)),
					path.join(path.parse(sourcePath).dir, `${path.parse(sourcePath).name}.js`),
				);

				const hasDefaultExport = /^(export default |export \{[^}]+? as default\s*[,}])/m.test(file);

				const source =
					`export * from "${relativePath}"` +
					(hasDefaultExport ? `\nexport {default} from "${relativePath}"` : ``);

				this.emitFile({
					type: "asset",
					fileName: path.join(outputDir, `${path.parse(outputPath).name}.d.ts`),
					source,
				});
			}

			bundleGenerated = true;
		},

		closeBundle() {
			const packageDetails = JSON.parse(fs.readFileSync("./package.json").toString());
			const entryTypeExports = new Map(
				Object.entries(
					Array.from(entries.values()).reduce(
						createReduceEntriesToPackageExports({ ...config.build }),
						{},
					),
				),
			);

			this.warn("Adding type definitions to the `exports` field in your package.json ✅");

			packageDetails.exports = Array.from(
				Object.entries(packageDetails.exports as PackageJsonExports),
			).reduce(createReduceExistingExportsEntriesToTypedPackageExports(entryTypeExports), {});

			fs.writeFileSync("./package.json", JSON.stringify(packageDetails, undefined, 4));
		},
	};
}
