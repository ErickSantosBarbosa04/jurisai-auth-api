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


USER_PROFILE_COLUMNS = {
    "updated_at": {"sqlite": "DATETIME", "postgresql": "TIMESTAMP"},
    "full_name": {"sqlite": "VARCHAR(120)", "postgresql": "VARCHAR(120)"},
    "profile_type": {"sqlite": "VARCHAR(30)", "postgresql": "VARCHAR(30)"},
    "university": {"sqlite": "VARCHAR(160)", "postgresql": "VARCHAR(160)"},
    "semester": {"sqlite": "INTEGER", "postgresql": "INTEGER"},
    "legal_specialty": {"sqlite": "VARCHAR(80)", "postgresql": "VARCHAR(80)"},
}


def ensure_user_profile_columns():
    """
    Compatibilidade simples para bancos locais ja existentes.
    O SQLAlchemy create_all cria tabelas novas, mas nao adiciona colunas em tabelas antigas.
    """
    dialect = engine.dialect.name

    with engine.begin() as connection:
        if dialect == "sqlite":
            existing_columns = {
                row[1] for row in connection.exec_driver_sql("PRAGMA table_info(users)").fetchall()
            }
        else:
            existing_columns = {
                row[0] for row in connection.exec_driver_sql(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
                ).fetchall()
            }

        for column_name, column_types in USER_PROFILE_COLUMNS.items():
            if column_name not in existing_columns:
                column_type = column_types.get(dialect, column_types["postgresql"])
                connection.exec_driver_sql(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")

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
