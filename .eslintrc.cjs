module.exports = {
	env: {
		browser: true,
		node: true,
		es2021: true,
	},
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
	},
	plugins: ["@typescript-eslint", "simple-import-sort", "unused-imports"],
	rules: {
		"simple-import-sort/imports": "error",
		"unused-imports/no-unused-imports": "error",
		"@typescript-eslint/no-empty-interface": "off",
		"@typescript-eslint/no-unused-vars": [
			"error",
			{
				destructuredArrayIgnorePattern: "^_",
				argsIgnorePattern: "^_",
			},
		],
	},
};
