# SUSPrev SC — Frontend

Painel web do **SUSPrev SC**, sistema de análise de cirurgias eletivas do SUS em Santa Catarina: produção realizada, projeção do modelo preditivo, rankings por município, procedimento e estabelecimento, mapa, relatórios e dados abertos.

## Tecnologias

- React 18 e TypeScript (modo estrito)
- Vite 6, com proxy de `/api` para o backend (não exige CORS no FastAPI)
- Recharts (gráficos) e Lucide React (ícones)
- CSS com variáveis de tema

## Como executar

Pré-requisito: Node.js 18.18 ou superior.

```bash
cd frontend
npm install
npm run dev
```

O painel abre em **http://localhost:5173/**.

## Integração com o Backend

O frontend consome a API FastAPI do SUSPrev SC. Para configurar e executar o backend, consulte o [README principal do projeto](../README.md).

Para iniciar o backend e o frontend simultaneamente, após instalar as dependências de ambos, execute `npm run dev` na raiz do repositório.

Em desenvolvimento, o Vite encaminha `/api/*` para `http://127.0.0.1:8000`. Para usar outro endereço, defina `VITE_API_BASE_URL` em um arquivo `.env` (modelo em `.env.example`). Com o backend desligado, o painel continua abrindo e mostra "API indisponível".
