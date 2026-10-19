"""
Database engine and session management for local SQLite persistence.
Automatically ensures parent directory exists and tables are initialized.
"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

from config.settings import settings
from src.storage.models import Base


def get_engine(db_path: Path = None):
    target_path = db_path or settings.db_path
    target_path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{target_path.as_posix()}",
        connect_args={"check_same_thread": False},
        echo=False
    )
    return engine


_engine = get_engine()
SessionFactory = sessionmaker(bind=_engine, autocommit=False, autoflush=False)


def init_db(engine=None):
    """Creates all tables if they do not exist."""
    eng = engine or _engine
    Base.metadata.create_all(bind=eng)


@contextmanager
def get_db_session() -> Session:
    """Provide a transactional scope around a series of operations."""
    session = SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
