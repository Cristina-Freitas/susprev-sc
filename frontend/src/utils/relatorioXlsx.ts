import type { PrevisaoSaida } from '../types/api';
import type { AgregadosProducao, SerieMensal } from '../types/dados';
import { rankingEstabelecimentos, rankingMunicipios, rankingProcedimentos } from './agregados';
import { formatarDescricao, nomeMes } from './formatacao';
import type { ResumoExecutivo } from './resumo';
import { totaisAnuais } from './series';
import type { AbaXlsx, CelulaXlsx } from './xlsx';

const arredondar = (v: number, casas = 2): number => Number(v.toFixed(casas));

/** Abas da planilha do relatório: resumo, série, evolução anual e rankings do ano escolhido. */
export function montarAbasRelatorio(
  resumo: ResumoExecutivo,
  p: PrevisaoSaida | null,
  s: SerieMensal | null,
  ag: AgregadosProducao | null,
  anoRanking: number,
): AbaXlsx[] {
  const mes = resumo.mesFinal ? nomeMes(resumo.mesFinal, true) : '';
  const indisponivel = 'Indisponível';
  const linhasResumo: CelulaXlsx[][] = [
    [`Procedimentos realizados em ${resumo.ano} (jan–${mes})`, resumo.totalObservado ?? indisponivel, resumo.apiDisponivel ? 'API (POST /predict)' : 'Série mensal versionada'],
    [`Mesmo período de ${resumo.ano - 1}`, resumo.mesmoPeriodoAnterior ?? indisponivel, 'Série mensal versionada (SIH/SUS)'],
    ['Variação sobre o mesmo período (%)', resumo.variacao === null ? indisponivel : arredondar(resumo.variacao), 'Calculada'],
    [`Projeção de ${resumo.faixaPrevista ?? 'meses restantes'} (previsto)`, resumo.previsto ?? indisponivel, 'Modelo XGBoost via API; não é produção realizada'],
    [`Total anual projetado de ${resumo.ano} (realizado + previsto)`, resumo.projetado ?? indisponivel, 'Modelo XGBoost via API'],
    [`Municípios com procedimentos (atendimento) de ${resumo.totalMunicipios}`, resumo.municipios ?? indisponivel, 'Backup CSV do SIH/SUS'],
    ['Estabelecimentos (CNES) com procedimentos', resumo.estabelecimentos ?? indisponivel, 'Backup CSV do SIH/SUS'],
    ['Tipos de procedimentos (códigos SIGTAP)', resumo.tipos ?? indisponivel, 'Backup CSV do SIH/SUS'],
    ['Última competência observada', resumo.competencia ?? indisponivel, ''],
    ['Gerado em', new Date().toLocaleString('pt-BR'), 'SUSPrev SC'],
  ];

  const abas: AbaXlsx[] = [{ nome: 'Resumo', cabecalho: ['Indicador', 'Valor', 'Origem / observação'], linhas: linhasResumo, larguras: [58, 18, 52] }];

  if (s) {
    const linhas: CelulaXlsx[][] = s.registros.map((r) => [r.ano, r.mes, `${nomeMes(r.mes)}/${r.ano}`, r.quantidade, 'Observado']);
    if (p) for (const m of p.meses) if (m.tipo === 'previsto') linhas.push([m.ano, m.mes, `${nomeMes(m.mes)}/${m.ano}`, m.quantidade, 'Previsto (XGBoost)']);
    abas.push({ nome: 'Série mensal', cabecalho: ['Ano', 'Mês', 'Competência', 'Procedimentos', 'Tipo'], linhas });

    const anuais = totaisAnuais(s.registros).map((t) => {
      const ehProj = p !== null && p.ano === t.ano;
      return [t.ano, t.total, t.mesesComDados, ehProj ? p.total_anual_projetado : t.completo ? t.total : null, t.completo ? 'Ano completo' : `Parcial (${t.mesesComDados} meses)`] as CelulaXlsx[];
    });
    abas.push({ nome: 'Evolução anual', cabecalho: ['Ano', 'Realizado', 'Meses observados', 'Total do ano (realizado ou projetado)', 'Situação'], linhas: anuais });
  }

  if (ag) {
    const at = rankingMunicipios(ag, anoRanking, 'atendimento');
    const re = new Map(rankingMunicipios(ag, anoRanking, 'residencia').map((r) => [r.codigo, r.quantidade]));
    abas.push({
      nome: `Municípios ${anoRanking}`,
      cabecalho: ['Posição', 'Código IBGE (6)', 'Município', 'Região de saúde', 'Procedimentos (atendimento)', '% do total do estado', 'Procedimentos (residência)'],
      linhas: at.map((r, i) => [i + 1, r.codigo, r.nome, r.regiaoSaude, r.quantidade, arredondar(r.participacao), re.get(r.codigo) ?? 0]),
    });
    abas.push({
      nome: `Procedimentos ${anoRanking}`,
      cabecalho: ['Posição', 'Código SIGTAP', 'Procedimento', 'Procedimentos', '% do total', 'Mesmo período do ano anterior', 'Variação (%)'],
      linhas: rankingProcedimentos(ag, anoRanking)
        .filter((r) => r.quantidade > 0)
        .map((r, i) => [i + 1, r.codigo, formatarDescricao(r.descricao) || 'Descrição indisponível', r.quantidade, arredondar(r.participacao), r.anterior, r.variacaoPercentual === null ? null : arredondar(r.variacaoPercentual)]),
      larguras: [9, 16, 60, 15, 12, 18, 14],
    });
    abas.push({
      nome: `Estabelecimentos ${anoRanking}`,
      cabecalho: ['Posição', 'CNES', 'Estabelecimento', 'Município', 'Procedimentos', '% do total'],
      linhas: rankingEstabelecimentos(ag, anoRanking).map((r, i) => [i + 1, r.cnes, r.nome ?? 'Nome não disponível', r.municipio, r.quantidade, arredondar(r.participacao)]),
    });
  }

  abas.push({
    nome: 'Notas',
    cabecalho: ['Nota'],
    linhas: [
      ['Fonte: SIH/SUS (DATASUS), procedimentos cirúrgicos eletivos de Santa Catarina. Descrições: SIGTAP, Tabela Unificada 202608. Municípios: IBGE.'],
      ['Valores "Realizado" são produção registrada. "Previsto" e "Projetado" são estimativas do modelo XGBoost e não representam produção realizada.'],
      ['Município de atendimento: onde o procedimento foi realizado. Município de residência: onde o paciente mora (residentes de outros estados não aparecem nos rankings municipais).'],
      ['A contagem é de procedimentos (atos cirúrgicos), não de pacientes nem de pessoas em fila de espera.'],
      ['A API não informa intervalo de confiança da previsão.'],
    ],
    larguras: [140],
  });
  return abas;
}
