import { useMemo, useState } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { FolhaRelatorio } from '../components/relatorio/FolhaRelatorio';
import { SeletorAno } from '../components/ui/SeletorAno';
import { dadosDe, useDados } from '../context/DadosContext';
import { nomeMes } from '../utils/formatacao';
import { montarAbasRelatorio } from '../utils/relatorioXlsx';
import { montarResumo } from '../utils/resumo';
import { baixarXlsx } from '../utils/xlsx';

export function PaginaRelatorios() {
  const { agregados, serie, previsao } = useDados();
  const ag = dadosDe(agregados);
  const s = dadosDe(serie);
  const p = dadosDe(previsao);
  const [ano, setAno] = useState<number | null>(null);
  const anoRanking = ano ?? ag?.ano_corrente ?? new Date().getFullYear();
  const resumo = useMemo(() => montarResumo(p, s, ag), [p, s, ag]);
  const carregando = agregados.estado === 'carregando' || serie.estado === 'carregando';
  const pronto = !!s || !!ag;

  const gerarExcel = () => {
    const abas = montarAbasRelatorio(resumo, p, s, ag, anoRanking);
    baixarXlsx(`susprev_relatorio_${resumo.ano}-${String(resumo.mesFinal).padStart(2, '0')}.xlsx`, abas);
  };

  return (
    <div className="pagina">
      <div className="pagina__topo no-print">
        <div>
          <h2 className="pagina__titulo">Relatórios</h2>
          <p className="pagina__descricao">Relatório executivo com os indicadores, rankings e a projeção, pronto para PDF ou Excel.</p>
        </div>
        <div className="pagina__filtros">
          {ag && (
            <SeletorAno id="ano-relatorios" anos={ag.anos} valor={anoRanking} aoMudar={setAno} anoCorrente={ag.ano_corrente} mesFinal={nomeMes(ag.mes_final_ano_corrente)} />
          )}
          <button type="button" id="botao-gerar-pdf" className="botao botao--primario" onClick={() => window.print()} disabled={!pronto || carregando}>
            <Printer size={15} aria-hidden="true" /> Gerar PDF
          </button>
          <button type="button" id="botao-baixar-excel" className="botao" onClick={gerarExcel} disabled={!pronto || carregando}>
            <FileSpreadsheet size={15} aria-hidden="true" /> Baixar Excel (.xlsx)
          </button>
        </div>
      </div>

      <p className="relatorio__dica no-print">
        <strong>PDF:</strong> abre a impressão do navegador com a folha abaixo em A4; escolha “Salvar como PDF” como destino.{' '}
        <strong>Excel:</strong> uma planilha com abas (Resumo, Série mensal, Evolução anual, Municípios, Procedimentos, Estabelecimentos e Notas).
        {!resumo.apiDisponivel && ' A API de previsão está indisponível: previsão e total projetado saem como “Indisponível”.'}
      </p>

      <FolhaRelatorio resumo={resumo} previsao={p} serie={s} agregados={ag} anoRanking={anoRanking} />
    </div>
  );
}
