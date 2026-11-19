import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Минимална Vite конфигурация — React плъгинът обработва JSX и fast refresh.
export default defineConfig({
  plugins: [react()],
});
