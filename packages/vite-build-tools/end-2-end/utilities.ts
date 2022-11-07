import fs from "fs";
import path from "path";
import url from "url";

export const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export function readFile(relativePath: string) {
	return fs.readFileSync(path.join(__dirname, relativePath)).toString();
}

export function cleanup() {
	fs.writeFileSync(
		path.join(__dirname, "fixtures/package.json"),
		JSON.stringify({ name: "fixtures" }, undefined, 2),
	);

	fs.rmSync(path.join(__dirname, "fixtures/dist"), { force: true, recursive: true });
}
