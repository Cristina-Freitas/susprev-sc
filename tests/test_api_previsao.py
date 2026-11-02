import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def cliente():
    """Inicializa a API com seu ciclo de vida completo."""
    with TestClient(app) as test_client:
        yield test_client


def test_health(cliente):
    """Verifica se a API e o modelo estão disponíveis."""
    resposta = cliente.get("/health")

    assert resposta.status_code == 200
    assert resposta.json() == {
        "status": "ok",
        "modelo_carregado": True,
    }


def test_previsao_anual_2026(cliente):
    """Valida a projeção anual e seus totais."""
    resposta = cliente.post(
        "/predict",
        json={"ano": 2026},
    )

    assert resposta.status_code == 200

    dados = resposta.json()

    assert dados["ano"] == 2026
    assert dados["ultima_competencia_observada"] == "2026-08"
    assert len(dados["meses"]) == 12

    observados = [
        mes for mes in dados["meses"]
        if mes["tipo"] == "observado"
    ]

    previstos = [
        mes for mes in dados["meses"]
        if mes["tipo"] == "previsto"
    ]

    assert [mes["mes"] for mes in observados] == list(range(1, 9))
    assert [mes["mes"] for mes in previstos] == list(range(9, 13))

    assert dados["total_observado"] == sum(
        mes["quantidade"] for mes in observados
    )

    assert dados["total_previsto"] == sum(
        mes["quantidade"] for mes in previstos
    )

    assert dados["total_anual_projetado"] == (
        dados["total_observado"] + dados["total_previsto"]
    )


@pytest.mark.parametrize("ano", [2025, 2027])
def test_rejeita_ano_nao_suportado(cliente, ano):
    """Verifica a validação Pydantic da competência."""
    resposta = cliente.post(
        "/predict",
        json={"ano": ano},
    )

    assert resposta.status_code == 422


def test_rejeita_mes_invalido(cliente):
    """Rejeita campos não previstos no contrato da API."""
    resposta = cliente.post(
        "/predict",
        json={"ano": 2026, "mes": 13},
    )

    assert resposta.status_code == 422


def test_rejeita_json_invalido(cliente):
    """Verifica a rejeição de tipos incorretos."""
    resposta = cliente.post(
        "/predict",
        json={"ano": "invalido"},
    )

    assert resposta.status_code == 422


def test_historico_modelo_consistente_com_banco(cliente):
    """Confere os dados do modelo com a série mensal do SQLite."""

    servico = cliente.app.state.servico_previsao

    # O artefato contém os últimos 12 meses observados.
    assert len(servico.historico) == 12

    # Última competência utilizada no treinamento.
    assert servico.ultima_competencia.strftime("%Y-%m") == "2026-08"

    # Consulta a série observada pelo serviço.
    from src.data.banco_sih import consultar_procedimentos_mensais

    dados_2026 = consultar_procedimentos_mensais(2026)

    quantidades_2026 = [
        int(registro["quantidade"])
        for registro in dados_2026
    ]

    # Janeiro a agosto de 2026 correspondem às
    # últimas oito posições do histórico do modelo.
    assert quantidades_2026 == servico.historico[-8:]

def test_modelo_carregado_uma_vez_no_lifespan(monkeypatch):
    """Garante um único carregamento do modelo por inicialização."""
    from app import main as modulo_main

    carregamentos = []
    servico_original = modulo_main.ServicoPrevisao

    def criar_servico(*args, **kwargs):
        carregamentos.append(1)
        return servico_original(*args, **kwargs)

    monkeypatch.setattr(
        modulo_main, "ServicoPrevisao", criar_servico
    )

    with TestClient(modulo_main.app) as cliente:
        assert len(carregamentos) == 1

        cliente.get("/health")
        cliente.get("/health")

        assert len(carregamentos) == 1

def test_erro_400_regra_negocio(cliente, monkeypatch):
    """Verifica erro de negócio tratado com HTTP 400."""
    servico = cliente.app.state.servico_previsao

    def simular_erro(ano):
        raise ValueError("Regra de negócio inválida.")

    monkeypatch.setattr(servico, "prever_ano", simular_erro)

    resposta = cliente.post("/predict", json={"ano": 2026})

    assert resposta.status_code == 400
    assert resposta.json()["detail"] == "Regra de negócio inválida."


def test_erro_500_falha_interna(monkeypatch):
    """Verifica HTTP 500 sem expor detalhes internos."""
    from app.services.previsao import ServicoPrevisao

    def simular_erro(self, ano):
        raise RuntimeError("Falha interna simulada.")

    monkeypatch.setattr(
        ServicoPrevisao,
        "prever_ano",
        simular_erro,
    )

    with TestClient(app, raise_server_exceptions=False) as cliente:
        resposta = cliente.post("/predict", json={"ano": 2026})

    assert resposta.status_code == 500
    assert "Falha interna simulada" not in resposta.text
