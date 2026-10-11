import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../src/main/resources/static',
    emptyOutDir: true,
    rolldownOptions: {
      input: 'tasksboard.html',
    },
  },
  server: {
    open: '/tasksboard.html',
    proxy: {
      // サーバーは 127.0.0.1 だけで待ち受けるので、localhost(IPv6 の ::1 になることがある)ではなく直接指定する
      '/api': 'http://127.0.0.1:8080',
    },
  },
})
