from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.database import get_db
from routes import models, auth, upload, jobs, generator, rules, tokens, votes, settings, notifications

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(models.router)
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(jobs.router)
app.include_router(generator.router)
app.include_router(rules.router)
app.include_router(tokens.router)
app.include_router(votes.router)
app.include_router(settings.router)
app.include_router(notifications.router)


@app.get("/")
def root():
    return {"message": "DataPulse API running"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint to verify API and database connectivity
    """
    try:
        # Test database connection
        result = db.execute(text("SELECT 1"))
        db_status = "healthy" if result else "unhealthy"
    except Exception as e:
        print(f"Health check database error: {str(e)}")
        db_status = "unhealthy"
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")
    
    return {
        "status": "healthy",
        "database": db_status,
        "message": "DataPulse API is running"
    }
