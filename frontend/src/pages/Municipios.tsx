import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DistribuicaoMunicipal } from '../components/map/DistribuicaoMunicipal';
import { Carregando, EstadoErro } from '../components/ui/Estados';
import { Painel } from '../components/ui/Painel';
import { Segmentado } from '../components/ui/Segmentado';
import { SeletorAno } from '../components/ui/SeletorAno';
import { dadosDe, useDados } from '../context/DadosContext';
import { rankingMunicipios } from '../utils/agregados';
import { formatarNumero, formatarPercentual, nomeMes } from '../utils/formatacao';
import type { Dimensao } from '../types/dados';

export function PaginaMunicipios() {
  const { agregados } = useDados();
  const ag = dadosDe(agregados);
  const [ano, setAno] = useState<number | null>(null);
  const [dimensao, setDimensao] = useState<Dimensao>('atendimento');
  const [busca, setBusca] = useState('');
  const [regiao, setRegiao] = useState('todas');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const anoAtual = ano ?? ag?.ano_corrente ?? 0;
  const ranking = useMemo(() => (ag ? rankingMunicipios(ag, anoAtual, dimensao) : []), [ag, anoAtual, dimensao]);
  const regioes = useMemo(
    () => [...new Set(ranking.map((r) => r.regiaoSaude).filter((r): r is string => !!r))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [ranking],
  );
  const linhas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return ranking
      .map((r, i) => ({ ...r, posicao: i + 1 }))
      .filter((r) => (regiao === 'todas' || r.regiaoSaude === regiao) && (!termo || r.nome.toLocaleLowerCase('pt-BR').includes(termo)));
  }, [ranking, busca, regiao]);

  if (agregados.estado === 'carregando') return <div className="pagina"><Carregando /></div>;
  if (agregados.estado === 'erro' || !ag) {
    return (
      <div className="pagina">
        <EstadoErro mensagem={agregados.estado === 'erro' ? agregados.erro : 'Dados indisponíveis.'} />
      </div>
    );
  }

  const maximo = ranking[0]?.quantidade ?? 1;
  const ehResidencia = dimensao === 'residencia';
  const foraSC = ag.qualidade.residencia_fora_de_sc_ou_ignorada_por_ano[ag.anos.indexOf(anoAtual)] ?? 0;

  return (
    <div className="pagina">
      <div className="pagina__topo">
        <div>
          <h2 className="pagina__titulo">Produção cirúrgica por município</h2>
          <p className="pagina__descricao">
            {formatarNumero(ranking.length)} de {formatarNumero(ag.total_municipios_sc)} municípios de SC com procedimentos registrados em {anoAtual}.
          </p>
        </div>
        <div className="pagina__filtros">
          <SeletorAno id="ano-municipios" anos={ag.anos} valor={anoAtual} aoMudar={setAno} anoCorrente={ag.ano_corrente} mesFinal={nomeMes(ag.mes_final_ano_corrente)} />
          <Segmentado
            rotulo="Dimensão territorial"
            valor={dimensao}
            aoMudar={setDimensao}
            opcoes={[
              { valor: 'atendimento', rotulo: 'Atendimento' },
              { valor: 'residencia', rotulo: 'Residência' },
            ]}
          />
        </div>
      </div>

      <div className="aviso aviso--info" role="note">
        <div>
          <strong>{ehResidencia ? 'Município de residência' : 'Município de atendimento'}:</strong>{' '}
          {ehResidencia
            ? `onde o paciente mora. ${formatarNumero(foraSC)} procedimentos de ${anoAtual} são de residentes de outros estados ou sem município informado e não aparecem no ranking.`
            : 'onde o procedimento foi realizado. É a dimensão usada na Visão Geral.'}{' '}
          Os percentuais usam como base o total de procedimentos do estado no ano.
        </div>
      </div>

      <div className="grade-7-5 grade-7-5--alta">
        <Painel
          id="painel-lista-municipios"
          titulo="Ranking de municípios"
          subtitulo="Ordenado por procedimentos realizados no ano selecionado"
          acoes={
            <div className="filtros-lista">
              <label className="busca">
                <Search size={14} aria-hidden="true" />
                <span className="visualmente-oculto">Buscar município</span>
                <input type="search" placeholder="Buscar município" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </label>
              <select aria-label="Região de saúde" value={regiao} onChange={(e) => setRegiao(e.target.value)}>
                <option value="todas">Todas as regiões</option>
                {regioes.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          }
        >
          <div className="tabela-container">
            <table className="tabela tabela--compacta">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Município</th>
                  <th>Região de saúde</th>
                  <th className="num">Procedimentos</th>
                  <th className="num">% do total</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr
                    key={l.codigo}
                    className={selecionado === l.codigo ? 'tabela__destaque' : undefined}
                    onClick={() => setSelecionado(selecionado === l.codigo ? null : l.codigo)}
                  >
                    <td className="num">{l.posicao}</td>
                    <td>{l.nome}</td>
                    <td>{l.regiaoSaude ?? '—'}</td>
                    <td className="num">{formatarNumero(l.quantidade)}</td>
                    <td className="num">{formatarPercentual(l.participacao, 2)}</td>
                    <td style={{ width: 90 }}>
                      <span className="barra-inline" style={{ width: `${(l.quantidade / maximo) * 100}%` }} />
                    </td>
                  </tr>
                ))}
                {!linhas.length && (
                  <tr>
                    <td colSpan={6}>Nenhum município encontrado para o filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Painel>

        <Painel id="painel-mapa-municipios" titulo={`Mapa (${anoAtual})`} subtitulo="Clique em um município para fixá-lo">
          <DistribuicaoMunicipal ano={anoAtual} dimensao={dimensao} selecionado={selecionado} aoSelecionar={setSelecionado} />
        </Painel>
      </div>
    </div>
  );
}
