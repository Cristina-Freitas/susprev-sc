
import pandas as pd
import pytest

from src.data.conversao_sih import converter_dbc


def test_converter_dbc(monkeypatch, tmp_path):
    arquivo_dbc = tmp_path / "RDSC2401.dbc"
    arquivo_dbc.touch()

    dados_esperados = pd.DataFrame({
        "ANO_CMPT": ["2024"],
        "MES_CMPT": ["01"],
        "CAR_INT": ["01"],
        "PROC_REA": ["0401010015"],
    })

    def conversao_simulada(origem, destino):
        Path(destino).touch()

    class DBFSimulado:
        def __init__(self, *args, **kwargs):
            pass

        def __iter__(self):
            return iter(dados_esperados.to_dict("records"))

    from pathlib import Path

    monkeypatch.setattr(
        "src.data.conversao_sih.dbc2dbf",
        conversao_simulada,
    )
    monkeypatch.setattr(
        "src.data.conversao_sih.DBF",
        DBFSimulado,
    )

    resultado = converter_dbc(arquivo_dbc)

    pd.testing.assert_frame_equal(resultado, dados_esperados)


def test_converter_dbc_arquivo_inexistente(tmp_path):
    with pytest.raises(FileNotFoundError):
        converter_dbc(tmp_path / "inexistente.dbc")
