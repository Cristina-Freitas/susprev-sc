import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Painel } from '../components/ui/Painel';
import { dadosDe, useDados } from '../context/DadosContext';
import { baixarCsv } from '../utils/exportacao';
import { formatarNumero } from '../utils/formatacao';
import { CABECALHO_DICIONARIO, DICIONARIO, montarConjuntos } from '../utils/dadosAbertos';

export function PaginaDadosAbertos() {
  const { agregados, previsao, serie, metricas } = useDados();
  const ag = dadosDe(agregados);
  const p = dadosDe(previsao);
  const s = dadosDe(serie);
  const m = dadosDe(metricas);

  const conjuntos = useMemo(() => montarConjuntos(s, p, m, ag), [s, p, m, ag]);
  const conferencia =
    ag && p ? { igual: ag.totais.ate_mes.atual === p.total_observado, api: p.total_observado, csv: ag.totais.ate_mes.atual } : null;
  const hoje = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="pagina">
      <div className="pagina__topo">
        <div>
          <h2 className="pagina__titulo">Dados abertos</h2>
          <p className="pagina__descricao">
            Tabelas em CSV com os mesmos dados do painel, prontas para abrir no Excel, Calc ou em qualquer ferramenta de análise.
          </p>
        </div>
      </div>

      <Painel
        id="painel-arquivos"
        titulo="Arquivos para download (CSV)"
        subtitulo="Separador ponto e vírgula, codificação UTF-8. Uma linha por registro, sem listas aninhadas."
      >
        <ul className="lista-arquivos">
          {conjuntos.map((c) => (
            <li key={c.id}>
              <div>
                <strong>{c.titulo}</strong> <code>{c.arquivo}</code>
                <p>{c.descricao}</p>
                <p className="lista-arquivos__meta">
                  Colunas: {c.cabecalho.join(', ')}
                  {c.disponivel && ` · ${formatarNumero(c.linhas.length)} linhas`}
                </p>
              </div>
              <button type="button" className="botao" id={`baixar-${c.id}`} disabled={!c.disponivel} onClick={() => baixarCsv(c.arquivo, c.cabecalho, c.linhas)}>
                <Download size={15} aria-hidden="true" /> Baixar
              </button>
            </li>
          ))}
        </ul>
      </Painel>

      <div className="grade-2">
        <Painel id="painel-uso" titulo="Como usar e citar">
          <div className="texto-corrido">
            <p>
              <strong>Fonte:</strong> SIH/SUS (DATASUS), procedimentos cirúrgicos eletivos de Santa Catarina; descrições do SIGTAP (Tabela Unificada
              202608); municípios do IBGE.
            </p>
            <p>
              <strong>Cuidados:</strong> os números são de procedimentos (atos cirúrgicos), não de pacientes nem de pessoas em fila. Valores
              “previstos” são estimativas do modelo e não são produção realizada. O ano mais recente é parcial.
            </p>
            <p>
              <strong>Sugestão de citação:</strong> SUSPrev SC. Cirurgias eletivas do SUS em Santa Catarina. Dados do SIH/SUS (DATASUS). Acesso em {hoje}.
            </p>
            {ag && <p>Tabelas territoriais geradas em {new Date(ag.gerado_em).toLocaleString('pt-BR')}.</p>}
          </div>
        </Painel>

        <Painel id="painel-conferencia" titulo="Conferência automática">
          {ag ? (
            <ul className="lista-simples">
              <li>
                Série mensal × tabelas territoriais:{' '}
                <strong>{ag.conferencia_serie_mensal.disponivel ? (ag.conferencia_serie_mensal.consistente ? 'consistente' : 'divergente') : 'não verificada'}</strong>
              </li>
              <li>
                API × tabelas (observado de {ag.ano_corrente}):{' '}
                <strong>{conferencia ? (conferencia.igual ? `iguais (${formatarNumero(conferencia.csv)})` : `divergentes (API ${formatarNumero(conferencia.api)}, tabelas ${formatarNumero(conferencia.csv)})`) : 'API indisponível'}</strong>
              </li>
              <li>Procedimentos sem descrição SIGTAP: <strong>{formatarNumero(ag.qualidade.procedimentos_sem_descricao)}</strong></li>
              <li>Estabelecimentos sem nome: <strong>{formatarNumero(ag.qualidade.estabelecimentos_sem_nome)}</strong></li>
            </ul>
          ) : (
            <p className="texto-corrido">Carregando…</p>
          )}
        </Painel>
      </div>

      <Painel
        id="painel-dicionario"
        titulo="Dicionário de campos"
        acoes={
          <button type="button" className="botao" id="baixar-dicionario" onClick={() => baixarCsv('dicionario_de_dados.csv', CABECALHO_DICIONARIO, DICIONARIO.map((d) => [d.arquivo, d.campo, d.descricao]))}>
            <Download size={15} aria-hidden="true" /> Baixar (CSV)
          </button>
        }
      >
        <div className="tabela-container">
          <table className="tabela tabela--compacta">
            <thead>
              <tr><th>Arquivo</th><th>Campo</th><th>Descrição</th></tr>
            </thead>
            <tbody>
              {DICIONARIO.map((d) => (
                <tr key={`${d.arquivo}-${d.campo}`}>
                  <td><code>{d.arquivo}</code></td>
                  <td>{d.campo}</td>
                  <td className="quebra">{d.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  );
}
