// vite.config.ts
import fs from 'fs'
import { builtinModules } from 'module'
import path from 'path'
import { defineConfig, UserConfig } from 'vite'

import pkg from './package.json'

interface PackageJson {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

function getExternal(pkg: PackageJson) {
  const externals = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})]

  function getPkgNameRegex(pkgName: string) {
    const escaped = pkgName.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
    return new RegExp(`^${escaped}(\/.+)?$`)
  }

  return externals.map(getPkgNameRegex)
}

const srcPath = path.resolve(__dirname, 'src')
const distPath = path.resolve(__dirname, 'dist')

const entry = path.resolve(srcPath, 'index.ts')
const jotaiEntry = path.resolve(srcPath, 'jotai/index.ts')
const external = [...getExternal(pkg), ...builtinModules]

export default defineConfig((): UserConfig => {
  return {
    build: {
      outDir: distPath,
      emptyOutDir: true,
      target: 'es2020',

      minify: true,
      sourcemap: true,

      rollupOptions: {
        input: [entry, jotaiEntry],
        external: external,
        preserveEntrySignatures: 'strict',
        output: [
          {
            format: 'es',
            dir: 'dist/esm',
            entryFileNames: '[name].js',
            chunkFileNames: '[name]-[hash].js',
            preserveModules: true,
            preserveModulesRoot: srcPath,
          },
          {
            format: 'cjs',
            dir: 'dist/cjs',
            entryFileNames: '[name].cjs',
            chunkFileNames: '[name]-[hash].cjs',
            preserveModules: true,
            preserveModulesRoot: srcPath,
          },
        ],
      },
    },
  }
})
