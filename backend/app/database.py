from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

# Setup SQLAlchemy engine with robust connection pooling
# pool_size: specifies the number of connections to keep inside the pool
# max_overflow: specifies the maximum number of connections to allow beyond pool_size
# pool_timeout: specifies the seconds to wait before giving up on obtaining a connection
# pool_recycle: specifies seconds after which a connection is recycled (avoids stale connection errors)
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to yield database session per request, ensuring cleanup
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
