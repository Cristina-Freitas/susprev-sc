import { dadosDe, useDados } from '../../context/DadosContext';

/** Indicador do estado da API (GET /health e POST /predict). */
export function StatusApi() {
  const { saude, previsao } = useDados();

  if (saude.estado === 'carregando') {
    return (
      <span className="status-api status-api--carregando" role="status">
        <span className="status-api__ponto" aria-hidden="true" />
        Verificando API…
      </span>
    );
  }

  const dadosSaude = dadosDe(saude);
  if (!dadosSaude) {
    return (
      <span className="status-api status-api--erro" role="status" title={saude.estado === 'erro' ? saude.erro : ''}>
        <span className="status-api__ponto" aria-hidden="true" />
        API indisponível
      </span>
    );
  }

  if (!dadosSaude.modelo_carregado || previsao.estado === 'erro') {
    return (
      <span className="status-api status-api--alerta" role="status">
        <span className="status-api__ponto" aria-hidden="true" />
        {dadosSaude.modelo_carregado ? 'Previsão indisponível' : 'Modelo não carregado'}
      </span>
    );
  }

  return (
    <span
      className="status-api status-api--ok"
      role="status"
      title="GET /health: status ok, modelo carregado. POST /predict respondeu com sucesso."
    >
      <span className="status-api__ponto" aria-hidden="true" />
      API online
    </span>
  );
}
