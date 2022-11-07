import { LibraryFormats } from "vite";

type EntryOptionsDotExports =
	| {
			isMain: boolean;
			exportPath?: never;
	  }
	| {
			isMain?: never;
			exportPath: string;
	  };

export interface EntryOptions {
	sourcePath: string;
	outputPath?: string;
	exports?: EntryOptionsDotExports;
}

export interface Entry {
	sourcePath: string;
	outputPath: string;
	exportPath: string;
}

export interface PluginOptions {
	formats: LibraryFormats[];
	entries: EntryOptions[];
}

export interface PackageJsonExports {
	[exportPath: string]: {
		import?: string;
		require?: string;
		types?: string;
	};
}
