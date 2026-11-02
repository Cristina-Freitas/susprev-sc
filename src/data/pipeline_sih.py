"""Pipeline reprodutível SIH/SUS: RD (internações) e SP (procedimentos).

SP eletivo é definido por vínculo de AIH com RD de caráter eletivo (CAR_INT=01).
O indicador SP conta pares distintos AIH/procedimento/CNES, não atos cirúrgicos.
"""
from pathlib import Path
import gc
import pandas as pd

from src.data.extracao_sih import extrair_sih
from src.data.conversao_sih import converter_dbc
from src.data.consolidacao_sih import TIPO_INDICADOR, consolidar_rd, consolidar_sp
from src.data.banco_sih import (
    CAMINHO_BANCO,
    criar_tabelas,
    competencia_processada,
    salvar_producao,
    competencia_sp_processada,
    salvar_procedimentos_sp,
)


def _selecionar_sp_eletivos(dados_sp, dados_rd):
    """Seleciona procedimentos SP cirúrgicos com quantidade positiva e AIH eletiva RD.

    O arquivo real DATASUS utiliza SP_PROCREA; SP_PROC_REA é aceito
    por compatibilidade com os testes e com consolidar_sp().
    """
    colunas_rd = {"N_AIH", "CAR_INT"}
    if faltantes := colunas_rd - set(dados_rd.columns):
        raise ValueError(f"Colunas RD ausentes para vínculo eletivo: {sorted(faltantes)}")

    coluna_procedimento = (
        "SP_PROCREA" if "SP_PROCREA" in dados_sp.columns else "SP_PROC_REA"
    )
    colunas_sp = {"SP_NAIH", "SP_CNES", "SP_QT_PROC", coluna_procedimento}
    if faltantes := colunas_sp - set(dados_sp.columns):
        raise ValueError(f"Colunas SP ausentes para vínculo eletivo: {sorted(faltantes)}")

    carater = dados_rd["CAR_INT"].astype("string").str.strip()
    aih_eletivas = set(
        dados_rd.loc[carater.eq("01").fillna(False), "N_AIH"]
        .astype("string").str.strip().dropna()
    )
    aih_eletivas.discard("")
    numero_sp = dados_sp["SP_NAIH"].astype("string").str.strip()
    codigo_sp = dados_sp[coluna_procedimento].astype("string").str.strip()
    quantidade = pd.to_numeric(dados_sp["SP_QT_PROC"], errors="coerce")
    filtro = (
        numero_sp.isin(aih_eletivas)
        & codigo_sp.str.startswith("04", na=False)
        & quantidade.gt(0)
    )
    selecionados = dados_sp.loc[filtro.fillna(False)].copy()
    if coluna_procedimento != "SP_PROC_REA":
        selecionados = selecionados.rename(columns={"SP_PROCREA": "SP_PROC_REA"})
    return selecionados


def processar_competencia(
    ano: int,
    mes: int,
    caminho_banco: str | Path = CAMINHO_BANCO,
    diretorio_raw: str | Path = "data/raw",
    forcar: bool = False,
    remover_dbc: bool = False,
    tipo: str = "RD",
) -> dict:
    """Processa uma competência RD ou SP; não altera tabelas do outro indicador."""
    tipo = tipo.upper()
    if tipo not in {"RD", "SP"}:
        raise ValueError("Tipo deve ser 'RD' ou 'SP'.")
    if not isinstance(ano, int) or not 2008 <= ano <= 2100:
        raise ValueError("Ano inválido.")
    if not isinstance(mes, int) or not 1 <= mes <= 12:
        raise ValueError("Mês inválido.")

    criar_tabelas(caminho_banco)
    ja_processada = (
        competencia_processada(ano, mes, TIPO_INDICADOR, caminho=caminho_banco)
        if tipo == "RD"
        else competencia_sp_processada(ano, mes, caminho=caminho_banco)
    )
    if ja_processada and not forcar:
        print(f"{ano}-{mes:02d} {tipo}: já processada. Ignorando.")
        return {"ano": ano, "mes": mes, "tipo": tipo, "status": "ignorada"}

    caminho_dbc = extrair_sih(
        ano=ano, mes=mes, uf="SC", tipo=tipo, diretorio=diretorio_raw
    )
    dados = converter_dbc(caminho_dbc)
    total_registros = len(dados)

    if tipo == "RD":
        consolidado = consolidar_rd(dados, ano, mes)
        total = int(consolidado["quantidade"].sum())
        grupos = len(consolidado)
        salvar_producao(
            dados=consolidado, ano=ano, mes=mes,
            tipo_indicador=TIPO_INDICADOR, caminho=caminho_banco,
        )
        chave_total = "internacoes_cirurgicas_eletivas"
    else:
        # SP não possui CAR_INT: o caráter eletivo é verificado na AIH RD.
        caminho_rd = extrair_sih(
            ano=ano, mes=mes, uf="SC", tipo="RD", diretorio=diretorio_raw
        )
        dados_rd = converter_dbc(caminho_rd)
        sp_eletivos = _selecionar_sp_eletivos(dados, dados_rd)
        consolidado = consolidar_sp(sp_eletivos, ano, mes)
        total = int(consolidado["quantidade"].sum())
        grupos = len(consolidado)
        salvar_procedimentos_sp(
            dados=consolidado, ano=ano, mes=mes, caminho=caminho_banco,
        )
        del dados_rd, sp_eletivos
        chave_total = "pares_aih_procedimento_cirurgico_eletivo_sp"

    del dados, consolidado
    gc.collect()
    if remover_dbc:
        Path(caminho_dbc).unlink(missing_ok=True)
        # Não remover RD usado como referência para o vínculo eletivo.

    print(f"{ano}-{mes:02d} {tipo}: {total_registros:,} registros; "
          f"{total:,} {chave_total}; {grupos:,} grupos.", flush=True)
    return {
        "ano": ano, "mes": mes, "tipo": tipo, "status": "processada",
        f"registros_{tipo.lower()}": total_registros,
        chave_total: total, "grupos_consolidados": grupos,
    }


def processar_competencia_sp(
    ano: int,
    mes: int,
    caminho_banco: str | Path = CAMINHO_BANCO,
    diretorio_raw: str | Path = "data/raw",
    forcar: bool = False,
    remover_dbc: bool = False,
) -> dict:
    """Entrada explícita para SP; delega ao mesmo pipeline modular."""
    return processar_competencia(
        ano=ano, mes=mes, caminho_banco=caminho_banco,
        diretorio_raw=diretorio_raw, forcar=forcar,
        remover_dbc=remover_dbc, tipo="SP",
    )


def processar_historico(
    ano_inicial: int = 2019,
    ano_final: int = 2026,
    tipo: str = "RD",
    mes_final: int = 12,
    remover_dbc: bool = True,
):
    """Processa histórico, competência por competência; retoma as já concluídas."""
    tipo = tipo.upper()
    if tipo not in {"RD", "SP"}:
        raise ValueError("Tipo deve ser 'RD' ou 'SP'.")
    if not 1 <= mes_final <= 12 or ano_inicial > ano_final:
        raise ValueError("Intervalo inválido.")

    processadas = ignoradas = 0
    falhas = []
    for ano in range(ano_inicial, ano_final + 1):
        for mes in range(1, (mes_final if ano == ano_final else 12) + 1):
            try:
                resultado = processar_competencia(
                    ano=ano, mes=mes, tipo=tipo, remover_dbc=remover_dbc
                )
                if resultado["status"] == "processada":
                    processadas += 1
                else:
                    ignoradas += 1
            except Exception as erro:
                print(f"ERRO em {tipo} {ano}-{mes:02d}: {erro}", flush=True)
                falhas.append(f"{ano}-{mes:02d}")
    print(f"{tipo}: {processadas} processadas, {ignoradas} ignoradas, "
          f"{len(falhas)} falhas.")
    if falhas:
        print("Competências com falha:", ", ".join(falhas))
    return {"processadas": processadas, "ignoradas": ignoradas, "falhas": falhas}


if __name__ == "__main__":
    processar_historico()
