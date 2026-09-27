import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
// `defineConfig` viene de `vitest/config` y no de `vite`: es la misma función re-exportada, pero
// con los tipos de la sección `test`. Importarla de `vite` también funciona, pero `test` deja de
// type-checkear.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // El backend no tiene CORS configurado (ni @CrossOrigin, ni WebMvcConfigurer, ni
    // spring.web.cors.*). Este proxy hace que el navegador vea /api como same-origin, así que
    // los requests no son cross-origin y nunca se bloquean. Por eso el cliente HTTP llama a
    // rutas relativas y no a http://localhost:8080.
    //
    // Ojo: esto resuelve el desarrollo, no la producción. Al desplegar hay que poner un proxy
    // inverso delante del frontend o agregar CorsConfiguration en el backend.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    // jsdom, no node: casi todo lo que hay que probar son componentes con eventos y atributos ARIA.
    environment: 'jsdom',
    // Coincide con el origen real de Vite. MSW intercepta por URL absoluta, así que los handlers
    // tienen que poder resolver las rutas relativas que usa `apiGet`.
    environmentOptions: { jsdom: { url: 'http://localhost:5173' } },
    setupFiles: ['./src/test/setup.ts'],
    // Los tests viven junto al código, con sufijo `.test.tsx`.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
