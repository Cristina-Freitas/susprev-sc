# SUSPrev SC

## Registro de Decisões Técnicas

**Projeto:** Desenvolvimento de IA para Análise Preditiva — SCTEC
**Autora:** Cristina Freitas
**Atualização:** Novembro de 2026

### 1. Objetivo e escopo

O SUSPrev SC foi desenvolvido para analisar a produção histórica de procedimentos cirúrgicos eletivos financiados pelo SUS em Santa Catarina e estimar a quantidade mensal de procedimentos futuros por meio de Machine Learning.

O sistema utiliza dados públicos do SIH/SUS (DATASUS). Suas previsões representam volumes de procedimentos, não a quantidade de pacientes únicos, o tamanho da fila de espera ou o tempo necessário para atendimento.

### 2. Dados e preparação

Foram processadas **92 competências mensais**, de janeiro de 2019 a agosto de 2026, a partir dos registros RD e SP do SIH/SUS.

O indicador principal considera procedimentos cirúrgicos do grupo 04, vinculados a internações de caráter eletivo (`CAR_INT = 01`), com contagem distinta da combinação **AIH, procedimento e CNES**.

A consolidação dos dados foi realizada em Python, com persistência em SQLite. A série histórica mensal resultante foi utilizada no treinamento e na avaliação dos modelos preditivos.

### 3. Seleção e avaliação do modelo

Foram comparados os algoritmos de Regressão Linear, Random Forest e XGBoost, além de uma referência ingênua baseada no último mês observado.

A separação dos dados respeitou a ordem cronológica, evitando o uso de informações futuras no treinamento.

O **XGBoost foi selecionado pelo menor MAE de validação (893,06)**.

| Métrica de teste | XGBoost | Baseline |
| ---------------- | ------: | -------: |
| MAE              |  842,37 |   836,25 |
| RMSE             |  933,27 | 1.029,02 |
| R²               |  0,4554 |   0,3379 |

Embora o baseline tenha apresentado MAE de teste ligeiramente menor, o XGBoost obteve melhores resultados em RMSE e R².

O modelo foi serializado em `models/susprev_sp.joblib`, permitindo realizar previsões sem executar novamente o notebook de treinamento.

### 4. Arquitetura e decisões de implementação

**Backend:** FastAPI, com separação entre rotas, schemas Pydantic e serviços de previsão.

**Inicialização:** carregamento único do modelo serializado durante o ciclo de vida da aplicação.

**Persistência:** SQLite para armazenamento dos dados processados, com possibilidade de reconstrução a partir dos backups CSV versionados.

**API:** endpoints `GET /health` e `POST /predict`, com validação de entrada, tratamento de erros e documentação interativa Swagger/OpenAPI.

**Frontend complementar:** dashboard React, TypeScript e Vite, integrado à API para apresentação de indicadores históricos, projeções, gráficos e informações territoriais.

A arquitetura mantém a lógica preditiva separada da interface, permitindo consultar a API independentemente do frontend.

### 5. Testes e reprodutibilidade

A aplicação foi validada a partir de uma cópia independente do repositório GitHub, com instalação das dependências, reconstrução do banco SQLite e execução da API.

Na validação registrada em 31/10/2026, foram obtidos **46 testes automatizados aprovados**, sem falhas, além de respostas HTTP 200 para a documentação Swagger e o endpoint de previsão.

O projeto disponibiliza o notebook de desenvolvimento, o modelo serializado, os arquivos de dependências, os scripts necessários e a documentação de execução no README principal.

### 6. Limitações e considerações finais

As previsões são estimativas estatísticas e não garantem a realização dos procedimentos projetados.

A qualidade dos resultados depende da disponibilidade, completude e atualização dos dados do SIH/SUS. O desempenho do modelo deve ser interpretado considerando a dimensão reduzida da série temporal mensal e a comparação com o baseline.

A ausência de nomes em parte do cadastro CNES não altera o indicador mensal utilizado pelo modelo, mas limita a identificação nominal dos estabelecimentos na interface.

O SUSPrev SC demonstra a aplicação de um fluxo de análise preditiva com dados públicos, abrangendo preparação, treinamento, avaliação, serialização, disponibilização por API e visualização dos resultados.

---

**Documentação complementar:** `README.md`, `frontend/README.md` e Swagger em `http://127.0.0.1:8000/docs`.
