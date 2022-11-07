import path from "node:path";

import { UserConfig } from "vite";

export function getPackageJSONPath(config: UserConfig) {
	if (config.root) return path.join(config.root, "package.json");

	return "./package.json";
}
