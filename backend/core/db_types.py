from sqlalchemy.dialects.postgresql import JSONB, UUID, ARRAY
from sqlalchemy import JSON, String, Text
from core.config import settings

# Use JSON for SQLite, JSONB for PostgreSQL
JSONField = JSON if settings.USE_SQLITE else JSONB

def get_uuid_type():
    """Return appropriate UUID type based on database backend"""
    if settings.USE_SQLITE:
        return String(36)  # Store UUID as string in SQLite
    else:
        return UUID(as_uuid=True)

def get_array_type(item_type):
    """Return appropriate array type based on database backend"""
    if settings.USE_SQLITE:
        return Text  # Store arrays as JSON text in SQLite
    else:
        return ARRAY(item_type)