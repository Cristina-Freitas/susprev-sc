import { AlertCircle, Ambulance, ExternalLink, HeartPulse, Hospital, Stethoscope } from 'lucide-react';
import { Painel } from '../components/ui/Painel';
import { URL_BACKEND } from '../services/api';

export function PaginaSobreProjeto() {
  return (
    <div className="pagina">
      <div className="pagina__topo">
        <div>
          <h2 className="pagina__titulo">Sobre o Projeto SUSPrev SC</h2>
          <p className="pagina__descricao">
            Sistema de Análise Preditiva de Cirurgias Eletivas do SUS em Santa Catarina e Guia de Acesso ao SUS para a População.
          </p>
        </div>
      </div>

      <Painel
        id="painel-orientacao-cidadao"
        titulo="Guia de Orientação ao Cidadão — Como funciona a rede do SUS?"
        subtitulo="Entenda onde buscar atendimento e como funciona o fluxo das cirurgias eletivas"
        dica="Informações educativas de utilidade pública para orientar o cidadão catarinense sobre a porta de entrada e o fluxo de encaminhamento cirúrgico no SUS."
      >
        <div className="grade-4" style={{ marginBottom: '16px' }}>
          <div className="orientacao orientacao--ubs">
            <div className="orientacao__icone">
              <Stethoscope size={24} aria-hidden="true" />
            </div>
            <h3 className="orientacao__titulo">UBS / Posto de Saúde</h3>
            <p className="orientacao__texto">
              <strong>Atenção Primária:</strong> É a porta de entrada do SUS no seu bairro. Realiza consultas com médicos
              de família, exames básicos, vacinação e é onde o médico emite o laudo para encaminhamento a especialistas e
              avaliação cirúrgica.
            </p>
          </div>

          <div className="orientacao orientacao--upa">
            <div className="orientacao__icone">
              <HeartPulse size={24} aria-hidden="true" />
            </div>
            <h3 className="orientacao__titulo">UPA 24h / Pronto Atendimento</h3>
            <p className="orientacao__texto">
              <strong>Urgência e Emergência:</strong> Atendimento intermediário para situações agudas (pressão alta grave,
              febre persistente, fraturas, dores agudas). <em>Não realiza agendamento de cirurgias eletivas</em>.
            </p>
          </div>

          <div className="orientacao orientacao--hospital">
            <div className="orientacao__icone">
              <Hospital size={24} aria-hidden="true" />
            </div>
            <h3 className="orientacao__titulo">Hospital Especializado</h3>
            <p className="orientacao__texto">
              <strong>Atenção Especializada e Cirúrgica:</strong> Realiza as cirurgias eletivas mediante agendamento prévio
              pela Central Estadual ou Municipal de Regulação (SISREG). O acesso é sempre via encaminhamento formal.
            </p>
          </div>

          <div className="orientacao orientacao--samu">
            <div className="orientacao__icone">
              <Ambulance size={24} aria-hidden="true" />
            </div>
            <h3 className="orientacao__titulo">
              SAMU <span>192</span>
            </h3>
            <p className="orientacao__texto">
              <strong>Socorro Imediato:</strong> Disque 192 gratuitamente em casos de risco iminente à vida (acidentes de
              trânsito, infarto, AVC, paradas cardiorrespiratórias e traumas graves).
            </p>
          </div>
        </div>

        <div className="aviso aviso--info">
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <strong>Aviso de Utilidade Pública:</strong> O SUSPrev SC é uma ferramenta de inteligência em dados e
            projeções estatísticas agregadas. <strong>Não realiza diagnóstico, triagem médica individualizada nem consulta listas de espera nominais</strong>.
            Para consultar sua posição na fila ou agendamentos, procure a Unidade Básica de Saúde do seu município ou a Ouvidoria do SUS SC.
          </div>
        </div>
      </Painel>

      <div className="grade-2">
        <Painel
          id="painel-contexto-institucional"
          titulo="Objetivos e Contexto do Projeto"
          subtitulo="Inovação e ciência de dados aplicadas à gestão pública em Santa Catarina"
        >
          <div className="texto-corrido">
            <p>
              O <strong>SUSPrev SC</strong> foi concebido para responder a perguntas fundamentais de planejamento e
              transparência na gestão pública da saúde em Santa Catarina:
            </p>
            <ul>
              <li>Quantos procedimentos cirúrgicos eletivos foram realizados pelo SUS em SC desde 2019?</li>
              <li>Como a produção se recuperou e evoluiu nos anos posteriores à pandemia?</li>
              <li>Qual é o ritmo atual de produção observado em 2026?</li>
              <li>Qual é a estimativa estatística de fechamento para o restante do ano?</li>
            </ul>
            <p>
              O projeto foi desenvolvido no âmbito do programa <strong>SCTEC</strong>, na formação{' '}
              <strong>Desenvolvimento de IA para Análise Preditiva</strong>.
            </p>
            <p>
              <strong>Autoria:</strong> Cristina Freitas.
            </p>
          </div>
        </Painel>

        <Painel
          id="painel-arquitetura-tecnica"
          titulo="Tecnologias e Integração"
          subtitulo="Stack moderna, desacoplada e 100% aderente a dados reais"
        >
          <div className="texto-corrido">
            <dl className="resumo">
              <dt>Frontend:</dt>
              <dd>React 18, TypeScript, Vite, Recharts, Lucide React</dd>
              <dt>Estilização:</dt>
              <dd>CSS moderno com variáveis de tema e layout responsivo</dd>
              <dt>Backend:</dt>
              <dd>FastAPI (Python 3.12+), Pydantic v2, Uvicorn</dd>
              <dt>Modelo de IA:</dt>
              <dd>XGBoost (Extreme Gradient Boosting)</dd>
              <dt>Banco de Dados:</dt>
              <dd>SQLite (susprev_sc.db) e CSVs versionados</dd>
              <dt>Contratos da API:</dt>
              <dd>
                <code>GET /health</code> · <code>POST /predict</code>
              </dd>
            </dl>

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href={`${URL_BACKEND}/docs`}
                target="_blank"
                rel="noreferrer"
                className="botao botao--primario"
                style={{ textDecoration: 'none' }}
              >
                Documentação OpenAPI / Swagger <ExternalLink size={14} aria-hidden="true" />
              </a>
              <a
                href={`${URL_BACKEND}/redoc`}
                target="_blank"
                rel="noreferrer"
                className="botao"
                style={{ textDecoration: 'none' }}
              >
                ReDoc <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </Painel>
      </div>
    </div>
  );
}
