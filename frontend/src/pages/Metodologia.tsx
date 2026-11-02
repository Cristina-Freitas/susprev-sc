import { ShieldCheck } from 'lucide-react';
import { Carregando, EstadoErro } from '../components/ui/Estados';
import { Painel } from '../components/ui/Painel';
import { dadosDe, useDados } from '../context/DadosContext';
import { formatarDecimal } from '../utils/formatacao';

export function PaginaMetodologia() {
  const { metricas, serie } = useDados();
  const m = dadosDe(metricas);
  const s = dadosDe(serie);

  return (
    <div className="pagina">
      <div className="pagina__topo">
        <div>
          <h2 className="pagina__titulo">Metodologia e Arquitetura Preditiva</h2>
          <p className="pagina__descricao">
            Fundamentação científica, engenharia de dados, validação do modelo XGBoost e diretrizes éticas em saúde pública.
          </p>
        </div>
      </div>

      <div className="grade-2">
        <Painel
          id="painel-fontes-dados"
          titulo="Fonte de Dados e Engenharia de Pipeline"
          subtitulo="Dados abertos do Ministério da Saúde com processamento reprodutível"
        >
          <div className="texto-corrido">
            <p>
              <strong>Fonte Primária:</strong> Os registros são extraídos dos arquivos públicos do{' '}
              <strong>Sistema de Informações Hospitalares do SUS (SIH/SUS)</strong>, mantido pelo DATASUS / Ministério
              da Saúde.
            </p>
            <p>
              <strong>Recorte Territorial e Temporal:</strong> Produção de cirurgias eletivas realizadas em hospitais
              credenciados do estado de <strong>Santa Catarina</strong>, cobrindo o período de{' '}
              <strong>janeiro de 2019 a agosto de 2026</strong> ({s ? s.total_competencias : 92} competências mensais
              processadas).
            </p>
            <p>
              <strong>Critério de Eletividade Rigoroso:</strong> O SIH disponibiliza a base resumida (RD) e a base de
              serviços profissionais (SP). O pipeline do SUSPrev SC vincula cada Autorização de Internação Hospitalar
              (AIH) para assegurar que apenas internações com <code>CAR_INT = 01</code> (eletivas) e procedimentos
              cirúrgicos do Grupo 04 do SIGTAP sejam considerados.
            </p>
            <p>
              <strong>Armazenamento Local e Desacoplamento:</strong> Os dados processados são persistidos em banco de
              dados SQLite estruturado (<code>susprev_sc.db</code>), com backups em formato CSV versionados e auditados
              por hashes SHA-256.
            </p>
          </div>
        </Painel>

        <Painel
          id="painel-modelo-xgboost"
          titulo="Modelo Preditivo: XGBoost"
          subtitulo="Algoritmo de Extreme Gradient Boosting para séries temporais"
        >
          <div className="texto-corrido">
            <p>
              <strong>Por que o XGBoost?</strong> Trata-se de um modelo de árvores de decisão impulsionadas por gradiente
              (<em>gradient boosting</em>), reconhecido pela capacidade de capturar não-linearidades, sazonalidades e
              tendências em séries temporais com robustez a outliers.
            </p>
            <p>
              <strong>Atributos Preditivos (Features):</strong>
            </p>
            <ul>
              <li>
                <strong>Defasagens (Lags):</strong> <code>lag_1</code>, <code>lag_2</code>, <code>lag_3</code>,{' '}
                <code>lag_6</code> e <code>lag_12</code> (comportamento recente e sazonalidade homóloga de 1 ano).
              </li>
              <li>
                <strong>Média móvel de curto prazo:</strong> <code>media_3</code> (suavização dos últimos 3 meses).
              </li>
              <li>
                <strong>Codificação Cíclica do Mês:</strong> <code>mes_sin</code> e <code>mes_cos</code> via
                transformação trigonométrica periódica:
                <br />
                <code>sen(2·π·mês/12)</code> e <code>cos(2·π·mês/12)</code>, capturando a sazonalidade anual contínua.
              </li>
            </ul>
            <p>
              <strong>Inferência na API:</strong> O modelo é serializado em <code>susprev_sp.joblib</code> e carregado
              na inicialização do FastAPI, respondendo em milissegundos sem necessidade de reprocessamento.
            </p>
          </div>
        </Painel>
      </div>

      <Painel
        id="painel-metricas-avaliacao"
        titulo="Avaliação e Comparação de Desempenho dos Modelos"
        subtitulo="Métricas oficiais obtidas na validação e no conjunto de teste"
        dica="Métricas reais extraídas dos relatórios versionados do projeto. O modelo XGBoost obteve o menor erro quadrático médio (RMSE) e o maior coeficiente de determinação (R²)."
      >
        {metricas.estado === 'carregando' ? (
          <Carregando rotulo="Carregando métricas dos modelos…" />
        ) : metricas.estado === 'erro' ? (
          <EstadoErro mensagem={metricas.erro} />
        ) : m ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: 'var(--fs-md)', marginBottom: '8px', color: 'var(--marinho-800)' }}>
                1. Teste Final (Conjunto de Teste Independente)
              </h3>
              <div className="tabela-container">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th scope="col">Modelo</th>
                      <th scope="col" className="num">MAE (Erro Absoluto Médio)</th>
                      <th scope="col" className="num">RMSE (Raiz do Erro Quadrático)</th>
                      <th scope="col" className="num">R² (Coef. Determinação)</th>
                      <th scope="col">Classificação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.teste_final.registros.map((item, idx) => (
                      <tr key={item.modelo} className={idx === 0 ? 'tabela__destaque' : undefined}>
                        <td><strong>{item.modelo}</strong></td>
                        <td className="num font-mono">{formatarDecimal(item.mae, 2)}</td>
                        <td className="num font-mono">{formatarDecimal(item.rmse, 2)}</td>
                        <td className="num font-mono">{formatarDecimal(item.r2, 3)}</td>
                        <td>
                          {idx === 0 ? (
                            <span className="marcador-tipo marcador-tipo--observado">Selecionado para Produção</span>
                          ) : (
                            <span style={{ color: 'var(--texto-suave)' }}>Referência de Linha de Base</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 'var(--fs-md)', marginBottom: '8px', color: 'var(--marinho-800)' }}>
                2. Validação Cruzada Comparativa de Múltiplos Algoritmos
              </h3>
              <div className="tabela-container">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th scope="col">Algoritmo</th>
                      <th scope="col" className="num">MAE</th>
                      <th scope="col" className="num">RMSE</th>
                      <th scope="col" className="num">R²</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.validacao.registros.map((item) => (
                      <tr key={item.modelo} className={item.modelo.toLowerCase().includes('xgboost') ? 'tabela__destaque' : undefined}>
                        <td><strong>{item.modelo}</strong></td>
                        <td className="num font-mono">{formatarDecimal(item.mae, 2)}</td>
                        <td className="num font-mono">{formatarDecimal(item.rmse, 2)}</td>
                        <td className="num font-mono">{formatarDecimal(item.r2, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </Painel>

      <Painel
        id="painel-limitacoes-eticas"
        titulo="Limitações e Diretrizes Éticas na Saúde Pública"
        subtitulo="Esclarecimentos fundamentais para correta utilização e interpretação"
      >
        <div className="texto-corrido">
          <div className="aviso aviso--info" style={{ marginBottom: '12px' }}>
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <strong>O sistema não mede demanda reprimida nem fila de espera cirúrgica:</strong>
              <p>
                A produção de cirurgias eletivas reflete as cirurgias efetivamente realizadas e registradas nas unidades
                hospitalares. O SUSPrev SC não possui acesso às listas nominais de regulação ambulatorial do SISREG,
                portanto <strong>não estima o tempo de espera de pacientes na fila nem a quantidade de cidadãos aguardando cirurgia</strong>.
              </p>
            </div>
          </div>

          <p>
            <strong>Unidade de Produção vs. Pacientes Únicos:</strong> Os indicadores refletem procedimentos cirúrgicos
            faturados no âmbito do SIH/SUS. Um mesmo paciente pode ter realizado múltiplos procedimentos simultâneos em
            uma mesma internação cirúrgica eletiva.
          </p>
          <p>
            <strong>Natureza Probabilística das Projeções:</strong> As estimativas de setembro a dezembro de 2026 são
            projeções matemáticas baseadas na continuidade do padrão histórico recente e sazonal. Fatores exógenos —
            como greves, contingenciamentos orçamentários, novas epidemias ou mutirões extraordinários — podem alterar a
            produção real observada quando do fechamento das competências no DATASUS.
          </p>
        </div>
      </Painel>
    </div>
  );
}
