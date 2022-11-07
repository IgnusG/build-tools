#!/usr/bin/env -S yarn pnpify ts-node -T --esm

import { $, chalk, echo, fs, which } from "zx";
import { spinner } from "zx/experimental";

const VSCODE_PATH = "./.vscode";
const VSCODE_SETTINGS_TEMPLATE = `${VSCODE_PATH}/settings-template.json`;
const VSCODE_SETTINGS = `${VSCODE_PATH}/settings.json`;

echo(`prepare.ts: Preparing workspace`);

if (!(await fs.stat(VSCODE_SETTINGS))) {
	echo(
		`prepare.ts: ${chalk.blue("Copying VS Code template settings")} into ${VSCODE_SETTINGS}... `,
	);

	await fs.copyFile(VSCODE_SETTINGS_TEMPLATE, VSCODE_SETTINGS);
} else {
	echo(
		`prepare.ts: ${chalk.blue(
			"VS Code workspace settings found",
		)} - skipped overwriting them (see ${VSCODE_SETTINGS_TEMPLATE})`,
	);
}

try {
	await which("python");
} catch {
	echo(
		`prepare.ts: ${chalk.red(
			"Failed",
		)} - you must install a python executable as we use it to run pre-commit hooks`,
	);

	process.exit(1);
}

echo(`prepare.ts: ${chalk.blue("Installing git hooks")} using pre-commit...`);

await spinner(async () => {
	await $`python ./.tools/pre-commit.pyz install`;
	await $`python ./.tools/pre-commit.pyz install --hook-type commit-msg`;
});

echo(`prepare.ts: ${chalk.green("All done! Workspace prepared successfully")}`);
