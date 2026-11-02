import pytest
from pydantic import ValidationError

from app.schemas.previsao import PrevisaoEntrada, PrevisaoSaida


def test_importacao_e_criacao_dos_schemas():
    """Verifica se os schemas podem ser instanciados."""

    entrada = PrevisaoEntrada(ano=2026)

    assert entrada.ano == 2026

    saida = PrevisaoSaida(
        ano=2026,
        ultima_competencia_observada="2026-08",
        modelo="XGBoost",
        total_observado=1000,
        total_previsto=500,
        total_anual_projetado=1500,
        meses=[],
    )

    assert saida.total_anual_projetado == 1500


def test_rejeita_ano_nao_suportado():
    """Verifica a validação do ano."""

    with pytest.raises(ValidationError):
        PrevisaoEntrada(ano=2027)


def test_rejeita_campos_desconhecidos():
    """Verifica se campos extras são rejeitados."""

    with pytest.raises(ValidationError):
        PrevisaoEntrada(ano=2026, campo_invalido=True)

from app.schemas.previsao import PrevisaoMensal


@pytest.mark.parametrize("mes", [0, 13])
def test_rejeita_mes_fora_dos_limites(mes):
    with pytest.raises(ValidationError):
        PrevisaoMensal(
            ano=2026,
            mes=mes,
            quantidade=100,
            tipo="observado",
        )


def test_rejeita_quantidade_negativa():
    with pytest.raises(ValidationError):
        PrevisaoMensal(
            ano=2026,
            mes=8,
            quantidade=-1,
            tipo="observado",
        )


def test_rejeita_texto_em_campo_numerico():
    with pytest.raises(ValidationError):
        PrevisaoMensal(
            ano=2026,
            mes="agosto",
            quantidade=100,
            tipo="observado",
        )
