import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import json from '@rollup/plugin-json'

const extensions = ['.js', '.ts']

export default defineConfig([
  {
    input: ['./src/index.ts', './src/main.ts'],
    output: {
      dir: 'dist',
      format: 'esm',
      exports: 'named',
    },
    plugins: [
      nodeResolve({ extensions }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist/types',
      }),
      json(),
      terser(),
    ],
  },
])
