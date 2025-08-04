# Pydantic models for request and response validation
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ModelBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str
    visibility: str
    status: str
    performance: Optional[dict] = None

class ModelCreateRequest(ModelBase):
    user_id: int

class Model(ModelBase):
    id: int
    user_id: int
    created_at: datetime
    retrain_from: Optional[int] = None

    class Config:
        orm_mode = True

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    full_name: str
    phone_number: str
    password: str

class UserProfile(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        orm_mode = True

class User(UserBase):
    id: int
    token_balance: int
    subscription_plan: str
    two_factor_enabled: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    profile: UserProfile

    class Config:
        orm_mode = True

class Upload(BaseModel):
    id: int
    user_id: int
    model_id: int
    filename: str
    path: str
    uploaded_at: datetime

    class Config:
        orm_mode = True

class ModelJobBase(BaseModel):
    user_id: int
    model_id: int
    job_type: str
    status: str
    token_cost: int

class ModelJobCreate(ModelJobBase):
    pass

class ModelJob(ModelJobBase):
    id: int
    progress: int
    started_at: datetime
    ended_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class GeneratedDataBase(BaseModel):
    user_id: int
    instance_name: str
    description: str
    rows: int
    columns: int
    file_size: str
    token_cost: int
    file_path: str

class GeneratedDataCreate(GeneratedDataBase):
    pass

class GeneratedData(GeneratedDataBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class RuleBase(BaseModel):
    user_id: int
    model_id: int
    rule_name: str
    logic_json: dict
    token_cost: int

class RuleCreate(RuleBase):
    pass

class Rule(RuleBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class TokenTransactionBase(BaseModel):
    user_id: int
    model_id: Optional[int] = None
    change: int
    reason: str
    balance_after: int

class TokenTransactionCreate(TokenTransactionBase):
    pass

class TokenTransaction(TokenTransactionBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class ModelVoteBase(BaseModel):
    user_id: int
    model_id: int
    vote_type: str

class ModelVoteCreate(ModelVoteBase):
    pass

class ModelVote(ModelVoteBase):
    id: int

    class Config:
        orm_mode = True

class PredictionResultBase(BaseModel):
    user_id: int
    model_id: int
    result_file_path: str

class PredictionResultCreate(PredictionResultBase):
    pass

class PredictionResult(PredictionResultBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class NotificationBase(BaseModel):
    user_id: int
    title: str
    message: str
    read: bool

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True

class UserSettingsBase(BaseModel):
    dark_mode: Optional[bool] = None
    auto_save: Optional[bool] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    email_notifications: Optional[bool] = None
    model_completion_alerts: Optional[bool] = None
    api_usage_warnings: Optional[bool] = None
    weekly_reports: Optional[bool] = None
    data_analytics: Optional[bool] = None
    session_timeout_minutes: Optional[int] = None
    data_retention_days: Optional[int] = None
    api_rate_limiting_enabled: Optional[bool] = None
    debug_mode: Optional[bool] = None
    cache_duration_minutes: Optional[int] = None

class UserSettingsUpdate(UserSettingsBase):
    pass

class UserSettings(UserSettingsBase):
    user_id: int

    class Config:
        orm_mode = True
