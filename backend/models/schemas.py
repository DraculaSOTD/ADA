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
    rule_name: str
    logic_json: dict
    token_cost: int

class RuleCreate(RuleBase):
    description: Optional[str] = None
    model_id: Optional[int] = None
    trigger_config: Optional[dict] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    execution_mode: Optional[str] = "sequential"
    error_handling: Optional[dict] = None
    create_as_model: Optional[bool] = False
    type: Optional[str] = None
    visibility: Optional[str] = "private"
    is_active: Optional[bool] = True

class RuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    description: Optional[str] = None
    logic_json: Optional[dict] = None
    trigger_config: Optional[dict] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    execution_mode: Optional[str] = None
    error_handling: Optional[dict] = None
    is_active: Optional[bool] = None
    token_cost: Optional[int] = None

class Rule(RuleBase):
    id: int
    user_id: int
    model_id: Optional[int] = None
    description: Optional[str] = None
    trigger_config: Optional[dict] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    is_active: bool
    version: int
    execution_mode: str
    error_handling: Optional[dict] = None
    linked_model_id: Optional[int] = None
    created_at: datetime

    class Config:
        orm_mode = True

class RuleResponse(Rule):
    pass

class RuleListItem(BaseModel):
    id: int
    rule_name: str
    description: Optional[str] = None
    is_active: bool
    trigger_type: Optional[str] = None
    created_at: datetime
    linked_model_id: Optional[int] = None

    class Config:
        orm_mode = True

class RuleDetail(Rule):
    pass

class RuleExecutionRequest(BaseModel):
    input_data: dict
    trigger_type: Optional[str] = "manual"

class RuleExecutionResponse(BaseModel):
    execution_id: int
    status: str
    output_data: Optional[dict] = None
    execution_time_ms: Optional[int] = None
    token_cost: Optional[int] = None

class RuleTestRequest(BaseModel):
    test_data: dict

class RuleTestResponse(BaseModel):
    conditions_passed: bool
    actions_to_execute: int
    estimated_token_cost: int
    test_output: dict
    error: Optional[str] = None

class RuleExecutionListItem(BaseModel):
    id: int
    trigger_type: str
    status: str
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None
    token_cost: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class RuleModelListItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    type: str
    visibility: str
    status: str
    created_at: datetime

    class Config:
        orm_mode = True

class RuleCloneRequest(BaseModel):
    new_name: str

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
