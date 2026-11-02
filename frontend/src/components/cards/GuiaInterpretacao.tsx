import { AlertCircle, CheckCircle2, HelpCircle, ShieldCheck } from 'lucide-react';

/**
 * Guia de interpretação dos indicadores para gestores e cidadãos,
 * assegurando transparência e evitando confusão conceitual.
 */
export function GuiaInterpretacao() {
  return (
    <ul className="lista-pontos" aria-label="Orientações de interpretação dos dados">
      <li>
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          <strong>Produção realizada, não fila:</strong> O sistema analisa cirurgias que foram efetivamente realizadas
          e faturadas no SUS, e <em>não</em> a quantidade de pessoas que aguardam por atendimento.
        </div>
      </li>
      <li>
        <CheckCircle2 size={18} aria-hidden="true" />
        <div>
          <strong>Procedimentos vs. Pacientes:</strong> A contagem é de atos cirúrgicos (grupo 04 do SIGTAP/SIH). Um
          mesmo paciente pode realizar múltiplos procedimentos em uma mesma internação.
        </div>
      </li>
      <li>
        <AlertCircle size={18} aria-hidden="true" />
        <div>
          <strong>Previsão estatística:</strong> Os valores de set–dez/2026 são estimativas calculadas pelo algoritmo
          XGBoost a partir da série temporal. Não representam metas governamentais.
        </div>
      </li>
      <li>
        <HelpCircle size={18} aria-hidden="true" />
        <div>
          <strong>Recorte geográfico:</strong> Dados referentes a procedimentos financiados pelo SUS no estado de Santa
          Catarina (SIH/SUS - DATASUS).
        </div>
      </li>
    </ul>
  );
}
