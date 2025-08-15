"""
Authentication API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging

from ..services.auth_service import AuthService
from ..services.rbac_service import RBACService
from ..models.user import User
from ..models.schemas import UserCreate, UserResponse, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Services (would be injected via dependency injection)
auth_service = None
rbac_service = None


def get_auth_service():
    """Get auth service instance"""
    global auth_service
    if not auth_service:
        auth_service = AuthService({})
    return auth_service


def get_rbac_service():
    """Get RBAC service instance"""
    global rbac_service
    if not rbac_service:
        rbac_service = RBACService({})
    return rbac_service


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get current authenticated user"""
    auth = get_auth_service()
    
    user_data = await auth.verify_token(token)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return User(**user_data)


async def require_permission(permission: str):
    """Dependency to require specific permission"""
    async def permission_checker(user: User = Depends(get_current_user)):
        rbac = get_rbac_service()
        
        has_permission = await rbac.check_permission(
            user.id,
            permission,
            resource_type="api"
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}"
            )
        
        return user
    
    return permission_checker


# Request/Response Models
class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str


class Enable2FAResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]


class Verify2FARequest(BaseModel):
    code: str


# Routes
@router.post("/register", response_model=UserResponse)
async def register(request: RegisterRequest):
    """Register a new user"""
    try:
        auth = get_auth_service()
        
        # Check if user exists
        existing = await auth.get_user_by_email(request.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        user_data = await auth.register_user(
            username=request.username,
            email=request.email,
            password=request.password,
            full_name=request.full_name
        )
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )
        
        # Assign default role
        rbac = get_rbac_service()
        await rbac.assign_role(user_data['user_id'], 'user')
        
        return UserResponse(**user_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: OAuth2PasswordRequestForm = Depends(),
    response: Response = None
):
    """Login with username/email and password"""
    try:
        auth = get_auth_service()
        
        # Authenticate user
        result = await auth.authenticate_user(
            username=request.username,
            password=request.password
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result.get('error', 'Invalid credentials')
            )
        
        # Set refresh token cookie
        if result.get('refresh_token'):
            response.set_cookie(
                key="refresh_token",
                value=result['refresh_token'],
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=30 * 24 * 60 * 60  # 30 days
            )
        
        return TokenResponse(
            access_token=result['access_token'],
            token_type="bearer",
            expires_in=result.get('expires_in', 3600)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/logout")
async def logout(
    response: Response,
    user: User = Depends(get_current_user)
):
    """Logout current user"""
    try:
        auth = get_auth_service()
        
        # Revoke tokens
        await auth.revoke_user_tokens(user.id)
        
        # Clear refresh token cookie
        response.delete_cookie("refresh_token")
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request):
    """Refresh access token using refresh token"""
    try:
        auth = get_auth_service()
        
        # Get refresh token from cookie
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not found"
            )
        
        # Refresh tokens
        result = await auth.refresh_access_token(refresh_token)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        return TokenResponse(
            access_token=result['access_token'],
            token_type="bearer",
            expires_in=result.get('expires_in', 3600)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: User = Depends(get_current_user)):
    """Get current user information"""
    try:
        auth = get_auth_service()
        rbac = get_rbac_service()
        
        # Get user details
        user_data = await auth.get_user(user.id)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get user roles and permissions
        roles = await rbac.get_user_roles(user.id)
        permissions = await rbac.get_user_permissions(user.id)
        
        user_data['roles'] = roles
        user_data['permissions'] = permissions
        
        return UserResponse(**user_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    user: User = Depends(get_current_user)
):
    """Change user password"""
    try:
        auth = get_auth_service()
        
        # Verify current password
        verified = await auth.verify_password(
            user.id,
            request.current_password
        )
        
        if not verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Change password
        success = await auth.change_password(
            user.id,
            request.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to change password"
            )
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Request password reset"""
    try:
        auth = get_auth_service()
        
        # Generate reset token
        success = await auth.request_password_reset(request.email)
        
        # Always return success to prevent email enumeration
        return {
            "message": "If the email exists, a password reset link has been sent"
        }
        
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        # Don't reveal errors to prevent information leakage
        return {
            "message": "If the email exists, a password reset link has been sent"
        }


@router.post("/verify-email")
async def verify_email(request: VerifyEmailRequest):
    """Verify email address"""
    try:
        auth = get_auth_service()
        
        # Verify email token
        success = await auth.verify_email(request.token)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        return {"message": "Email verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )


@router.post("/enable-2fa", response_model=Enable2FAResponse)
async def enable_two_factor(user: User = Depends(get_current_user)):
    """Enable two-factor authentication"""
    try:
        auth = get_auth_service()
        
        # Generate 2FA secret
        result = await auth.enable_two_factor(user.id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to enable 2FA"
            )
        
        return Enable2FAResponse(
            secret=result['secret'],
            qr_code=result['qr_code'],
            backup_codes=result['backup_codes']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enable 2FA error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enable 2FA"
        )


@router.post("/verify-2fa")
async def verify_two_factor(
    request: Verify2FARequest,
    user: User = Depends(get_current_user)
):
    """Verify 2FA code"""
    try:
        auth = get_auth_service()
        
        # Verify 2FA code
        valid = await auth.verify_two_factor(user.id, request.code)
        
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid 2FA code"
            )
        
        return {"message": "2FA verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify 2FA error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="2FA verification failed"
        )


@router.post("/disable-2fa")
async def disable_two_factor(
    request: Verify2FARequest,
    user: User = Depends(get_current_user)
):
    """Disable two-factor authentication"""
    try:
        auth = get_auth_service()
        
        # Verify 2FA code before disabling
        valid = await auth.verify_two_factor(user.id, request.code)
        
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid 2FA code"
            )
        
        # Disable 2FA
        success = await auth.disable_two_factor(user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to disable 2FA"
            )
        
        return {"message": "2FA disabled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Disable 2FA error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable 2FA"
        )


@router.get("/sessions")
async def get_user_sessions(user: User = Depends(get_current_user)):
    """Get user's active sessions"""
    try:
        auth = get_auth_service()
        
        # Get active sessions
        sessions = await auth.get_user_sessions(user.id)
        
        return {"sessions": sessions}
        
    except Exception as e:
        logger.error(f"Get sessions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sessions"
        )


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    user: User = Depends(get_current_user)
):
    """Revoke a specific session"""
    try:
        auth = get_auth_service()
        
        # Revoke session
        success = await auth.revoke_session(user.id, session_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return {"message": "Session revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Revoke session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke session"
        )