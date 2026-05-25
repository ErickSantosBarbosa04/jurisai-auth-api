import os
from fastapi import HTTPException
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "legal"

def ler_documento_juridico_seguro(nome_arquivo: str):

    if not BASE_DIR.exists():
        BASE_DIR.mkdir(parents=True, exist_ok=True)
        
    caminho_solicitado = (BASE_DIR / nome_arquivo).resolve()

    if BASE_DIR not in caminho_solicitado.parents:
        raise HTTPException(status_code=403, detail="Acesso negado: Caminho inválido ou tentativa de Path Traversal.")

    if not caminho_solicitado.exists():
        raise HTTPException(status_code=404, detail="Documento não encontrado na base.")

    return caminho_solicitado.read_bytes()