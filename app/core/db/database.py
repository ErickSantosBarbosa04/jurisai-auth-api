from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL não foi definida nas variáveis de ambiente!")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    Injeção de Dependência: Cria uma sessão de banco de dados para cada 
    requisição e garante que ela seja fechada ao final.
    Atende ao Requisito 6.4 (Gestão de Recursos).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()