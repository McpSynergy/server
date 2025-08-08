import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import copy from "rollup-plugin-copy";

const extensions = [".js", ".ts"];

export default defineConfig([
  {
    input: ["./src/main.ts"],
    output: {
      dir: "dist",
      format: "esm",
      exports: "named",
    },
    plugins: [
      nodeResolve({ extensions }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "./dist/types",
      }),
      json(),
      copy({
        targets: [
          { src: "mcp_servers.config.json", dest: "dist" },
          { src: "mcp_components.config.json", dest: "dist" },
        ],
      }),
      terser(),
    ],
  },
]);
