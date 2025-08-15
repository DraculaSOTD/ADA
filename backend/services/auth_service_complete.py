"""
Complete Authentication Service Implementation
Comprehensive authentication system with all required features
"""

import os
import jwt
import bcrypt
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, List, Any
from dataclasses import dataclass
import re
import redis
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import logging

logger = logging.getLogger(__name__)


@dataclass
class UserSession:
    """User session information"""
    user_id: str
    device_id: str
    ip_address: str
    user_agent: str
    created_at: datetime
    last_activity: datetime
    refresh_token: str


class AuthenticationService:
    """
    Complete authentication service with all required features:
    - User registration with email verification
    - JWT token management (access + refresh)
    - Password management
    - Session tracking
    - Rate limiting
    - Multi-device support
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.redis_client = redis.Redis(
            host=config.get('redis_host', 'localhost'),
            port=config.get('redis_port', 6379),
            decode_responses=True
        )
        
        # JWT Configuration
        self.jwt_secret = config.get('jwt_secret', 'change-this-secret')
        self.jwt_algorithm = 'HS256'
        self.access_token_expire = timedelta(hours=1)
        self.refresh_token_expire = timedelta(days=7)
        
        # Password requirements
        self.min_password_length = 8
        self.require_uppercase = True
        self.require_lowercase = True
        self.require_numbers = True
        self.require_special = True
        
        # Rate limiting
        self.max_login_attempts = 5
        self.lockout_duration = timedelta(minutes=30)
        
        # Email configuration
        self.smtp_host = config.get('smtp_host', 'smtp.gmail.com')
        self.smtp_port = config.get('smtp_port', 587)
        self.smtp_user = config.get('smtp_user')
        self.smtp_password = config.get('smtp_password')
        self.from_email = config.get('from_email', 'noreply@ada-platform.com')
        
        # Initial token balance for new users
        self.initial_token_balance = 1000
    
    async def register_user(self, email: str, password: str, full_name: str,
                           username: str) -> Dict[str, Any]:
        """
        Register a new user with email verification
        """
        try:
            # Validate email format
            if not self._validate_email(email):
                return {'success': False, 'error': 'Invalid email format'}
            
            # Check if email already exists
            if await self._email_exists(email):
                return {'success': False, 'error': 'Email already registered'}
            
            # Check username uniqueness
            if await self._username_exists(username):
                return {'success': False, 'error': 'Username already taken'}
            
            # Validate password strength
            password_validation = self._validate_password(password)
            if not password_validation['valid']:
                return {'success': False, 'error': password_validation['message']}
            
            # Hash password
            password_hash = self._hash_password(password)
            
            # Generate user ID
            user_id = self._generate_user_id()
            
            # Generate email verification token
            verification_token = self._generate_verification_token()
            
            # Store user data
            user_data = {
                'user_id': user_id,
                'email': email,
                'username': username,
                'full_name': full_name,
                'password_hash': password_hash,
                'email_verified': False,
                'verification_token': verification_token,
                'token_balance': self.initial_token_balance,
                'created_at': datetime.utcnow().isoformat(),
                'last_login': None,
                'is_active': True,
                'failed_login_attempts': 0,
                'locked_until': None,
                'force_password_change': False,
                'sessions': []
            }
            
            # Save to database (Redis for now)
            await self._save_user(user_data)
            
            # Send verification email
            await self._send_verification_email(email, verification_token)
            
            return {
                'success': True,
                'user_id': user_id,
                'message': 'Registration successful. Please check your email for verification.'
            }
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return {'success': False, 'error': 'Registration failed'}
    
    async def login(self, email_or_username: str, password: str, 
                   device_info: Dict) -> Dict[str, Any]:
        """
        User login with JWT token generation
        """
        try:
            # Get user by email or username
            user = await self._get_user_by_email_or_username(email_or_username)
            if not user:
                return {'success': False, 'error': 'Invalid credentials'}
            
            # Check if account is locked
            if await self._is_account_locked(user['user_id']):
                return {'success': False, 'error': 'Account temporarily locked due to multiple failed attempts'}
            
            # Verify password
            if not self._verify_password(password, user['password_hash']):
                # Increment failed attempts
                await self._increment_failed_attempts(user['user_id'])
                return {'success': False, 'error': 'Invalid credentials'}
            
            # Check if email is verified
            if not user.get('email_verified', False):
                return {'success': False, 'error': 'Please verify your email before logging in'}
            
            # Check if forced password change is required
            if user.get('force_password_change', False):
                return {
                    'success': False,
                    'error': 'Password change required',
                    'force_password_change': True
                }
            
            # Reset failed attempts on successful login
            await self._reset_failed_attempts(user['user_id'])
            
            # Generate tokens
            access_token = self._generate_access_token(user['user_id'])
            refresh_token = self._generate_refresh_token()
            
            # Create session
            session = UserSession(
                user_id=user['user_id'],
                device_id=device_info.get('device_id', 'unknown'),
                ip_address=device_info.get('ip_address', 'unknown'),
                user_agent=device_info.get('user_agent', 'unknown'),
                created_at=datetime.utcnow(),
                last_activity=datetime.utcnow(),
                refresh_token=refresh_token
            )
            
            # Store session
            await self._store_session(session)
            
            # Update last login
            await self._update_last_login(user['user_id'])
            
            return {
                'success': True,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'user_id': user['user_id'],
                    'email': user['email'],
                    'username': user['username'],
                    'full_name': user['full_name'],
                    'token_balance': user['token_balance']
                }
            }
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return {'success': False, 'error': 'Login failed'}
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token with rotation
        """
        try:
            # Find session by refresh token
            session = await self._get_session_by_refresh_token(refresh_token)
            if not session:
                return {'success': False, 'error': 'Invalid refresh token'}
            
            # Check if refresh token is expired
            if await self._is_refresh_token_expired(refresh_token):
                await self._remove_session(refresh_token)
                return {'success': False, 'error': 'Refresh token expired'}
            
            # Generate new tokens (rotation)
            new_access_token = self._generate_access_token(session['user_id'])
            new_refresh_token = self._generate_refresh_token()
            
            # Update session with new refresh token
            await self._rotate_refresh_token(refresh_token, new_refresh_token)
            
            return {
                'success': True,
                'access_token': new_access_token,
                'refresh_token': new_refresh_token
            }
            
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return {'success': False, 'error': 'Token refresh failed'}
    
    async def logout(self, access_token: str, refresh_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Logout user and blacklist tokens
        """
        try:
            # Decode access token to get user_id
            payload = self._decode_token(access_token)
            if not payload:
                return {'success': False, 'error': 'Invalid token'}
            
            # Blacklist access token
            await self._blacklist_token(access_token, 'access')
            
            # Remove session if refresh token provided
            if refresh_token:
                await self._remove_session(refresh_token)
                await self._blacklist_token(refresh_token, 'refresh')
            
            return {'success': True, 'message': 'Logged out successfully'}
            
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return {'success': False, 'error': 'Logout failed'}
    
    async def verify_email(self, token: str) -> Dict[str, Any]:
        """
        Verify user email with token
        """
        try:
            # Find user by verification token
            user = await self._get_user_by_verification_token(token)
            if not user:
                return {'success': False, 'error': 'Invalid verification token'}
            
            # Update email verification status
            await self._update_user(user['user_id'], {
                'email_verified': True,
                'verification_token': None
            })
            
            return {'success': True, 'message': 'Email verified successfully'}
            
        except Exception as e:
            logger.error(f"Email verification error: {str(e)}")
            return {'success': False, 'error': 'Verification failed'}
    
    async def request_password_reset(self, email: str) -> Dict[str, Any]:
        """
        Request password reset via email
        """
        try:
            # Get user by email
            user = await self._get_user_by_email(email)
            if not user:
                # Don't reveal if email exists
                return {'success': True, 'message': 'If the email exists, a reset link has been sent'}
            
            # Generate reset token
            reset_token = self._generate_reset_token()
            
            # Store reset token with expiry
            await self._store_reset_token(user['user_id'], reset_token)
            
            # Send reset email
            await self._send_password_reset_email(email, reset_token)
            
            return {'success': True, 'message': 'If the email exists, a reset link has been sent'}
            
        except Exception as e:
            logger.error(f"Password reset request error: {str(e)}")
            return {'success': False, 'error': 'Request failed'}
    
    async def reset_password(self, token: str, new_password: str) -> Dict[str, Any]:
        """
        Reset password with token
        """
        try:
            # Get user by reset token
            user_id = await self._get_user_by_reset_token(token)
            if not user_id:
                return {'success': False, 'error': 'Invalid or expired reset token'}
            
            # Validate new password
            password_validation = self._validate_password(new_password)
            if not password_validation['valid']:
                return {'success': False, 'error': password_validation['message']}
            
            # Hash new password
            password_hash = self._hash_password(new_password)
            
            # Update password
            await self._update_user(user_id, {
                'password_hash': password_hash,
                'force_password_change': False
            })
            
            # Remove reset token
            await self._remove_reset_token(user_id)
            
            # Invalidate all sessions
            await self._invalidate_all_sessions(user_id)
            
            return {'success': True, 'message': 'Password reset successfully'}
            
        except Exception as e:
            logger.error(f"Password reset error: {str(e)}")
            return {'success': False, 'error': 'Reset failed'}
    
    async def change_password(self, user_id: str, old_password: str, 
                            new_password: str) -> Dict[str, Any]:
        """
        Change password with old password verification
        """
        try:
            # Get user
            user = await self._get_user_by_id(user_id)
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            # Verify old password
            if not self._verify_password(old_password, user['password_hash']):
                return {'success': False, 'error': 'Current password is incorrect'}
            
            # Validate new password
            password_validation = self._validate_password(new_password)
            if not password_validation['valid']:
                return {'success': False, 'error': password_validation['message']}
            
            # Check if new password is same as old
            if self._verify_password(new_password, user['password_hash']):
                return {'success': False, 'error': 'New password must be different from current password'}
            
            # Hash new password
            password_hash = self._hash_password(new_password)
            
            # Update password
            await self._update_user(user_id, {
                'password_hash': password_hash,
                'force_password_change': False,
                'password_changed_at': datetime.utcnow().isoformat()
            })
            
            return {'success': True, 'message': 'Password changed successfully'}
            
        except Exception as e:
            logger.error(f"Password change error: {str(e)}")
            return {'success': False, 'error': 'Password change failed'}
    
    async def get_user_sessions(self, user_id: str) -> List[Dict]:
        """
        Get all active sessions for a user
        """
        try:
            sessions = []
            session_keys = self.redis_client.keys(f"session:user:{user_id}:*")
            
            for key in session_keys:
                session_data = self.redis_client.hgetall(key)
                if session_data:
                    sessions.append({
                        'device_id': session_data.get('device_id'),
                        'ip_address': session_data.get('ip_address'),
                        'user_agent': session_data.get('user_agent'),
                        'created_at': session_data.get('created_at'),
                        'last_activity': session_data.get('last_activity')
                    })
            
            return sessions
            
        except Exception as e:
            logger.error(f"Get sessions error: {str(e)}")
            return []
    
    async def revoke_session(self, user_id: str, device_id: str) -> Dict[str, Any]:
        """
        Revoke a specific session
        """
        try:
            # Find and remove session
            session_key = f"session:user:{user_id}:device:{device_id}"
            session_data = self.redis_client.hgetall(session_key)
            
            if session_data:
                # Blacklist the refresh token
                refresh_token = session_data.get('refresh_token')
                if refresh_token:
                    await self._blacklist_token(refresh_token, 'refresh')
                
                # Remove session
                self.redis_client.delete(session_key)
                
                return {'success': True, 'message': 'Session revoked'}
            
            return {'success': False, 'error': 'Session not found'}
            
        except Exception as e:
            logger.error(f"Revoke session error: {str(e)}")
            return {'success': False, 'error': 'Failed to revoke session'}
    
    async def force_password_change(self, user_id: str) -> Dict[str, Any]:
        """
        Force a user to change password on next login (admin action)
        """
        try:
            await self._update_user(user_id, {'force_password_change': True})
            await self._invalidate_all_sessions(user_id)
            
            return {'success': True, 'message': 'User will be required to change password on next login'}
            
        except Exception as e:
            logger.error(f"Force password change error: {str(e)}")
            return {'success': False, 'error': 'Failed to force password change'}
    
    # Helper methods
    def _validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def _validate_password(self, password: str) -> Dict[str, Any]:
        """Validate password strength"""
        if len(password) < self.min_password_length:
            return {
                'valid': False,
                'message': f'Password must be at least {self.min_password_length} characters'
            }
        
        if self.require_uppercase and not re.search(r'[A-Z]', password):
            return {
                'valid': False,
                'message': 'Password must contain at least one uppercase letter'
            }
        
        if self.require_lowercase and not re.search(r'[a-z]', password):
            return {
                'valid': False,
                'message': 'Password must contain at least one lowercase letter'
            }
        
        if self.require_numbers and not re.search(r'\d', password):
            return {
                'valid': False,
                'message': 'Password must contain at least one number'
            }
        
        if self.require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return {
                'valid': False,
                'message': 'Password must contain at least one special character'
            }
        
        return {'valid': True, 'message': 'Password is strong'}
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def _generate_user_id(self) -> str:
        """Generate unique user ID"""
        return f"user_{secrets.token_hex(16)}"
    
    def _generate_verification_token(self) -> str:
        """Generate email verification token"""
        return secrets.token_urlsafe(32)
    
    def _generate_reset_token(self) -> str:
        """Generate password reset token"""
        return secrets.token_urlsafe(32)
    
    def _generate_access_token(self, user_id: str) -> str:
        """Generate JWT access token"""
        payload = {
            'user_id': user_id,
            'type': 'access',
            'exp': datetime.utcnow() + self.access_token_expire,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _generate_refresh_token(self) -> str:
        """Generate refresh token"""
        return secrets.token_urlsafe(64)
    
    def _decode_token(self, token: str) -> Optional[Dict]:
        """Decode JWT token"""
        try:
            return jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    async def _email_exists(self, email: str) -> bool:
        """Check if email already exists"""
        key = f"user:email:{email}"
        return self.redis_client.exists(key)
    
    async def _username_exists(self, username: str) -> bool:
        """Check if username already exists"""
        key = f"user:username:{username}"
        return self.redis_client.exists(key)
    
    async def _save_user(self, user_data: Dict):
        """Save user data to database"""
        user_id = user_data['user_id']
        
        # Store user data
        self.redis_client.hset(f"user:{user_id}", mapping=user_data)
        
        # Create indexes
        self.redis_client.set(f"user:email:{user_data['email']}", user_id)
        self.redis_client.set(f"user:username:{user_data['username']}", user_id)
        
        if user_data.get('verification_token'):
            self.redis_client.setex(
                f"verification:{user_data['verification_token']}", 
                86400,  # 24 hours
                user_id
            )
    
    async def _get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        user_data = self.redis_client.hgetall(f"user:{user_id}")
        return user_data if user_data else None
    
    async def _get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        user_id = self.redis_client.get(f"user:email:{email}")
        if user_id:
            return await self._get_user_by_id(user_id)
        return None
    
    async def _get_user_by_email_or_username(self, identifier: str) -> Optional[Dict]:
        """Get user by email or username"""
        # Try email first
        user = await self._get_user_by_email(identifier)
        if user:
            return user
        
        # Try username
        user_id = self.redis_client.get(f"user:username:{identifier}")
        if user_id:
            return await self._get_user_by_id(user_id)
        
        return None
    
    async def _get_user_by_verification_token(self, token: str) -> Optional[Dict]:
        """Get user by verification token"""
        user_id = self.redis_client.get(f"verification:{token}")
        if user_id:
            return await self._get_user_by_id(user_id)
        return None
    
    async def _update_user(self, user_id: str, updates: Dict):
        """Update user data"""
        for key, value in updates.items():
            if value is not None:
                self.redis_client.hset(f"user:{user_id}", key, value)
            else:
                self.redis_client.hdel(f"user:{user_id}", key)
    
    async def _is_account_locked(self, user_id: str) -> bool:
        """Check if account is locked"""
        user = await self._get_user_by_id(user_id)
        if not user:
            return False
        
        locked_until = user.get('locked_until')
        if locked_until:
            locked_until_dt = datetime.fromisoformat(locked_until)
            if locked_until_dt > datetime.utcnow():
                return True
            else:
                # Unlock if time has passed
                await self._update_user(user_id, {'locked_until': None})
        
        return False
    
    async def _increment_failed_attempts(self, user_id: str):
        """Increment failed login attempts"""
        user = await self._get_user_by_id(user_id)
        if not user:
            return
        
        attempts = int(user.get('failed_login_attempts', 0)) + 1
        updates = {'failed_login_attempts': attempts}
        
        if attempts >= self.max_login_attempts:
            locked_until = datetime.utcnow() + self.lockout_duration
            updates['locked_until'] = locked_until.isoformat()
        
        await self._update_user(user_id, updates)
    
    async def _reset_failed_attempts(self, user_id: str):
        """Reset failed login attempts"""
        await self._update_user(user_id, {
            'failed_login_attempts': 0,
            'locked_until': None
        })
    
    async def _update_last_login(self, user_id: str):
        """Update last login timestamp"""
        await self._update_user(user_id, {
            'last_login': datetime.utcnow().isoformat()
        })
    
    async def _store_session(self, session: UserSession):
        """Store user session"""
        session_key = f"session:user:{session.user_id}:device:{session.device_id}"
        session_data = {
            'user_id': session.user_id,
            'device_id': session.device_id,
            'ip_address': session.ip_address,
            'user_agent': session.user_agent,
            'created_at': session.created_at.isoformat(),
            'last_activity': session.last_activity.isoformat(),
            'refresh_token': session.refresh_token
        }
        
        self.redis_client.hset(session_key, mapping=session_data)
        
        # Map refresh token to session
        self.redis_client.setex(
            f"refresh:{session.refresh_token}",
            int(self.refresh_token_expire.total_seconds()),
            session_key
        )
    
    async def _get_session_by_refresh_token(self, refresh_token: str) -> Optional[Dict]:
        """Get session by refresh token"""
        session_key = self.redis_client.get(f"refresh:{refresh_token}")
        if session_key:
            return self.redis_client.hgetall(session_key)
        return None
    
    async def _is_refresh_token_expired(self, refresh_token: str) -> bool:
        """Check if refresh token is expired"""
        return not self.redis_client.exists(f"refresh:{refresh_token}")
    
    async def _rotate_refresh_token(self, old_token: str, new_token: str):
        """Rotate refresh token"""
        session_key = self.redis_client.get(f"refresh:{old_token}")
        if session_key:
            # Update session with new token
            self.redis_client.hset(session_key, 'refresh_token', new_token)
            
            # Remove old token mapping
            self.redis_client.delete(f"refresh:{old_token}")
            
            # Create new token mapping
            self.redis_client.setex(
                f"refresh:{new_token}",
                int(self.refresh_token_expire.total_seconds()),
                session_key
            )
    
    async def _remove_session(self, refresh_token: str):
        """Remove session"""
        session_key = self.redis_client.get(f"refresh:{refresh_token}")
        if session_key:
            self.redis_client.delete(session_key)
            self.redis_client.delete(f"refresh:{refresh_token}")
    
    async def _blacklist_token(self, token: str, token_type: str):
        """Blacklist a token"""
        if token_type == 'access':
            # Blacklist for remaining validity period
            ttl = int(self.access_token_expire.total_seconds())
        else:
            ttl = int(self.refresh_token_expire.total_seconds())
        
        self.redis_client.setex(f"blacklist:{token}", ttl, '1')
    
    async def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        return self.redis_client.exists(f"blacklist:{token}")
    
    async def _invalidate_all_sessions(self, user_id: str):
        """Invalidate all sessions for a user"""
        session_keys = self.redis_client.keys(f"session:user:{user_id}:*")
        
        for key in session_keys:
            session_data = self.redis_client.hgetall(key)
            if session_data:
                refresh_token = session_data.get('refresh_token')
                if refresh_token:
                    await self._blacklist_token(refresh_token, 'refresh')
                    self.redis_client.delete(f"refresh:{refresh_token}")
            
            self.redis_client.delete(key)
    
    async def _store_reset_token(self, user_id: str, token: str):
        """Store password reset token"""
        self.redis_client.setex(
            f"reset:{token}",
            3600,  # 1 hour expiry
            user_id
        )
    
    async def _get_user_by_reset_token(self, token: str) -> Optional[str]:
        """Get user ID by reset token"""
        return self.redis_client.get(f"reset:{token}")
    
    async def _remove_reset_token(self, user_id: str):
        """Remove reset token"""
        # Find and remove reset token for user
        reset_keys = self.redis_client.keys("reset:*")
        for key in reset_keys:
            if self.redis_client.get(key) == user_id:
                self.redis_client.delete(key)
    
    async def _send_verification_email(self, email: str, token: str):
        """Send email verification"""
        try:
            subject = "Verify your ADA Platform account"
            verification_url = f"https://ada-platform.com/verify-email?token={token}"
            
            body = f"""
            Welcome to ADA Platform!
            
            Please verify your email address by clicking the link below:
            {verification_url}
            
            This link will expire in 24 hours.
            
            If you didn't create an account, please ignore this email.
            
            Best regards,
            The ADA Team
            """
            
            await self._send_email(email, subject, body)
            
        except Exception as e:
            logger.error(f"Failed to send verification email: {str(e)}")
    
    async def _send_password_reset_email(self, email: str, token: str):
        """Send password reset email"""
        try:
            subject = "Reset your ADA Platform password"
            reset_url = f"https://ada-platform.com/reset-password?token={token}"
            
            body = f"""
            You requested a password reset for your ADA Platform account.
            
            Click the link below to reset your password:
            {reset_url}
            
            This link will expire in 1 hour.
            
            If you didn't request this reset, please ignore this email.
            
            Best regards,
            The ADA Team
            """
            
            await self._send_email(email, subject, body)
            
        except Exception as e:
            logger.error(f"Failed to send reset email: {str(e)}")
    
    async def _send_email(self, to_email: str, subject: str, body: str):
        """Send email via SMTP"""
        if not self.smtp_user or not self.smtp_password:
            logger.warning("SMTP credentials not configured")
            return
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
                
        except Exception as e:
            logger.error(f"Email send error: {str(e)}")