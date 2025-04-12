// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
	{
		files: ["**/*.ts"],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...angular.configs.tsRecommended,
			...tseslint.configs.stylistic
		],
		processor: angular.processInlineTemplates,
		rules: {
			"@angular-eslint/directive-selector": [
				"error",
				{
					type: "attribute",
					prefix: "portfolio",
					style: "camelCase"
				}
			],
			"@angular-eslint/component-selector": [
				"error",
				{
					type: "element",
					prefix: "portfolio",
					style: "kebab-case"
				}
			],
			"no-console": ["warn", { allow: ["warn", "error"] }],
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ vars: "all", args: "after-used", ignoreRestSiblings: false }
			],
			"no-unused-private-class-members": "warn",
			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: "memberLike",
					modifiers: ["private"],
					format: ["camelCase"],
					leadingUnderscore: "require"
				}
			],
			"@typescript-eslint/explicit-member-accessibility": [
				"error",
				{
					accessibility: "explicit",
					overrides: {
						constructors: "no-public",
						accessors: "explicit",
						methods: "explicit",
						properties: "explicit",
						parameterProperties: "explicit"
					},
					ignoredMethodNames: [
						"ngOnChanges",
						"ngOnInit",
						"ngDoCheck",
						"ngAfterContentInit",
						"ngAfterContentChecked",
						"ngAfterViewInit",
						"ngAfterViewChecked",
						"ngOnDestroy",
						"effect"
					]
				}
			],
			"@typescript-eslint/array-type": ["error", { default: "array" }]
		}
	},
	{
		files: ["**/*.html"],
		extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
		rules: {
			"@angular-eslint/template/prefer-self-closing-tags": ["warn"]
		}
	},
	{
		files: ["*.scss", "*.css", "*.json"],
		extends: [...angular.configs.templateRecommended],
		rules: {}
	}
);
