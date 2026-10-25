import sqlite3
from pathlib import Path
import pandas as pd

CAMINHO_BANCO = Path("data/processed/susprev_sc.db")

COLUNAS_AGREGACAO = [
    "ano",
    "mes",
    "tipo_indicador",
    "municipio_atendimento",
    "municipio_residencia",
    "cnes",
    "procedimento",
]


def conectar_banco(caminho=CAMINHO_BANCO):
    """Abre conexão SQLite e cria a pasta do banco."""

    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)

    return sqlite3.connect(caminho)


def criar_tabelas(caminho=CAMINHO_BANCO):
    """Cria as tabelas necessárias, caso ainda não existam."""

    with conectar_banco(caminho) as conexao:
        conexao.execute(
            """
            CREATE TABLE IF NOT EXISTS producao_cirurgica (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ano INTEGER NOT NULL,
                mes INTEGER NOT NULL,
                tipo_indicador TEXT NOT NULL,
                municipio_atendimento TEXT NOT NULL,
                municipio_residencia TEXT NOT NULL,
                cnes TEXT NOT NULL,
                procedimento TEXT NOT NULL,
                quantidade INTEGER NOT NULL CHECK (quantidade >= 0),

                UNIQUE (
                    ano,
                    mes,
                    tipo_indicador,
                    municipio_atendimento,
                    municipio_residencia,
                    cnes,
                    procedimento
                )
            )
            """
        )

        conexao.execute(
            """
            CREATE TABLE IF NOT EXISTS competencias_processadas (
                ano INTEGER NOT NULL,
                mes INTEGER NOT NULL,
                tipo_indicador TEXT NOT NULL,
                processado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ano, mes, tipo_indicador)
            )
            """
        )


def competencia_processada(
    ano,
    mes,
    tipo_indicador,
    caminho=CAMINHO_BANCO,
):
    """Verifica se uma competência já foi consolidada."""

    with conectar_banco(caminho) as conexao:
        resultado = conexao.execute(
            """
            SELECT 1
            FROM competencias_processadas
            WHERE ano = ? AND mes = ? AND tipo_indicador = ?
            """,
            (ano, mes, tipo_indicador),
        ).fetchone()

    return resultado is not None


def salvar_producao(
    dados: pd.DataFrame,
    ano: int,
    mes: int,
    tipo_indicador: str,
    caminho=CAMINHO_BANCO,
):
    """
    Salva dados agregados e marca a competência como processada.

    A gravação ocorre em uma única transação.
    """

    criar_tabelas(caminho)

    colunas_necessarias = set(COLUNAS_AGREGACAO + ["quantidade"])
    ausentes = colunas_necessarias - set(dados.columns)

    if ausentes:
        raise ValueError(
            f"Colunas obrigatórias ausentes: {sorted(ausentes)}"
        )

    if not dados.empty:
        if not (
            dados["ano"].eq(ano).all()
            and dados["mes"].eq(mes).all()
            and dados["tipo_indicador"].eq(tipo_indicador).all()
        ):
            raise ValueError(
                "Os dados não correspondem à competência informada."
            )

    if (
        dados["quantidade"].isna().any()
        or (dados["quantidade"] < 0).any()
    ):
        raise ValueError("Quantidade inválida.")

    registros = list(
        dados[COLUNAS_AGREGACAO + ["quantidade"]]
        .itertuples(index=False, name=None)
    )

    with conectar_banco(caminho) as conexao:
        conexao.execute(
            """
            DELETE FROM producao_cirurgica
            WHERE ano = ? AND mes = ? AND tipo_indicador = ?
            """,
            (ano, mes, tipo_indicador),
        )

        conexao.executemany(
            """
            INSERT INTO producao_cirurgica (
                ano,
                mes,
                tipo_indicador,
                municipio_atendimento,
                municipio_residencia,
                cnes,
                procedimento,
                quantidade
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            registros,
        )

        conexao.execute(
            """
            INSERT INTO competencias_processadas (
                ano, mes, tipo_indicador
            )
            VALUES (?, ?, ?)
            ON CONFLICT (ano, mes, tipo_indicador)
            DO UPDATE SET processado_em = CURRENT_TIMESTAMP
            """,
            (ano, mes, tipo_indicador),
        )


def consultar_producao(caminho=CAMINHO_BANCO):
    """Retorna os indicadores consolidados."""

    criar_tabelas(caminho)

    with conectar_banco(caminho) as conexao:
        return pd.read_sql_query(
            "SELECT * FROM producao_cirurgica",
            conexao,
        )


# Cadastros de referência: não modificam os dados históricos de produção.
def criar_tabelas_referencia(caminho=CAMINHO_BANCO):
    """Cria dimensões e uma visão legível, preservando os códigos originais."""
    criar_tabelas(caminho)
    with conectar_banco(caminho) as conexao:
        conexao.executescript("""
            CREATE TABLE IF NOT EXISTS municipios (
                codigo TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                uf TEXT,
                regiao_saude TEXT
            );
            CREATE TABLE IF NOT EXISTS estabelecimentos (
                cnes TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                municipio_codigo TEXT
            );
            CREATE TABLE IF NOT EXISTS procedimentos (
                codigo TEXT PRIMARY KEY,
                descricao TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_producao_municipio
                ON producao_cirurgica(municipio_atendimento);
            CREATE INDEX IF NOT EXISTS idx_producao_cnes
                ON producao_cirurgica(cnes);
            CREATE INDEX IF NOT EXISTS idx_producao_procedimento
                ON producao_cirurgica(procedimento);
            CREATE VIEW IF NOT EXISTS vw_producao_identificada AS
            SELECT p.*,
                   ma.nome AS nome_municipio_atendimento,
                   mr.nome AS nome_municipio_residencia,
                   ma.regiao_saude AS regiao_saude_atendimento,
                   e.nome AS nome_estabelecimento,
                   pr.descricao AS descricao_procedimento
              FROM producao_cirurgica AS p
              LEFT JOIN municipios AS ma ON ma.codigo = p.municipio_atendimento
              LEFT JOIN municipios AS mr ON mr.codigo = p.municipio_residencia
              LEFT JOIN estabelecimentos AS e ON e.cnes = p.cnes
              LEFT JOIN procedimentos AS pr ON pr.codigo = p.procedimento;
        """)


def importar_referencia(tabela: str, dados: pd.DataFrame, caminho=CAMINHO_BANCO):
    """Importa cadastros oficiais já tratados; nunca apaga a produção histórica.

    municipios: codigo, nome, uf, regiao_saude
    estabelecimentos: cnes, nome, municipio_codigo
    procedimentos: codigo, descricao
    """
    colunas = {
        "municipios": ["codigo", "nome", "uf", "regiao_saude"],
        "estabelecimentos": ["cnes", "nome", "municipio_codigo"],
        "procedimentos": ["codigo", "descricao"],
    }
    if tabela not in colunas:
        raise ValueError(f"Tabela de referência não permitida: {tabela}")
    campos = colunas[tabela]
    obrigatorios = campos[:2]
    faltantes = set(obrigatorios) - set(dados.columns)
    if faltantes:
        raise ValueError(f"Colunas ausentes: {sorted(faltantes)}")
    if dados[obrigatorios].isna().any().any():
        raise ValueError("Códigos e nomes não podem ser nulos.")

    criar_tabelas_referencia(caminho)
    preparados = dados.reindex(columns=campos).copy()
    for campo in campos:
        preparados[campo] = preparados[campo].map(
            lambda v: None if pd.isna(v) else str(v).strip()
        )
    if preparados[campos[0]].duplicated().any():
        raise ValueError("Existem códigos duplicados no cadastro informado.")

    marcadores = ", ".join("?" for _ in campos)
    nomes = ", ".join(campos)
    atualizacoes = ", ".join(
        f"{campo}=excluded.{campo}" for campo in campos[1:]
    )
    sql = (f"INSERT INTO {tabela} ({nomes}) VALUES ({marcadores}) "
           f"ON CONFLICT({campos[0]}) DO UPDATE SET {atualizacoes}")
    with conectar_banco(caminho) as conexao:
        conexao.executemany(
            sql, preparados.itertuples(index=False, name=None)
        )
    return len(preparados)


def consultar_producao_identificada(caminho=CAMINHO_BANCO):
    """Retorna produção com nomes, se os cadastros foram importados."""
    criar_tabelas_referencia(caminho)
    with conectar_banco(caminho) as conexao:
        return pd.read_sql_query(
            "SELECT * FROM vw_producao_identificada", conexao
        )
