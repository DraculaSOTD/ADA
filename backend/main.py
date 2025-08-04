from fastapi import FastAPI
from routes import models, auth, upload, jobs, generator, rules, tokens, votes, settings, notifications

app = FastAPI()

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
