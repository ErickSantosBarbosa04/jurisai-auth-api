from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL")

if DATABASE_URL and DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

if not DATABASE_URL:
    raise ValueError("DATABASE_URL não foi definida nas variáveis de ambiente!")

# Conecta ao MySQL usando a rota do .env
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
