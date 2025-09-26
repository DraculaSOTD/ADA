import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths for production
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        // Better asset naming for production
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    },
    // Ensure source maps for debugging
    sourcemap: false,
    // Minify for production
    minify: 'esbuild'
  },
  server: {
    port: 5173,
    force: true, // Force re-optimization of dependencies
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    force: true // Clear the cache on server start
  }
});
