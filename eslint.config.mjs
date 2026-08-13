import babelParser from "@babel/eslint-parser"
import reactHooks from "eslint-plugin-react-hooks"

export default [
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    ignores: ["apps/web/src/routeTree.gen.ts"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          parserOpts: { plugins: ["typescript", "jsx"] },
        },
      },
    },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.flat.recommended.rules,
  },
]
