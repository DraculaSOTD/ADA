"""
PayStack Payment Gateway Integration
African payment processor supporting ZAR, NGN, GHS, KES
"""

import requests
import hmac
import hashlib
import json
from typing import Dict, Optional, Any, List
from datetime import datetime
import logging
import os
from decimal import Decimal

logger = logging.getLogger(__name__)


class PayStackService:
    """
    PayStack payment gateway integration for African payments
    Supports cards, mobile money, bank transfers, and USSD
    """
    
    def __init__(self, test_mode: bool = True):
        """
        Initialize PayStack service
        
        Args:
            test_mode: Use test keys for development
        """
        self.test_mode = test_mode
        
        if test_mode:
            self.secret_key = os.getenv('PAYSTACK_TEST_SECRET_KEY', 'sk_test_')
            self.public_key = os.getenv('PAYSTACK_TEST_PUBLIC_KEY', 'pk_test_')
        else:
            self.secret_key = os.getenv('PAYSTACK_SECRET_KEY')
            self.public_key = os.getenv('PAYSTACK_PUBLIC_KEY')
        
        self.base_url = 'https://api.paystack.co'
        self.callback_url = os.getenv('PAYSTACK_CALLBACK_URL', 'https://yourdomain.com/payment/paystack/callback')
        
        # Default headers for API requests
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
        }
    
    def initialize_transaction(
        self,
        amount: Decimal,
        email: str,
        currency: str = 'ZAR',
        reference: str = None,
        callback_url: str = None,
        plan: str = None,
        channels: List[str] = None,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Initialize a PayStack transaction
        
        Args:
            amount: Amount in smallest currency unit (e.g., cents for ZAR)
            email: Customer email address
            currency: Currency code (ZAR, NGN, GHS, KES, USD)
            reference: Unique transaction reference
            callback_url: Custom callback URL
            plan: Subscription plan code
            channels: Payment channels to allow ['card', 'bank', 'ussd', 'qr', 'mobile_money']
            metadata: Additional transaction metadata
        
        Returns:
            Transaction initialization response
        """
        url = f"{self.base_url}/transaction/initialize"
        
        # Convert amount to smallest unit (e.g., Rands to cents)
        amount_in_cents = int(amount * 100)
        
        data = {
            'amount': amount_in_cents,
            'email': email,
            'currency': currency,
            'callback_url': callback_url or self.callback_url,
        }
        
        # Add optional parameters
        if reference:
            data['reference'] = reference
        else:
            # Generate unique reference
            data['reference'] = f"ADA_{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.urandom(4).hex()}"
        
        if plan:
            data['plan'] = plan
        
        if channels:
            data['channels'] = channels
        
        if metadata:
            data['metadata'] = metadata
        
        try:
            response = requests.post(url, json=data, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('status'):
                return {
                    'success': True,
                    'payment_url': result['data']['authorization_url'],
                    'access_code': result['data']['access_code'],
                    'reference': result['data']['reference'],
                    'raw_response': result
                }
            else:
                return {
                    'success': False,
                    'error': result.get('message', 'Transaction initialization failed')
                }
                
        except requests.RequestException as e:
            logger.error(f"PayStack transaction initialization failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """
        Verify a PayStack transaction
        
        Args:
            reference: Transaction reference to verify
        
        Returns:
            Transaction verification response
        """
        url = f"{self.base_url}/transaction/verify/{reference}"
        
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('status') and result['data']['status'] == 'success':
                return {
                    'success': True,
                    'status': 'success',
                    'amount': result['data']['amount'] / 100,  # Convert back from cents
                    'currency': result['data']['currency'],
                    'customer': result['data']['customer'],
                    'reference': result['data']['reference'],
                    'gateway_response': result['data']['gateway_response'],
                    'paid_at': result['data']['paid_at'],
                    'channel': result['data']['channel'],
                    'fees': result['data']['fees'] / 100 if result['data'].get('fees') else 0,
                    'raw_response': result
                }
            else:
                return {
                    'success': False,
                    'status': result['data'].get('status', 'failed'),
                    'error': result['data'].get('gateway_response', 'Transaction verification failed')
                }
                
        except requests.RequestException as e:
            logger.error(f"PayStack transaction verification failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_customer(
        self,
        email: str,
        first_name: str = None,
        last_name: str = None,
        phone: str = None,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Create a PayStack customer
        
        Args:
            email: Customer email
            first_name: Customer first name
            last_name: Customer last name
            phone: Customer phone number
            metadata: Additional customer data
        
        Returns:
            Customer creation response
        """
        url = f"{self.base_url}/customer"
        
        data = {'email': email}
        
        if first_name:
            data['first_name'] = first_name
        if last_name:
            data['last_name'] = last_name
        if phone:
            data['phone'] = phone
        if metadata:
            data['metadata'] = metadata
        
        try:
            response = requests.post(url, json=data, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('status'):
                return {
                    'success': True,
                    'customer_code': result['data']['customer_code'],
                    'customer_id': result['data']['id'],
                    'raw_response': result
                }
            else:
                return {
                    'success': False,
                    'error': result.get('message', 'Customer creation failed')
                }
                
        except requests.RequestException as e:
            logger.error(f"PayStack customer creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_plan(
        self,
        name: str,
        amount: Decimal,
        interval: str = 'monthly',
        currency: str = 'ZAR',
        description: str = None
    ) -> Dict[str, Any]:
        """
        Create a subscription plan
        
        Args:
            name: Plan name
            amount: Plan amount
            interval: Billing interval (hourly, daily, weekly, monthly, quarterly, annually)
            currency: Currency code
            description: Plan description
        
        Returns:
            Plan creation response
        """
        url = f"{self.base_url}/plan"
        
        data = {
            'name': name,
            'amount': int(amount * 100),  # Convert to cents
            'interval': interval,
            'currency': currency
        }
        
        if description:
            data['description'] = description
        
        try:
            response = requests.post(url, json=data, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('status'):
                return {
                    'success': True,
                    'plan_code': result['data']['plan_code'],
                    'plan_id': result['data']['id'],
                    'raw_response': result
                }
            else:
                return {
                    'success': False,
                    'error': result.get('message', 'Plan creation failed')
                }
                
        except requests.RequestException as e:
            logger.error(f"PayStack plan creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_subscription(
        self,
        customer: str,
        plan: str,
        authorization: str = None,
        start_date: datetime = None
    ) -> Dict[str, Any]:
        """
        Create a subscription for a customer
        
        Args:
            customer: Customer email or customer code
            plan: Plan code
            authorization: Authorization code for charging
            start_date: Subscription start date
        
        Returns:
            Subscription creation response
        """
        url = f"{self.base_url}/subscription"
        
        data = {
            'customer': customer,
            'plan': plan
        }
        
        if authorization:
            data['authorization'] = authorization
        
        if start_date:
            data['start_date'] = start_date.isoformat()
        
        try:
            response = requests.post(url, json=data, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('status'):
                return {
                    'success': True,
                    'subscription_code': result['data']['subscription_code'],
                    'subscription_id': result['data']['id'],
                    'raw_response': result
                }
            else:
                return {
                    'success': False,
                    'error': result.get('message', 'Subscription creation failed')
                }
                
        except requests.RequestException as e:
            logger.error(f"PayStack subscription creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def cancel_subscription(self, subscription_code: str) -> Dict[str, Any]:
        """
        Cancel a subscription
        
        Args:
            subscription_code: Subscription code to cancel
        
        Returns:
            Cancellation response
        """
        url = f"{self.base_url}/subscription/disable"
        
        data = {
            'code': subscription_code,
            'token': subscription_code  # Some endpoints use token instead of code
        }
        
        try:
            response = requests.post(url, json=data, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            return {
                'success': result.get('status', False),
                'message': result.get('message', 'Subscription cancelled'),
                'raw_response': result
            }
                
        except requests.RequestException as e:
            logger.error(f"PayStack subscription cancellation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify PayStack webhook signature
        
        Args:
            payload: Raw webhook payload
            signature: Signature from PayStack headers
        
        Returns:
            True if signature is valid
        """
        # Generate HMAC SHA512 signature
        expected_signature = hmac.new(
            self.secret_key.encode(),
            payload.encode() if isinstance(payload, str) else payload,
            hashlib.sha512
        ).hexdigest()
        
        # Compare signatures
        is_valid = hmac.compare_digest(expected_signature, signature)
        
        if not is_valid:
            logger.warning(f"Invalid PayStack webhook signature")
        
        return is_valid
    
    def parse_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse PayStack webhook data
        
        Args:
            webhook_data: Webhook payload from PayStack
        
        Returns:
            Parsed webhook data
        """
        event = webhook_data.get('event', '')
        data = webhook_data.get('data', {})
        
        # Map PayStack events to internal status
        event_map = {
            'charge.success': 'success',
            'charge.failed': 'failed',
            'subscription.create': 'subscription_created',
            'subscription.disable': 'subscription_cancelled',
            'invoice.payment_failed': 'payment_failed',
            'invoice.create': 'invoice_created',
            'invoice.update': 'invoice_updated',
            'transfer.success': 'transfer_success',
            'transfer.failed': 'transfer_failed',
        }
        
        internal_event = event_map.get(event, event)
        
        return {
            'event': internal_event,
            'reference': data.get('reference'),
            'amount': data.get('amount', 0) / 100 if data.get('amount') else 0,
            'currency': data.get('currency'),
            'status': data.get('status'),
            'customer': data.get('customer'),
            'metadata': data.get('metadata', {}),
            'channel': data.get('channel'),
            'gateway_response': data.get('gateway_response'),
            'paid_at': data.get('paid_at'),
            'created_at': data.get('created_at'),
            'raw_data': webhook_data
        }
    
    def create_transfer_recipient(
        self,
        name: str,
        account_number: str,
        bank_code: str,
        currency: str = 'ZAR',
        description: str = None
    ) -> Dict[str, Any]:
        """
        Create a transfer recipient for payouts
        
        Args:
            name: Recipient name
            account_number: Bank account number
            bank_code: Bank code
            currency: Currency code
            description: Recipient description
        
        Returns:
            Recipient creation response
        """
        url = f"{self.base_url}/transferrecipient"
        
        data = {
            'type': 'nuban',  # Bank account type
            'name': name,
            'account_number': account_number,
            'bank_code': bank_code,
            'currency': currency
        }
        
        if description:
            data['description'] = description
        
        try:
            response = requests.post(url, json=data, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('status'):
                return {
                    'success': True,
                    'recipient_code': result['data']['recipient_code'],
                    'raw_response': result
                }
            else:
                return {
                    'success': False,
                    'error': result.get('message', 'Recipient creation failed')
                }
                
        except requests.RequestException as e:
            logger.error(f"PayStack recipient creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_banks(self, country: str = 'south-africa') -> Dict[str, Any]:
        """
        Get list of supported banks
        
        Args:
            country: Country code (south-africa, nigeria, ghana, kenya)
        
        Returns:
            List of banks
        """
        url = f"{self.base_url}/bank"
        params = {'country': country}
        
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('status'):
                return {
                    'success': True,
                    'banks': result['data'],
                    'raw_response': result
                }
            else:
                return {
                    'success': False,
                    'error': result.get('message', 'Failed to fetch banks')
                }
                
        except requests.RequestException as e:
            logger.error(f"Failed to fetch PayStack banks: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_test_cards(self) -> Dict[str, Dict[str, str]]:
        """
        Get test card numbers for development
        
        Returns:
            Dictionary of test card scenarios
        """
        return {
            'success': {
                'number': '4084084084084081',
                'cvv': '408',
                'expiry': '12/25',
                'pin': '0000'
            },
            'failed': {
                'number': '4084080000000409',
                'cvv': '000',
                'expiry': '12/25',
                'pin': '0000'
            },
            'timeout': {
                'number': '5060666666666666666',
                'cvv': '123',
                'expiry': '12/25',
                'pin': '1234'
            }
        }