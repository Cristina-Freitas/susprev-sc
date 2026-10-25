
from pathlib import Path

import pytest

from src.data.extracao_sih import extrair_sih


class FTPSimulado:
    """Simula o servidor FTP do DATASUS."""

    comandos = []

    def __init__(self, servidor, timeout):
        assert servidor == "ftp.datasus.gov.br"
        assert timeout == 120

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def login(self):
        pass

    def cwd(self, diretorio):
        assert diretorio == "/dissemin/publicos/SIHSUS/200801_/Dados"

    def retrbinary(self, comando, callback):
        self.comandos.append(comando)
        callback(b"arquivo-dbc-simulado")


@pytest.mark.parametrize(
    "tipo,nome_esperado",
    [
        ("RD", "RDSC2401.dbc"),
        ("SP", "SPSC2401.dbc"),
    ],
)
def test_download_rd_sp(tmp_path, monkeypatch, tipo, nome_esperado):
    FTPSimulado.comandos = []

    monkeypatch.setattr(
        "src.data.extracao_sih.FTP",
        FTPSimulado,
    )

    arquivo = extrair_sih(
        ano=2024,
        mes=1,
        tipo=tipo,
        diretorio=tmp_path,
    )

    assert arquivo == tmp_path / nome_esperado
    assert arquivo.read_bytes() == b"arquivo-dbc-simulado"
    assert FTPSimulado.comandos == [f"RETR {nome_esperado}"]
    assert not arquivo.with_suffix(".dbc.part").exists()


def test_reutiliza_arquivo_existente(tmp_path, monkeypatch):
    arquivo_existente = tmp_path / "RDSC2401.dbc"
    arquivo_existente.write_bytes(b"arquivo-existente")

    def ftp_nao_deve_ser_chamado(*args, **kwargs):
        raise AssertionError("FTP não deveria ser acessado.")

    monkeypatch.setattr(
        "src.data.extracao_sih.FTP",
        ftp_nao_deve_ser_chamado,
    )

    resultado = extrair_sih(
        ano=2024,
        mes=1,
        diretorio=tmp_path,
    )

    assert resultado == arquivo_existente
    assert resultado.read_bytes() == b"arquivo-existente"


@pytest.mark.parametrize(
    "parametros",
    [
        {"ano": 2007, "mes": 1},
        {"ano": 2024, "mes": 0},
        {"ano": 2024, "mes": 13},
        {"ano": 2024, "mes": 1, "uf": "INVALIDA"},
        {"ano": 2024, "mes": 1, "tipo": "XX"},
    ],
)
def test_rejeita_parametros_invalidos(tmp_path, parametros):
    with pytest.raises(ValueError):
        extrair_sih(
            **parametros,
            diretorio=tmp_path,
        )


def test_remove_download_parcial_em_caso_de_erro(
    tmp_path,
    monkeypatch,
):
    class FTPComFalha(FTPSimulado):
        def retrbinary(self, comando, callback):
            callback(b"download-incompleto")
            raise ConnectionError("Conexão interrompida")

    monkeypatch.setattr(
        "src.data.extracao_sih.FTP",
        FTPComFalha,
    )

    with pytest.raises(ConnectionError):
        extrair_sih(
            ano=2024,
            mes=1,
            diretorio=tmp_path,
        )

    assert not (tmp_path / "RDSC2401.dbc").exists()
    assert not (tmp_path / "RDSC2401.dbc.part").exists()
