
import pandas as pd
import pytest

from src.data.classificacao_sih import filtrar_cirurgias_eletivas
from src.data.consolidacao_sih import (
    TIPO_INDICADOR,
    consolidar_rd,
)


@pytest.fixture
def dados_rd():
    """Simula registros RD de janeiro de 2024."""

    return pd.DataFrame(
        {
            "CAR_INT": [
                "01", "01", "01", "02", "01", "01"
            ],
            "PROC_REA": [
                "0401010015",
                "0401010015",
                "0402010010",
                "0401010015",
                "0301010010",
                "0401010015",
            ],
            "MUNIC_MOV": [
                "420540", "420540", "420910",
                "420540", "420540", "420540",
            ],
            "MUNIC_RES": [
                "420540", "420540", "420910",
                "420540", "420540", "420540",
            ],
            "CNES": [
                "1234567", "1234567", "7654321",
                "1234567", "1234567", "1234567",
            ],
        }
    )


def test_consolidacao_total_corresponde_ao_filtro(dados_rd):
    """A agregação deve preservar o total de registros filtrados."""

    filtrados = filtrar_cirurgias_eletivas(dados_rd)
    resultado = consolidar_rd(dados_rd, 2024, 1)

    assert resultado["quantidade"].sum() == len(filtrados)
    assert resultado["quantidade"].sum() == 4


def test_agrupamento_por_hospital_e_procedimento(dados_rd):
    """Registros com as mesmas dimensões devem ser agrupados."""

    resultado = consolidar_rd(dados_rd, 2024, 1)

    assert len(resultado) == 2
    assert sorted(resultado["quantidade"].tolist()) == [1, 3]


def test_competencia_e_indicador(dados_rd):
    """Verifica ano, mês e identificação do indicador."""

    resultado = consolidar_rd(dados_rd, 2024, 1)

    assert resultado["ano"].eq(2024).all()
    assert resultado["mes"].eq(1).all()
    assert resultado["tipo_indicador"].eq(TIPO_INDICADOR).all()


def test_preserva_codigos_como_texto(dados_rd):
    """Os identificadores não devem ser convertidos em números."""

    resultado = consolidar_rd(dados_rd, 2024, 1)

    assert resultado["cnes"].dtype.name == "string"
    assert resultado["municipio_atendimento"].dtype.name == "string"
    assert resultado["procedimento"].dtype.name == "string"


def test_sem_registros_eletivos(dados_rd):
    """A ausência de registros elegíveis deve gerar tabela vazia."""

    dados = dados_rd.copy()
    dados["CAR_INT"] = "02"

    resultado = consolidar_rd(dados, 2024, 1)

    assert resultado.empty
    assert list(resultado.columns) == [
        "ano",
        "mes",
        "tipo_indicador",
        "municipio_atendimento",
        "municipio_residencia",
        "cnes",
        "procedimento",
        "quantidade",
    ]


def test_rejeita_colunas_ausentes(dados_rd):
    """Não permite consolidar registros sem CNES."""

    dados = dados_rd.drop(columns=["CNES"])

    with pytest.raises(
        ValueError,
        match="Colunas obrigatórias ausentes",
    ):
        consolidar_rd(dados, 2024, 1)


@pytest.mark.parametrize(
    "ano,mes",
    [
        (2007, 1),
        (2024, 0),
        (2024, 13),
    ],
)
def test_rejeita_competencia_invalida(dados_rd, ano, mes):
    """Valida o período solicitado."""

    with pytest.raises(ValueError):
        consolidar_rd(dados_rd, ano, mes)
