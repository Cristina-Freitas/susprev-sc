
"""
Importa nomes oficiais dos estabelecimentos de Santa Catarina pelo CNES/DATASUS.

Executar na raiz do projeto:
    python -m src.data.importar_estabelecimentos_cnes

Fonte: FTP DATASUS, CNES, arquivo ST, competência 08/2026.
"""

import shutil
import sqlite3
import tempfile
from ftplib import FTP
from pathlib import Path

import pandas as pd
from dbfread import DBF
from pyreaddbc import dbc2dbf

from src.data.banco_sih import (
    CAMINHO_BANCO,
    criar_tabelas_referencia,
    importar_referencia,
)


ANO, MES = 2026, 8
FTP_HOST = "ftp.datasus.gov.br"
FTP_PASTA = "/dissemin/publicos/CNES/200508_/Dados/ST"
ARQUIVO = f"STSC{ANO % 100:02d}{MES:02d}.dbc"
PASTA_REFERENCIAS = Path("data/raw/referencias")


def obter_arquivo():
    """Obtém o cadastro CNES, reutilizando o arquivo existente."""

    PASTA_REFERENCIAS.mkdir(parents=True, exist_ok=True)
    destino = PASTA_REFERENCIAS / ARQUIVO

    if destino.is_file() and destino.stat().st_size > 0:
        print(f"Utilizando arquivo existente: {destino}")
        return destino

    temporario = destino.with_suffix(".dbc.part")

    try:
        with FTP(FTP_HOST, timeout=90) as ftp:
            ftp.login()
            ftp.cwd(FTP_PASTA)

            with temporario.open("wb") as arquivo:
                ftp.retrbinary(f"RETR {ARQUIVO}", arquivo.write)

        temporario.replace(destino)

    except Exception:
        temporario.unlink(missing_ok=True)
        raise

    print(f"Cadastro oficial baixado: {destino}")
    return destino


def carregar_estabelecimentos(caminho):
    """Converte o DBC e padroniza os campos para o banco do SUSPrev."""

    caminho = Path(caminho)

    # Evita caracteres acentuados no caminho utilizado pelo conversor.
    with tempfile.TemporaryDirectory(
        prefix="cnes_",
        dir="C:/",
    ) as pasta:
        pasta = Path(pasta)

        dbc_temporario = pasta / "estabelecimentos.dbc"
        dbf_temporario = pasta / "estabelecimentos.dbf"

        shutil.copy2(caminho, dbc_temporario)

        dbc2dbf(
            str(dbc_temporario),
            str(dbf_temporario),
        )

        if not dbf_temporario.is_file():
            raise RuntimeError(
                "A conversão do arquivo CNES para DBF falhou."
            )

        tabela = DBF(
            str(dbf_temporario),
            encoding="latin1",
            char_decode_errors="replace",
            load=False,
        )

        dados = pd.DataFrame(iter(tabela))

    if dados.empty:
        raise ValueError("O arquivo CNES não contém registros.")

    # Os nomes originais do DATASUS são normalizados.
    dados.columns = [
        str(coluna).strip().upper()
        for coluna in dados.columns
    ]

    print("Campos CNES encontrados:", list(dados.columns))

    def localizar_coluna(opcoes, obrigatoria=True):
        for coluna in opcoes:
            if coluna in dados.columns:
                return coluna

        if obrigatoria:
            raise ValueError(
                f"Nenhuma das colunas {opcoes} foi encontrada. "
                f"Campos disponíveis: {list(dados.columns)}"
            )

        return None

    coluna_cnes = localizar_coluna(["CNES", "CO_CNES"])
    coluna_nome = localizar_coluna(
        ["FANTASIA", "NO_FANTASIA", "NOME_FANTASIA", "RAZ_SOC"]
    )
    coluna_municipio = localizar_coluna(
        ["CODUFMUN", "CO_MUNICIPIO_GESTOR", "CO_MUNICIPIO"],
        obrigatoria=False,
    )

    resultado = pd.DataFrame()

    resultado["cnes"] = (
        dados[coluna_cnes]
        .astype("string")
        .str.strip()
        .str.zfill(7)
    )

    resultado["nome"] = (
        dados[coluna_nome]
        .astype("string")
        .str.strip()
    )

    if coluna_municipio:
        resultado["municipio_codigo"] = (
            dados[coluna_municipio]
            .astype("string")
            .str.strip()
            .str[:6]
        )
    else:
        resultado["municipio_codigo"] = None

    resultado = resultado[
        resultado["cnes"].str.fullmatch(r"\d{7}", na=False)
        & resultado["nome"].notna()
        & resultado["nome"].ne("")
    ].copy()

    # Um cadastro por CNES.
    resultado = resultado.drop_duplicates(
        subset=["cnes"],
        keep="last",
    )

    return resultado


def main():
    """Importa estabelecimentos e verifica a cobertura do histórico SIH."""

    caminho = obter_arquivo()
    dados = carregar_estabelecimentos(caminho)

    criar_tabelas_referencia()

    with sqlite3.connect(CAMINHO_BANCO) as conexao:
        usados = {
            str(codigo).strip().zfill(7)
            for (codigo,) in conexao.execute(
                "SELECT DISTINCT cnes FROM producao_cirurgica"
            )
            if codigo is not None
            and str(codigo).strip().isdigit()
        }

    dados = dados[dados["cnes"].isin(usados)].copy()

    if dados.empty:
        raise ValueError(
            "Nenhum CNES do cadastro corresponde ao histórico. "
            "Banco não alterado."
        )

    total = importar_referencia("estabelecimentos", dados)

    identificados = set(dados["cnes"])
    ausentes = sorted(usados - identificados)

    print(f"Estabelecimentos importados: {total}")
    print(f"CNES distintos no histórico: {len(usados)}")
    print(
        f"CNES não encontrados no cadastro "
        f"{MES:02d}/{ANO}: {len(ausentes)}"
    )

    if ausentes:
        print(
            "Exemplos não identificados:",
            ", ".join(ausentes[:15]),
        )
        print(
            "Os CNES históricos ausentes exigirão "
            "consulta a competências anteriores."
        )

    print("Produção cirúrgica histórica preservada.")


if __name__ == "__main__":
    main()

