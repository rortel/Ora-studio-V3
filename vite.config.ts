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
        // Granular vendor chunking. Keeps the main `index` chunk small
        // (~300KB instead of 800KB) by isolating heavy libraries that
        // are either lazy-loaded (Konva, pdfjs) or imported by a small
        // subset of pages (charts, MUI). Result: first paint downloads
        // only react + the page chunk, everything else streams in when
        // needed.
        manualChunks(id) {
          if (id.includes('node_modules/konva') || id.includes('node_modules/react-konva')) return 'konva';
          if (id.includes('node_modules/pdfjs-dist')) return 'pdf';
          if (id.includes('node_modules/@ffmpeg/')) return 'ffmpeg';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/victory-vendor') || id.includes('node_modules/recharts-scale')) return 'charts';
          if (id.includes('node_modules/@mui/') || id.includes('node_modules/@emotion/')) return 'mui';
          if (id.includes('node_modules/@radix-ui/')) return 'radix';
          if (id.includes('node_modules/motion/')) return 'motion';
          if (id.includes('node_modules/@remotion/') || id.includes('node_modules/remotion/')) return 'remotion';
          if (id.includes('node_modules/jszip') || id.includes('node_modules/html-to-image') || id.includes('node_modules/wavesurfer.js')) return 'media-tools';
          if (id.includes('node_modules/react-slick') || id.includes('node_modules/react-popper') || id.includes('node_modules/embla-carousel-react') || id.includes('node_modules/react-day-picker') || id.includes('node_modules/react-dnd')) return 'ui-extras';
          if (id.includes('node_modules/lucide-react')) return 'icons';
        },
      },
    },
  },
})
