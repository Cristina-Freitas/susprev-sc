
import sqlite3

import pandas as pd
import pytest

from src.data.banco_sih import (
    criar_tabelas,
    competencia_processada,
    salvar_producao,
    consultar_producao,
)


@pytest.fixture
def banco_temporario(tmp_path):
    """Cria um banco isolado para cada teste."""
    caminho = tmp_path / "susprev_teste.db"
    criar_tabelas(caminho)
    return caminho


@pytest.fixture
def dados_exemplo():
    """Simula indicadores mensais consolidados do SIH/SUS."""
    return pd.DataFrame(
        {
            "ano": [2024, 2024],
            "mes": [1, 1],
            "tipo_indicador": [
                "internacoes_cirurgicas_eletivas",
                "internacoes_cirurgicas_eletivas",
            ],
            "municipio_atendimento": ["420540", "420910"],
            "municipio_residencia": ["420540", "420910"],
            "cnes": ["1234567", "7654321"],
            "procedimento": ["0401010015", "0402010010"],
            "quantidade": [15, 8],
        }
    )


def test_criar_tabelas(banco_temporario):
    """Confirma que as duas tabelas foram criadas."""

    with sqlite3.connect(banco_temporario) as conexao:
        tabelas = {
            linha[0]
            for linha in conexao.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type = 'table'"
            )
        }

    assert "producao_cirurgica" in tabelas
    assert "competencias_processadas" in tabelas


def test_competencia_inicialmente_nao_processada(banco_temporario):
    """Uma competência nova não deve aparecer como processada."""

    assert not competencia_processada(
        2024,
        1,
        "internacoes_cirurgicas_eletivas",
        caminho=banco_temporario,
    )


def test_salvar_e_consultar_producao(
    banco_temporario,
    dados_exemplo,
):
    """Verifica se os registros são gravados corretamente."""

    salvar_producao(
        dados_exemplo,
        ano=2024,
        mes=1,
        tipo_indicador="internacoes_cirurgicas_eletivas",
        caminho=banco_temporario,
    )

    resultado = consultar_producao(banco_temporario)

    assert len(resultado) == 2
    assert resultado["quantidade"].sum() == 23


def test_marca_competencia_como_processada(
    banco_temporario,
    dados_exemplo,
):
    """Confirma o registro de uma competência concluída."""

    salvar_producao(
        dados_exemplo,
        ano=2024,
        mes=1,
        tipo_indicador="internacoes_cirurgicas_eletivas",
        caminho=banco_temporario,
    )

    assert competencia_processada(
        2024,
        1,
        "internacoes_cirurgicas_eletivas",
        caminho=banco_temporario,
    )


def test_reprocessamento_nao_duplica(
    banco_temporario,
    dados_exemplo,
):
    """Reprocessar uma competência substitui seus registros."""

    salvar_producao(
        dados_exemplo,
        ano=2024,
        mes=1,
        tipo_indicador="internacoes_cirurgicas_eletivas",
        caminho=banco_temporario,
    )

    novos_dados = dados_exemplo.copy()
    novos_dados["quantidade"] = [20, 10]

    salvar_producao(
        novos_dados,
        ano=2024,
        mes=1,
        tipo_indicador="internacoes_cirurgicas_eletivas",
        caminho=banco_temporario,
    )

    resultado = consultar_producao(banco_temporario)

    assert len(resultado) == 2
    assert resultado["quantidade"].sum() == 30


def test_rejeita_quantidade_negativa(
    banco_temporario,
    dados_exemplo,
):
    """Impede a gravação de quantidades negativas."""

    dados_invalidos = dados_exemplo.copy()
    dados_invalidos.loc[0, "quantidade"] = -5

    with pytest.raises(ValueError, match="Quantidade inválida"):
        salvar_producao(
            dados_invalidos,
            ano=2024,
            mes=1,
            tipo_indicador="internacoes_cirurgicas_eletivas",
            caminho=banco_temporario,
        )

    assert consultar_producao(banco_temporario).empty


def test_rejeita_competencia_incorreta(
    banco_temporario,
    dados_exemplo,
):
    """Impede gravar dados de um mês como se fossem de outro."""

    with pytest.raises(
        ValueError,
        match="não correspondem",
    ):
        salvar_producao(
            dados_exemplo,
            ano=2024,
            mes=2,
            tipo_indicador="internacoes_cirurgicas_eletivas",
            caminho=banco_temporario,
        )


def test_rejeita_colunas_ausentes(
    banco_temporario,
    dados_exemplo,
):
    """Verifica se os campos obrigatórios estão presentes."""

    dados_invalidos = dados_exemplo.drop(columns=["cnes"])

    with pytest.raises(
        ValueError,
        match="Colunas obrigatórias ausentes",
    ):
        salvar_producao(
            dados_invalidos,
            ano=2024,
            mes=1,
            tipo_indicador="internacoes_cirurgicas_eletivas",
            caminho=banco_temporario,
        )
