import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _load_database_url() -> str:
    secret = Path("/run/secrets/database_url")
    if secret.exists():
        return secret.read_text().strip()
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    raise RuntimeError(
        "DATABASE_URL not configured: set DATABASE_URL env var or create 'database_url' Docker secret"
    )


engine = create_engine(_load_database_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
