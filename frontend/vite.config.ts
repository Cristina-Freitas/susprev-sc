import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * O backend FastAPI não habilita CORS e não deve ser alterado.
 * Por isso, o navegador conversa apenas com o próprio servidor do Vite,
 * que encaminha as chamadas de `/api/*` para a URL definida em
 * VITE_API_BASE_URL (padrão: http://127.0.0.1:8000).
 */
const URL_PADRAO_API = 'http://127.0.0.1:8000';

function criarProxy(destino: string): Record<string, ProxyOptions> {
  return {
    '/api': {
      target: destino,
      changeOrigin: true,
      rewrite: (caminho) => caminho.replace(/^\/api/, ''),
      configure: (proxy) => {
        // Quando o backend está desligado, responde 502 com um corpo
        // identificável, para que a interface mostre uma mensagem clara.
        proxy.on('error', (_erro, _req, res) => {
          const resposta = res as ServerResponse<IncomingMessage>;
          if (resposta && typeof resposta.writeHead === 'function' && !resposta.headersSent) {
            resposta.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            resposta.end(JSON.stringify({ detail: 'backend_indisponivel' }));
          }
        });
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const destino = (env.VITE_API_BASE_URL || URL_PADRAO_API).replace(/\/+$/, '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      proxy: criarProxy(destino),
    },
    preview: {
      port: 4173,
      proxy: criarProxy(destino),
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            graficos: ['recharts'],
            react: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
