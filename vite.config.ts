import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Pre-bundle CJS packages to avoid TDZ "cannot access before initialization" errors
  optimizeDeps: {
    include: ['konva', 'react-konva'],
  },

  build: {
    commonjsOptions: {
      include: [/konva/, /react-konva/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Isolate konva/react-konva into their own chunk so CJS → ESM wrappers
        // are fully initialised before any component code runs (fixes TDZ crash).
        manualChunks(id) {
          if (id.includes('node_modules/konva') || id.includes('node_modules/react-konva')) {
            return 'konva';
          }
        },
      },
    },
  },
})
