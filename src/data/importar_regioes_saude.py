
"""
Importa as regiões de saúde dos municípios de Santa Catarina
a partir da base oficial do Ministério da Saúde.

Executar na raiz do projeto:
    python -m src.data.importar_regioes_saude
"""

import csv
import io
import sqlite3
import zipfile
from pathlib import Path

from src.data.banco_sih import CAMINHO_BANCO, criar_tabelas


CAMINHO_ZIP = Path(
    "data/raw/referencias/macroregiao_de_saude_csv.zip"
)

COLUNAS_OBRIGATORIAS = {
    "sg_uf",
    "cod_municipio",
    "no_municipio",
    "regiao_de_saude",
}


def normalizar_codigo(codigo):
    """Converte o código IBGE para o padrão de 6 dígitos do SIH."""

    codigo = str(codigo).strip()

    if not codigo.isdigit():
        raise ValueError(f"Código municipal inválido: {codigo!r}")

    if len(codigo) == 7:
        return codigo[:6]

    if len(codigo) == 6:
        return codigo

    raise ValueError(
        f"Código municipal com tamanho inesperado: {codigo}"
    )


def ler_regioes():
    """Lê os municípios catarinenses do CSV oficial compactado."""

    if not CAMINHO_ZIP.is_file():
        raise FileNotFoundError(
            f"Arquivo não encontrado: {CAMINHO_ZIP}"
        )

    with zipfile.ZipFile(CAMINHO_ZIP) as arquivo_zip:
        arquivos_csv = [
            nome
            for nome in arquivo_zip.namelist()
            if nome.lower().endswith(".csv")
        ]

        if not arquivos_csv:
            raise ValueError("O ZIP não contém arquivo CSV.")

        nome_csv = next(
            (
                nome
                for nome in arquivos_csv
                if Path(nome).name.lower()
                == "macroregiao_de_saude.csv"
            ),
            arquivos_csv[0],
        )

        with arquivo_zip.open(nome_csv) as arquivo:
            conteudo = arquivo.read()

    texto = conteudo.decode("utf-8-sig")

    leitor = csv.DictReader(
        io.StringIO(texto),
        delimiter=";",
    )

    colunas = set(leitor.fieldnames or [])
    ausentes = COLUNAS_OBRIGATORIAS - colunas

    if ausentes:
        raise ValueError(
            f"Colunas ausentes no CSV: {sorted(ausentes)}"
        )

    regioes = {}

    for linha in leitor:
        if linha["sg_uf"].strip().upper() != "SC":
            continue

        codigo = normalizar_codigo(linha["cod_municipio"])
        regiao = linha["regiao_de_saude"].strip()

        if not regiao:
            raise ValueError(
                f"Região de saúde vazia para o município {codigo}."
            )

        if codigo in regioes and regioes[codigo] != regiao:
            raise ValueError(
                f"Regiões conflitantes para o município {codigo}: "
                f"{regioes[codigo]!r} e {regiao!r}"
            )

        regioes[codigo] = regiao

    return regioes


def main():
    """Valida a correspondência e atualiza as regiões no SQLite."""

    regioes = ler_regioes()

    criar_tabelas()

    with sqlite3.connect(CAMINHO_BANCO) as conexao:
        municipios = {
            str(codigo)
            for (codigo,) in conexao.execute(
                "SELECT codigo FROM municipios"
            ).fetchall()
        }

        faltantes = municipios - set(regioes)
        desconhecidos = set(regioes) - municipios

        if faltantes or desconhecidos:
            raise ValueError(
                "Incompatibilidade entre o IBGE e a base de regiões. "
                f"Municípios sem região: {sorted(faltantes)}. "
                f"Códigos não cadastrados: {sorted(desconhecidos)}. "
                "Banco não alterado."
            )

        if len(municipios) != 295:
            raise ValueError(
                f"Esperados 295 municípios; encontrados "
                f"{len(municipios)}. Banco não alterado."
            )

        conexao.executemany(
            """
            UPDATE municipios
            SET regiao_saude = ?
            WHERE codigo = ?
            """,
            [
                (regiao, codigo)
                for codigo, regiao in regioes.items()
            ],
        )

        total_preenchidos = conexao.execute(
            """
            SELECT COUNT(*)
            FROM municipios
            WHERE regiao_saude IS NOT NULL
              AND TRIM(regiao_saude) <> ''
            """
        ).fetchone()[0]

        if total_preenchidos != 295:
            raise ValueError(
                "Nem todos os municípios receberam uma região. "
                "Atualização cancelada."
            )

        conexao.commit()

    print("Importação concluída com sucesso!")
    print(f"Municípios atualizados: {total_preenchidos}")
    print(f"Regiões de saúde: {len(set(regioes.values()))}")
    print("Fonte: Ministério da Saúde — OpenDataSUS")
    print("Produção cirúrgica histórica preservada.")


if __name__ == "__main__":
    main()
