import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

//for (const [key, value] of Object.entries(typescriptEslint.configs)) {
//    console.log(key);
//}

export default [{
    files: ["**/*.ts"],
}, 
    ...typescriptEslint.configs["flat/stylistic-type-checked"],
    ...typescriptEslint.configs["flat/strict-type-checked"],
    {
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parserOptions: {
            projectService: {
                allowDefaultProject: [
                    '*.js', '*.mjs', '*.ts', '*.tsx'
                ]
            },
            tsconfigRootDir: import.meta.dirname
        },
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                "args": "all",
                "argsIgnorePattern": "^_",
                "caughtErrors": "all",
                "caughtErrorsIgnorePattern": "^_",
                "destructuredArrayIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "ignoreRestSiblings": true
            }
        ],
        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "warn",
    },
}];