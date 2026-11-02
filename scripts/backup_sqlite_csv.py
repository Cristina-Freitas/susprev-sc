"""Exporta/reconstroi SQLite via CSVs fragmentados (<45 MiB cada).

Uso, na raiz do projeto:
  python scripts/backup_sqlite_csv.py exportar
  python scripts/backup_sqlite_csv.py restaurar --destino data/processed/susprev_sc_teste.db

A restauração nunca sobrescreve um banco existente.
"""
from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import json
import sqlite3
from pathlib import Path

DB = Path('data/processed/susprev_sc.db')
DEST = Path('data/processed/csv_backup')
LIMITE = 40 * 1024 * 1024  # margem segura sob 50 MB por arquivo no GitHub
NULL = r'\N'


def codificar(valor):
    if valor is None:
        return NULL
    if isinstance(valor, bytes):
        return r'\B' + base64.b64encode(valor).decode('ascii')
    if isinstance(valor, str):
        return r'\S' + valor if valor.startswith('\\') else valor
    return str(valor)


def decodificar(valor):
    if valor == NULL:
        return None
    if valor.startswith(r'\B'):
        return base64.b64decode(valor[2:], validate=True)
    if valor.startswith(r'\S'):
        return valor[2:]
    return valor


def checksum(caminho):
    h = hashlib.sha256()
    # Os CSVs são exportados com CRLF pelo csv.writer, mas o Git pode
    # convertê-los para LF ao criar o ZIP. Calcular o SHA-256 sobre uma
    # representação CRLF canônica preserva a verificação do conteúdo.
    with caminho.open('rb') as arquivo:
        for linha in arquivo:
            h.update(linha.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n'))
    return h.hexdigest()


def exportar():
    if not DB.is_file():
        raise FileNotFoundError(f'Banco não encontrado: {DB}')
    DEST.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(f'file:{DB.resolve().as_posix()}?mode=ro', uri=True) as con:
        con.execute('BEGIN')  # fotografia consistente do banco
        objetos = con.execute("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").fetchall()
        tabelas = [x[1] for x in objetos if x[0] == 'table']
        manifesto = {'versao': 1, 'objetos': objetos, 'tabelas': {}}
        for tabela in tabelas:
            quoted = '"' + tabela.replace('"', '""') + '"'
            colunas = [x[1] for x in con.execute(f'PRAGMA table_info({quoted})')]
            if not colunas:
                raise ValueError(f'Tabela sem colunas: {tabela}')
            prefixo = tabela.replace('/', '_').replace('\\', '_')
            arquivos = []
            indice = 0
            contagem = 0
            f = None
            writer = None
            try:
                for linha in con.execute(f'SELECT * FROM {quoted}'):
                    if f is None or (f.tell() >= LIMITE):
                        if f:
                            f.close()
                        indice += 1
                        caminho = DEST / f'{prefixo}_{indice:03d}.csv'
                        f = caminho.open('w', newline='', encoding='utf-8')
                        writer = csv.writer(f)
                        writer.writerow(colunas)
                        arquivos.append(caminho)
                    writer.writerow([codificar(v) for v in linha])
                    contagem += 1
                if f is None:  # tabela vazia
                    caminho = DEST / f'{prefixo}_001.csv'
                    with caminho.open('w', newline='', encoding='utf-8') as vazio:
                        csv.writer(vazio).writerow(colunas)
                    arquivos.append(caminho)
            finally:
                if f:
                    f.close()
            manifesto['tabelas'][tabela] = {'colunas': colunas, 'linhas': contagem, 'arquivos': [{'nome': p.name, 'sha256': checksum(p)} for p in arquivos]}
            print(f'{tabela}: {contagem:,} registros; {len(arquivos)} CSV(s)')
        (DEST / 'manifesto.json').write_text(json.dumps(manifesto, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Exportação concluída: {DEST}')


def restaurar(destino=None):
    banco_destino = Path(destino) if destino else DB
    manifesto_path = DEST / 'manifesto.json'
    manifesto = json.loads(manifesto_path.read_text(encoding='utf-8'))
    if manifesto.get('versao') != 1:
        raise ValueError('Versão de manifesto não suportada')
    if banco_destino.exists():
        raise FileExistsError(f'O banco já existe: {banco_destino}. Não será sobrescrito.')
    # Verificar integridade de todos os CSVs antes de criar o banco
    for dados in manifesto['tabelas'].values():
        for item in dados['arquivos']:
            arq = DEST / item['nome']
            if checksum(arq) != item['sha256']:
                raise ValueError(f'CSV ausente ou alterado: {arq}')
    banco_destino.parent.mkdir(parents=True, exist_ok=True)
    try:
        with sqlite3.connect(banco_destino) as con:
            con.execute('PRAGMA foreign_keys=OFF')
            with con:
                for tipo, nome, _, sql in manifesto['objetos']:
                    if tipo == 'table':
                        con.execute(sql)
                for tabela, dados in manifesto['tabelas'].items():
                    colunas = dados['colunas']
                    qtable = '"' + tabela.replace('"', '""') + '"'
                    qcols = ','.join('"' + c.replace('"', '""') + '"' for c in colunas)
                    insert = f'INSERT INTO {qtable} ({qcols}) VALUES ({",".join("?" for _ in colunas)})'
                    total = 0
                    for item in dados['arquivos']:
                        with (DEST / item['nome']).open('r', newline='', encoding='utf-8') as f:
                            leitor = csv.reader(f)
                            if next(leitor) != colunas:
                                raise ValueError(f'Cabeçalho incorreto: {item["nome"]}')
                            lote = []
                            for linha in leitor:
                                if len(linha) != len(colunas):
                                    raise ValueError(f'Linha inválida: {item["nome"]}')
                                lote.append(tuple(decodificar(v) for v in linha))
                                if len(lote) == 2000:
                                    con.executemany(insert, lote)
                                    total += len(lote)
                                    lote.clear()
                            if lote:
                                con.executemany(insert, lote)
                                total += len(lote)
                    if total != dados['linhas']:
                        raise ValueError(f'Contagem divergente em {tabela}: {total} != {dados["linhas"]}')
                    print(f'{tabela}: {total:,} registros restaurados')
                for tipo, nome, _, sql in manifesto['objetos']:
                    if tipo in ('index', 'trigger', 'view'):
                        con.execute(sql)
                # AUTOINCREMENT: atualizar sequências automaticamente para máximo da PK,
                # suficiente para inserções futuras após restaurar.
            if con.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise ValueError('Falha na integridade do SQLite reconstruído')
        print(f'Restauração concluída: {banco_destino}')
    except Exception:
        banco_destino.unlink(missing_ok=True)
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('acao', choices=['exportar', 'restaurar'])
    parser.add_argument('--destino', help='Caminho do SQLite a reconstruir (somente restaurar)')
    args = parser.parse_args()
    if args.acao == 'exportar':
        exportar()
    else:
        restaurar(args.destino)
