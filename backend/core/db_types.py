from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON
from core.config import settings

# Use JSON for SQLite, JSONB for PostgreSQL
JSONField = JSON if settings.USE_SQLITE else JSONB