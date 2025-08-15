"""
Authentication Service for ADA Platform
Handles user registration, login, token management, and password operations
"""

import hashlib
import secrets
import jwt
import redis
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple, List
import bcrypt
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import json
from dataclasses import dataclass
from enum import Enum


class TokenType(Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    VERIFICATION = "verification"
    PASSWORD_RESET = "password_reset"


@dataclass
class UserSession:
    user_id: str
    session_id: str
    device_info: Dict
    created_at: datetime
    last_activity: datetime
    ip_address: str


class AuthenticationService:
    """Comprehensive authentication service with advanced security features"""
    
    def __init__(self, db_connection, redis_client: redis.Redis, config: Dict):
        self.db = db_connection
        self.redis = redis_client
        self.config = config
        self.jwt_secret = config.get('JWT_SECRET', 'your-secret-key-change-in-production')
        self.jwt_algorithm = 'HS256'
        self.access_token_expiry = timedelta(hours=1)
        self.refresh_token_expiry = timedelta(days=7)
        self.initial_token_balance = 1000
        self.max_login_attempts = 5
        self.lockout_duration = timedelta(minutes=15)
        
    # User Registration
    async def register_user(self, email: str, password: str, name: str, 
                           additional_data: Dict = None) -> Dict:
        """
        Register a new user with email verification
        """
        try:
            # Validate email format
            if not self._validate_email(email):
                return {"success": False, "error": "Invalid email format"}
            
            # Check email uniqueness
            if await self._email_exists(email):
                return {"success": False, "error": "Email already registered"}
            
            # Validate password strength
            password_validation = self._validate_password_strength(password)
            if not password_validation['valid']:
                return {"success": False, "error": password_validation['message']}
            
            # Hash password
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            # Generate verification token
            verification_token = secrets.token_urlsafe(32)
            
            # Create user record
            user_id = self._generate_user_id()
            user_data = {
                'id': user_id,
                'email': email,
                'name': name,
                'password': hashed_password.decode('utf-8'),
                'token_balance': self.initial_token_balance,
                'email_verified': False,
                'verification_token': verification_token,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'status': 'pending_verification',
                'failed_login_attempts': 0,
                'last_login': None,
                'mfa_enabled': False,
                'mfa_secret': None,
                **(additional_data or {})
            }
            
            # Store user in database
            await self._store_user(user_data)
            
            # Send verification email
            await self._send_verification_email(email, verification_token)
            
            # Log registration event
            await self._log_auth_event(user_id, 'registration', {'email': email})
            
            return {
                "success": True,
                "user_id": user_id,
                "message": "Registration successful. Please check your email to verify your account."
            }
            
        except Exception as e:
            return {"success": False, "error": f"Registration failed: {str(e)}"}
    
    # Login System
    async def login(self, email: str, password: str, device_info: Dict = None) -> Dict:
        """
        Authenticate user and generate tokens
        """
        try:
            # Check rate limiting
            if await self._is_rate_limited(email):
                return {"success": False, "error": "Too many login attempts. Please try again later."}
            
            # Retrieve user
            user = await self._get_user_by_email(email)
            if not user:
                await self._record_failed_login(email)
                return {"success": False, "error": "Invalid credentials"}
            
            # Check account status
            if user.get('status') == 'suspended':
                return {"success": False, "error": "Account suspended"}
            
            if user.get('status') == 'locked':
                lockout_time = await self._get_lockout_time(user['id'])
                if lockout_time and lockout_time > datetime.utcnow():
                    return {"success": False, "error": f"Account locked until {lockout_time}"}
                else:
                    await self._unlock_account(user['id'])
            
            # Verify password
            if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
                await self._record_failed_login(email, user['id'])
                
                # Check if account should be locked
                if user['failed_login_attempts'] >= self.max_login_attempts - 1:
                    await self._lock_account(user['id'])
                    return {"success": False, "error": "Account locked due to multiple failed attempts"}
                
                return {"success": False, "error": "Invalid credentials"}
            
            # Check email verification
            if not user.get('email_verified'):
                return {"success": False, "error": "Please verify your email before logging in"}
            
            # Check MFA if enabled
            if user.get('mfa_enabled'):
                # Return MFA challenge
                mfa_token = self._generate_mfa_token(user['id'])
                return {
                    "success": False,
                    "mfa_required": True,
                    "mfa_token": mfa_token,
                    "message": "Please provide MFA code"
                }
            
            # Generate tokens
            access_token = self._generate_access_token(user)
            refresh_token = self._generate_refresh_token(user)
            
            # Create session
            session_id = await self._create_session(user['id'], device_info or {})
            
            # Update user login info
            await self._update_login_info(user['id'])
            
            # Reset failed login attempts
            await self._reset_failed_login_attempts(user['id'])
            
            # Store tokens in Redis
            await self._store_tokens(user['id'], access_token, refresh_token, session_id)
            
            # Log login event
            await self._log_auth_event(user['id'], 'login', {'session_id': session_id})
            
            return {
                "success": True,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": user['id'],
                    "email": user['email'],
                    "name": user['name'],
                    "token_balance": user['token_balance']
                }
            }
            
        except Exception as e:
            return {"success": False, "error": f"Login failed: {str(e)}"}
    
    # Token Management
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Generate new access token using refresh token
        """
        try:
            # Verify refresh token
            payload = self._verify_token(refresh_token, TokenType.REFRESH)
            if not payload:
                return {"success": False, "error": "Invalid refresh token"}
            
            # Check if token is blacklisted
            if await self._is_token_blacklisted(refresh_token):
                return {"success": False, "error": "Token has been revoked"}
            
            # Get user
            user = await self._get_user_by_id(payload['user_id'])
            if not user:
                return {"success": False, "error": "User not found"}
            
            # Generate new tokens (token rotation)
            new_access_token = self._generate_access_token(user)
            new_refresh_token = self._generate_refresh_token(user)
            
            # Blacklist old refresh token
            await self._blacklist_token(refresh_token)
            
            # Update stored tokens
            session_id = payload.get('session_id')
            await self._store_tokens(user['id'], new_access_token, new_refresh_token, session_id)
            
            return {
                "success": True,
                "access_token": new_access_token,
                "refresh_token": new_refresh_token
            }
            
        except Exception as e:
            return {"success": False, "error": f"Token refresh failed: {str(e)}"}
    
    async def logout(self, access_token: str, logout_all_devices: bool = False) -> Dict:
        """
        Logout user and invalidate tokens
        """
        try:
            # Verify token
            payload = self._verify_token(access_token, TokenType.ACCESS)
            if not payload:
                return {"success": False, "error": "Invalid token"}
            
            user_id = payload['user_id']
            session_id = payload.get('session_id')
            
            if logout_all_devices:
                # Invalidate all sessions for the user
                await self._invalidate_all_sessions(user_id)
            else:
                # Invalidate current session
                await self._invalidate_session(session_id)
                
            # Blacklist the access token
            await self._blacklist_token(access_token)
            
            # Log logout event
            await self._log_auth_event(user_id, 'logout', {
                'session_id': session_id,
                'all_devices': logout_all_devices
            })
            
            return {"success": True, "message": "Logged out successfully"}
            
        except Exception as e:
            return {"success": False, "error": f"Logout failed: {str(e)}"}
    
    # Password Management
    async def request_password_reset(self, email: str) -> Dict:
        """
        Initiate password reset process
        """
        try:
            # Get user
            user = await self._get_user_by_email(email)
            if not user:
                # Don't reveal if email exists
                return {"success": True, "message": "If the email exists, a reset link has been sent"}
            
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            expiry = datetime.utcnow() + timedelta(hours=1)
            
            # Store reset token
            await self._store_password_reset_token(user['id'], reset_token, expiry)
            
            # Send reset email
            await self._send_password_reset_email(email, reset_token)
            
            # Log event
            await self._log_auth_event(user['id'], 'password_reset_requested', {'email': email})
            
            return {"success": True, "message": "If the email exists, a reset link has been sent"}
            
        except Exception as e:
            return {"success": False, "error": f"Password reset request failed: {str(e)}"}
    
    async def reset_password(self, token: str, new_password: str) -> Dict:
        """
        Reset password using reset token
        """
        try:
            # Verify reset token
            user_id = await self._verify_password_reset_token(token)
            if not user_id:
                return {"success": False, "error": "Invalid or expired reset token"}
            
            # Validate new password
            password_validation = self._validate_password_strength(new_password)
            if not password_validation['valid']:
                return {"success": False, "error": password_validation['message']}
            
            # Hash new password
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
            
            # Update password
            await self._update_user_password(user_id, hashed_password.decode('utf-8'))
            
            # Invalidate all sessions (security measure)
            await self._invalidate_all_sessions(user_id)
            
            # Remove reset token
            await self._delete_password_reset_token(token)
            
            # Log event
            await self._log_auth_event(user_id, 'password_reset_completed', {})
            
            return {"success": True, "message": "Password reset successfully"}
            
        except Exception as e:
            return {"success": False, "error": f"Password reset failed: {str(e)}"}
    
    async def change_password(self, user_id: str, old_password: str, new_password: str) -> Dict:
        """
        Change password with old password verification
        """
        try:
            # Get user
            user = await self._get_user_by_id(user_id)
            if not user:
                return {"success": False, "error": "User not found"}
            
            # Verify old password
            if not bcrypt.checkpw(old_password.encode('utf-8'), user['password'].encode('utf-8')):
                return {"success": False, "error": "Current password is incorrect"}
            
            # Validate new password
            password_validation = self._validate_password_strength(new_password)
            if not password_validation['valid']:
                return {"success": False, "error": password_validation['message']}
            
            # Check password history (prevent reuse)
            if await self._is_password_reused(user_id, new_password):
                return {"success": False, "error": "Cannot reuse recent passwords"}
            
            # Hash new password
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
            
            # Update password
            await self._update_user_password(user_id, hashed_password.decode('utf-8'))
            
            # Add to password history
            await self._add_to_password_history(user_id, hashed_password.decode('utf-8'))
            
            # Log event
            await self._log_auth_event(user_id, 'password_changed', {})
            
            return {"success": True, "message": "Password changed successfully"}
            
        except Exception as e:
            return {"success": False, "error": f"Password change failed: {str(e)}"}
    
    # Multi-device Session Tracking
    async def get_active_sessions(self, user_id: str) -> List[Dict]:
        """
        Get all active sessions for a user
        """
        try:
            sessions_key = f"user_sessions:{user_id}"
            session_ids = await self.redis.smembers(sessions_key)
            
            sessions = []
            for session_id in session_ids:
                session_data = await self.redis.hgetall(f"session:{session_id}")
                if session_data:
                    sessions.append({
                        'session_id': session_id,
                        'device': json.loads(session_data.get('device_info', '{}')),
                        'created_at': session_data.get('created_at'),
                        'last_activity': session_data.get('last_activity'),
                        'ip_address': session_data.get('ip_address')
                    })
            
            return sessions
            
        except Exception as e:
            print(f"Error getting active sessions: {e}")
            return []
    
    async def revoke_session(self, user_id: str, session_id: str) -> bool:
        """
        Revoke a specific session
        """
        try:
            # Remove session from user's session set
            await self.redis.srem(f"user_sessions:{user_id}", session_id)
            
            # Delete session data
            await self.redis.delete(f"session:{session_id}")
            
            # Log event
            await self._log_auth_event(user_id, 'session_revoked', {'session_id': session_id})
            
            return True
            
        except Exception as e:
            print(f"Error revoking session: {e}")
            return False
    
    # Helper Methods
    def _validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def _validate_password_strength(self, password: str) -> Dict:
        """
        Validate password strength
        Requirements: min 8 chars, uppercase, lowercase, number
        """
        if len(password) < 8:
            return {'valid': False, 'message': 'Password must be at least 8 characters long'}
        
        if not re.search(r'[A-Z]', password):
            return {'valid': False, 'message': 'Password must contain at least one uppercase letter'}
        
        if not re.search(r'[a-z]', password):
            return {'valid': False, 'message': 'Password must contain at least one lowercase letter'}
        
        if not re.search(r'\d', password):
            return {'valid': False, 'message': 'Password must contain at least one number'}
        
        return {'valid': True, 'message': 'Password is strong'}
    
    def _generate_user_id(self) -> str:
        """Generate unique user ID"""
        return f"user_{secrets.token_hex(16)}"
    
    def _generate_access_token(self, user: Dict) -> str:
        """Generate JWT access token"""
        payload = {
            'user_id': user['id'],
            'email': user['email'],
            'type': TokenType.ACCESS.value,
            'exp': datetime.utcnow() + self.access_token_expiry,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _generate_refresh_token(self, user: Dict) -> str:
        """Generate JWT refresh token"""
        payload = {
            'user_id': user['id'],
            'type': TokenType.REFRESH.value,
            'exp': datetime.utcnow() + self.refresh_token_expiry,
            'iat': datetime.utcnow(),
            'token_id': secrets.token_hex(16)
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _verify_token(self, token: str, token_type: TokenType) -> Optional[Dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            if payload.get('type') != token_type.value:
                return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _generate_mfa_token(self, user_id: str) -> str:
        """Generate temporary MFA challenge token"""
        payload = {
            'user_id': user_id,
            'type': 'mfa_challenge',
            'exp': datetime.utcnow() + timedelta(minutes=5),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    async def _email_exists(self, email: str) -> bool:
        """Check if email already exists in database"""
        # Implementation depends on your database
        # This is a placeholder
        return False
    
    async def _store_user(self, user_data: Dict) -> None:
        """Store user in database"""
        # Implementation depends on your database
        pass
    
    async def _get_user_by_email(self, email: str) -> Optional[Dict]:
        """Retrieve user by email"""
        # Implementation depends on your database
        return None
    
    async def _get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Retrieve user by ID"""
        # Implementation depends on your database
        return None
    
    async def _update_user_password(self, user_id: str, hashed_password: str) -> None:
        """Update user password in database"""
        # Implementation depends on your database
        pass
    
    async def _update_login_info(self, user_id: str) -> None:
        """Update last login timestamp"""
        # Implementation depends on your database
        pass
    
    async def _create_session(self, user_id: str, device_info: Dict) -> str:
        """Create new session"""
        session_id = f"session_{secrets.token_hex(16)}"
        session_data = {
            'user_id': user_id,
            'device_info': json.dumps(device_info),
            'created_at': datetime.utcnow().isoformat(),
            'last_activity': datetime.utcnow().isoformat()
        }
        
        # Store session in Redis
        await self.redis.hset(f"session:{session_id}", mapping=session_data)
        await self.redis.sadd(f"user_sessions:{user_id}", session_id)
        await self.redis.expire(f"session:{session_id}", int(self.refresh_token_expiry.total_seconds()))
        
        return session_id
    
    async def _store_tokens(self, user_id: str, access_token: str, refresh_token: str, session_id: str) -> None:
        """Store tokens in Redis"""
        # Store with expiry
        await self.redis.setex(
            f"access_token:{access_token}",
            int(self.access_token_expiry.total_seconds()),
            json.dumps({'user_id': user_id, 'session_id': session_id})
        )
        
        await self.redis.setex(
            f"refresh_token:{refresh_token}",
            int(self.refresh_token_expiry.total_seconds()),
            json.dumps({'user_id': user_id, 'session_id': session_id})
        )
    
    async def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        return await self.redis.exists(f"blacklist:{token}")
    
    async def _blacklist_token(self, token: str) -> None:
        """Add token to blacklist"""
        # Set with expiry matching token expiry
        await self.redis.setex(f"blacklist:{token}", 86400, "1")  # 24 hours
    
    async def _invalidate_session(self, session_id: str) -> None:
        """Invalidate a specific session"""
        session_data = await self.redis.hgetall(f"session:{session_id}")
        if session_data:
            user_id = session_data.get('user_id')
            await self.redis.srem(f"user_sessions:{user_id}", session_id)
            await self.redis.delete(f"session:{session_id}")
    
    async def _invalidate_all_sessions(self, user_id: str) -> None:
        """Invalidate all sessions for a user"""
        sessions_key = f"user_sessions:{user_id}"
        session_ids = await self.redis.smembers(sessions_key)
        
        for session_id in session_ids:
            await self.redis.delete(f"session:{session_id}")
        
        await self.redis.delete(sessions_key)
    
    async def _is_rate_limited(self, identifier: str) -> bool:
        """Check if identifier is rate limited"""
        key = f"rate_limit:{identifier}"
        attempts = await self.redis.get(key)
        
        if attempts and int(attempts) >= self.max_login_attempts:
            return True
        return False
    
    async def _record_failed_login(self, email: str, user_id: str = None) -> None:
        """Record failed login attempt"""
        key = f"rate_limit:{email}"
        await self.redis.incr(key)
        await self.redis.expire(key, 900)  # 15 minutes
        
        if user_id:
            # Update failed attempts in database
            pass
    
    async def _reset_failed_login_attempts(self, user_id: str) -> None:
        """Reset failed login attempts"""
        # Update in database
        pass
    
    async def _lock_account(self, user_id: str) -> None:
        """Lock user account"""
        lockout_until = datetime.utcnow() + self.lockout_duration
        # Update account status in database
        pass
    
    async def _unlock_account(self, user_id: str) -> None:
        """Unlock user account"""
        # Update account status in database
        pass
    
    async def _get_lockout_time(self, user_id: str) -> Optional[datetime]:
        """Get account lockout expiry time"""
        # Query from database
        return None
    
    async def _send_verification_email(self, email: str, token: str) -> None:
        """Send email verification"""
        # Email sending implementation
        pass
    
    async def _send_password_reset_email(self, email: str, token: str) -> None:
        """Send password reset email"""
        # Email sending implementation
        pass
    
    async def _store_password_reset_token(self, user_id: str, token: str, expiry: datetime) -> None:
        """Store password reset token"""
        await self.redis.setex(
            f"password_reset:{token}",
            int((expiry - datetime.utcnow()).total_seconds()),
            user_id
        )
    
    async def _verify_password_reset_token(self, token: str) -> Optional[str]:
        """Verify password reset token"""
        user_id = await self.redis.get(f"password_reset:{token}")
        return user_id.decode('utf-8') if user_id else None
    
    async def _delete_password_reset_token(self, token: str) -> None:
        """Delete password reset token"""
        await self.redis.delete(f"password_reset:{token}")
    
    async def _is_password_reused(self, user_id: str, password: str) -> bool:
        """Check if password was recently used"""
        # Check password history in database
        return False
    
    async def _add_to_password_history(self, user_id: str, hashed_password: str) -> None:
        """Add password to history"""
        # Store in database with limit on history size
        pass
    
    async def _log_auth_event(self, user_id: str, event_type: str, metadata: Dict) -> None:
        """Log authentication event"""
        event = {
            'user_id': user_id,
            'event_type': event_type,
            'metadata': metadata,
            'timestamp': datetime.utcnow().isoformat(),
            'ip_address': metadata.get('ip_address', 'unknown')
        }
        # Store in database or logging system
        pass