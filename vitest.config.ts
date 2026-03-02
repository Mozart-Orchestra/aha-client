import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
    test: {
        globals: false,
        environment: 'node',
        include: ['sources/**/*.{spec,test}.{ts,tsx}'],
        // Use inline config for TSX files to get jsdom-like environment
        environmentMatchGlobs: [
            ['sources/**/*.spec.tsx', 'happy-dom'],
            ['sources/**/*.test.tsx', 'happy-dom'],
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData/**',
            ],
        },
    },
    resolve: {
        alias: {
            '@': resolve('./sources'),
        },
    },
    esbuild: {
        jsx: 'automatic',
    },
})