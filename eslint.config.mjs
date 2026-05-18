import nextConfig from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.FlatConfig[]} */
const eslintConfig = [
  ...nextConfig,
];

export default eslintConfig;
