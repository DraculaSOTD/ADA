from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        # Test the database connection
        db.execute(text("SELECT 1"))
        yield db
    except Exception as e:
        print(f"Database connection error: {str(e)}")
        # Don't re-raise the exception to avoid crashing the server
        # Instead, close the session and create a new one
        db.close()
        # Try creating a new session
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            yield db
        except Exception as retry_error:
            print(f"Database retry failed: {str(retry_error)}")
            db.close()
            raise retry_error
    finally:
        db.close()
