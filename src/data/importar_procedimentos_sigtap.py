"""Importa descrições SIGTAP dos procedimentos presentes no histórico SIH.

Executar na raiz do projeto:
    python -m src.data.importar_procedimentos_sigtap

Lê o ZIP local da competência 202608, sem downloads e sem alterar a produção histórica.
"""

from pathlib import Path
import sqlite3
import zipfile

from src.data.banco_sih import CAMINHO_BANCO, criar_tabelas_referencia

PASTA = Path('data/raw/referencias')
PADRAO_ZIP = 'TabelaUnificada_202608*.zip'


def normalizar_codigo(valor):
    """Normaliza códigos SIGTAP numéricos para dez dígitos."""
    texto = str(valor).strip()
    return texto.zfill(10) if texto.isdigit() and len(texto) <= 10 else texto


def ler_sigtap(caminho_zip, codigos_usados):
    """Lê os campos de largura fixa do arquivo tb_procedimento.txt."""
    encontrados = {}
    with zipfile.ZipFile(caminho_zip) as pacote:
        with pacote.open('tb_procedimento.txt') as arquivo:
            for numero, linha in enumerate(arquivo, start=1):
                if len(linha) < 260:
                    continue
                codigo = normalizar_codigo(linha[0:10].decode('ascii', errors='replace'))
                if codigo not in codigos_usados:
                    continue
                descricao = linha[10:260].decode('latin1').strip()
                if not descricao:
                    continue
                if codigo in encontrados and encontrados[codigo] != descricao:
                    raise ValueError(f'Descrições divergentes para {codigo}, linha {numero}.')
                encontrados[codigo] = descricao
    return encontrados


def main():
    """Importa descrições e apresenta a cobertura dos procedimentos históricos."""
    arquivos = sorted(PASTA.glob(PADRAO_ZIP))
    if not arquivos:
        raise FileNotFoundError(f'ZIP SIGTAP não encontrado em {PASTA}.')
    if len(arquivos) > 1:
        raise ValueError(f'Encontrados vários ZIPs SIGTAP: {[str(p) for p in arquivos]}')

    criar_tabelas_referencia()
    with sqlite3.connect(CAMINHO_BANCO) as conexao:
        colunas_producao = {
            linha[1] for linha in conexao.execute('PRAGMA table_info(producao_cirurgica)')
        }
        if 'procedimento' not in colunas_producao:
            raise ValueError('A tabela producao_cirurgica não possui a coluna procedimento.')

        codigos_usados = {
            normalizar_codigo(codigo)
            for (codigo,) in conexao.execute(
                'SELECT DISTINCT procedimento FROM producao_cirurgica WHERE procedimento IS NOT NULL'
            )
            if str(codigo).strip()
        }
        encontrados = ler_sigtap(arquivos[0], codigos_usados)
        if not encontrados:
            raise ValueError('Nenhum procedimento do histórico encontrado no SIGTAP. Banco não alterado.')

        estrutura = conexao.execute('PRAGMA table_info(procedimentos)').fetchall()
        colunas = {linha[1] for linha in estrutura}
        coluna_codigo = next((c for c in ('codigo', 'co_procedimento', 'procedimento') if c in colunas), None)
        coluna_descricao = next((c for c in ('descricao', 'nome', 'no_procedimento') if c in colunas), None)
        if not coluna_codigo or not coluna_descricao:
            raise ValueError(f'Estrutura inesperada de procedimentos: {sorted(colunas)}. Banco não alterado.')

        # Atualiza apenas o catálogo de referência, preservando producao_cirurgica.
        with conexao:
            for codigo, descricao in encontrados.items():
                existe = conexao.execute(
                    f'SELECT 1 FROM procedimentos WHERE {coluna_codigo} = ?', (codigo,)
                ).fetchone()
                if existe:
                    conexao.execute(
                        f'UPDATE procedimentos SET {coluna_descricao} = ? WHERE {coluna_codigo} = ?',
                        (descricao, codigo),
                    )
                else:
                    conexao.execute(
                        f'INSERT INTO procedimentos ({coluna_codigo}, {coluna_descricao}) VALUES (?, ?)',
                        (codigo, descricao),
                    )

    ausentes = sorted(codigos_usados - encontrados.keys())
    print(f'ZIP utilizado: {arquivos[0].name}')
    print(f'Procedimentos distintos no histórico: {len(codigos_usados)}')
    print(f'Procedimentos identificados no SIGTAP 08/2026: {len(encontrados)}')
    print(f'Procedimentos não encontrados nesta competência: {len(ausentes)}')
    if ausentes:
        print('Exemplos de códigos ausentes:', ', '.join(ausentes[:15]))
    print('Tabela histórica de produção preservada.')


if __name__ == '__main__':
    main()
