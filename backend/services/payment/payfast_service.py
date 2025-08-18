"""
PayFast Payment Gateway Integration
South African payment processor with FNB integration
"""

import hashlib
import urllib.parse
import hmac
import requests
from typing import Dict, Optional, Any
from datetime import datetime
import logging
import os
from decimal import Decimal

logger = logging.getLogger(__name__)


class PayFastService:
    """
    PayFast payment gateway integration for South African payments
    Supports cards, EFT, SnapScan, Zapper, and other local payment methods
    """
    
    def __init__(self, sandbox: bool = True):
        """
        Initialize PayFast service
        
        Args:
            sandbox: Use sandbox environment for testing
        """
        self.sandbox = sandbox
        
        if sandbox:
            # Sandbox credentials for testing
            self.merchant_id = os.getenv('PAYFAST_SANDBOX_MERCHANT_ID', '10000100')
            self.merchant_key = os.getenv('PAYFAST_SANDBOX_MERCHANT_KEY', '46f0cd694581a')
            self.passphrase = os.getenv('PAYFAST_SANDBOX_PASSPHRASE', 'jt7NOE43FZPn')
            self.base_url = 'https://sandbox.payfast.co.za/eng/process'
            self.api_url = 'https://api.sandbox.payfast.co.za'
        else:
            # Production credentials
            self.merchant_id = os.getenv('PAYFAST_MERCHANT_ID')
            self.merchant_key = os.getenv('PAYFAST_MERCHANT_KEY')
            self.passphrase = os.getenv('PAYFAST_PASSPHRASE')
            self.base_url = 'https://www.payfast.co.za/eng/process'
            self.api_url = 'https://api.payfast.co.za'
        
        self.return_url = os.getenv('PAYFAST_RETURN_URL', 'https://yourdomain.com/payment/success')
        self.cancel_url = os.getenv('PAYFAST_CANCEL_URL', 'https://yourdomain.com/payment/cancel')
        self.notify_url = os.getenv('PAYFAST_NOTIFY_URL', 'https://yourdomain.com/api/payment/payfast/webhook')
    
    def create_payment(
        self,
        amount: Decimal,
        item_name: str,
        item_description: str = None,
        user_email: str = None,
        user_name: str = None,
        custom_str1: str = None,  # Can be used for user_id
        custom_str2: str = None,  # Can be used for package_id
        custom_str3: str = None,  # Can be used for transaction_id
        payment_method: str = None
    ) -> Dict[str, Any]:
        """
        Create a PayFast payment request
        
        Args:
            amount: Payment amount in ZAR
            item_name: Name of the item being purchased
            item_description: Description of the item
            user_email: Customer email address
            user_name: Customer name
            custom_str1-3: Custom fields for tracking
            payment_method: Specific payment method (eft, cc, sc, etc.)
        
        Returns:
            Dictionary containing payment data and redirect URL
        """
        # Prepare payment data
        payment_data = {
            'merchant_id': self.merchant_id,
            'merchant_key': self.merchant_key,
            'return_url': self.return_url,
            'cancel_url': self.cancel_url,
            'notify_url': self.notify_url,
            'amount': f"{float(amount):.2f}",
            'item_name': item_name[:100],  # Max 100 characters
        }
        
        # Add optional fields
        if item_description:
            payment_data['item_description'] = item_description[:255]
        
        if user_email:
            payment_data['email_address'] = user_email
        
        if user_name:
            name_parts = user_name.split(' ', 1)
            payment_data['name_first'] = name_parts[0][:100]
            if len(name_parts) > 1:
                payment_data['name_last'] = name_parts[1][:100]
        
        # Add custom fields for tracking
        if custom_str1:
            payment_data['custom_str1'] = custom_str1[:255]
        if custom_str2:
            payment_data['custom_str2'] = custom_str2[:255]
        if custom_str3:
            payment_data['custom_str3'] = custom_str3[:255]
        
        # Add payment method if specified
        if payment_method:
            payment_data['payment_method'] = payment_method
        
        # Add unique payment ID
        payment_data['m_payment_id'] = f"ADA_{datetime.now().strftime('%Y%m%d%H%M%S')}_{custom_str3[:8] if custom_str3 else ''}"
        
        # Generate signature
        signature = self.generate_signature(payment_data)
        payment_data['signature'] = signature
        
        # Build redirect URL
        redirect_url = f"{self.base_url}?{urllib.parse.urlencode(payment_data)}"
        
        return {
            'success': True,
            'payment_url': redirect_url,
            'payment_data': payment_data,
            'payment_id': payment_data['m_payment_id']
        }
    
    def generate_signature(self, data: Dict[str, str]) -> str:
        """
        Generate MD5 signature for PayFast request
        
        Args:
            data: Payment data dictionary
        
        Returns:
            MD5 signature string
        """
        # Fields to exclude from signature
        exclude_fields = ['signature', 'submit']
        
        # Create parameter string
        param_list = []
        for key in sorted(data.keys()):
            if key not in exclude_fields and data[key]:
                param_list.append(f"{key}={urllib.parse.quote_plus(str(data[key]))}")
        
        param_string = '&'.join(param_list)
        
        # Add passphrase if configured
        if self.passphrase:
            param_string += f"&passphrase={urllib.parse.quote_plus(self.passphrase)}"
        
        # Generate MD5 hash
        signature = hashlib.md5(param_string.encode()).hexdigest()
        
        logger.debug(f"Generated signature: {signature} for params: {param_string[:100]}...")
        
        return signature
    
    def verify_webhook_signature(self, post_data: Dict[str, str], signature: str) -> bool:
        """
        Verify PayFast webhook signature (ITN - Instant Transaction Notification)
        
        Args:
            post_data: POST data from PayFast webhook
            signature: Signature from PayFast
        
        Returns:
            True if signature is valid
        """
        # Generate signature from post data
        generated_signature = self.generate_signature(post_data)
        
        # Compare signatures
        is_valid = generated_signature == signature
        
        if not is_valid:
            logger.warning(f"Invalid PayFast signature. Expected: {generated_signature}, Got: {signature}")
        
        return is_valid
    
    def validate_webhook_source(self, source_ip: str) -> bool:
        """
        Validate that webhook comes from PayFast servers
        
        Args:
            source_ip: IP address of the webhook source
        
        Returns:
            True if IP is valid PayFast server
        """
        # PayFast server IPs
        valid_hosts = [
            'www.payfast.co.za',
            'sandbox.payfast.co.za',
            'w1w.payfast.co.za',
            'w2w.payfast.co.za',
        ]
        
        # Additional valid IPs (PayFast documentation)
        valid_ips = [
            '41.74.179.194',
            '41.74.179.195',
            '41.74.179.196',
            '41.74.179.197',
            '41.74.179.200',
            '41.74.179.201',
            '41.74.179.203',
            '41.74.179.204',
            '41.74.179.210',
            '41.74.179.211',
            '41.74.179.212',
            '41.74.179.217',
            '41.74.179.218',
            '197.97.145.144',
            '197.97.145.145',
            '197.97.145.149',
            '197.97.145.150',
            '197.97.145.151',
            '197.97.145.152',
            '197.97.145.153',
            '197.97.145.154',
            '197.97.145.155',
            '197.97.145.156',
        ]
        
        # Check if IP is in valid list
        if source_ip in valid_ips:
            return True
        
        # Resolve hostnames and check
        import socket
        for host in valid_hosts:
            try:
                resolved_ips = socket.gethostbyname_ex(host)[2]
                if source_ip in resolved_ips:
                    return True
            except socket.error:
                continue
        
        logger.warning(f"Invalid PayFast webhook source IP: {source_ip}")
        return False
    
    def parse_webhook(self, post_data: Dict[str, str]) -> Dict[str, Any]:
        """
        Parse PayFast webhook (ITN) data
        
        Args:
            post_data: POST data from PayFast webhook
        
        Returns:
            Parsed webhook data
        """
        # Map PayFast payment status to internal status
        status_map = {
            'COMPLETE': 'success',
            'FAILED': 'failed',
            'PENDING': 'pending',
            'CANCELLED': 'cancelled'
        }
        
        payment_status = post_data.get('payment_status', '')
        internal_status = status_map.get(payment_status, 'failed')
        
        return {
            'status': internal_status,
            'payment_id': post_data.get('m_payment_id'),
            'pf_payment_id': post_data.get('pf_payment_id'),
            'amount': Decimal(post_data.get('amount_gross', '0')),
            'fee': Decimal(post_data.get('amount_fee', '0')),
            'net_amount': Decimal(post_data.get('amount_net', '0')),
            'item_name': post_data.get('item_name'),
            'item_description': post_data.get('item_description'),
            'email': post_data.get('email_address'),
            'name': f"{post_data.get('name_first', '')} {post_data.get('name_last', '')}".strip(),
            'custom_str1': post_data.get('custom_str1'),  # user_id
            'custom_str2': post_data.get('custom_str2'),  # package_id
            'custom_str3': post_data.get('custom_str3'),  # transaction_id
            'payment_status': payment_status,
            'merchant_payment_id': post_data.get('merchant_payment_id'),
            'raw_data': post_data
        }
    
    def create_subscription(
        self,
        amount: Decimal,
        item_name: str,
        frequency: int = 3,  # 3 = Monthly, 4 = Quarterly, 6 = Annually
        cycles: int = 0,  # 0 = Indefinite
        user_email: str = None,
        user_name: str = None,
        custom_str1: str = None
    ) -> Dict[str, Any]:
        """
        Create a recurring subscription with PayFast
        
        Args:
            amount: Recurring amount in ZAR
            item_name: Subscription name
            frequency: Billing frequency (3=Monthly, 4=Quarterly, 6=Annually)
            cycles: Number of cycles (0=Indefinite)
            user_email: Customer email
            user_name: Customer name
            custom_str1: Custom field (e.g., user_id)
        
        Returns:
            Subscription creation response
        """
        payment_data = {
            'merchant_id': self.merchant_id,
            'merchant_key': self.merchant_key,
            'return_url': self.return_url,
            'cancel_url': self.cancel_url,
            'notify_url': self.notify_url,
            'subscription_type': '1',  # 1 = Subscription
            'billing_date': datetime.now().strftime('%Y-%m-%d'),
            'recurring_amount': f"{float(amount):.2f}",
            'frequency': str(frequency),
            'cycles': str(cycles),
            'item_name': item_name[:100],
        }
        
        if user_email:
            payment_data['email_address'] = user_email
        
        if user_name:
            name_parts = user_name.split(' ', 1)
            payment_data['name_first'] = name_parts[0][:100]
            if len(name_parts) > 1:
                payment_data['name_last'] = name_parts[1][:100]
        
        if custom_str1:
            payment_data['custom_str1'] = custom_str1
        
        # Generate signature
        signature = self.generate_signature(payment_data)
        payment_data['signature'] = signature
        
        # Build redirect URL
        redirect_url = f"{self.base_url}?{urllib.parse.urlencode(payment_data)}"
        
        return {
            'success': True,
            'subscription_url': redirect_url,
            'subscription_data': payment_data
        }
    
    def cancel_subscription(self, token: str) -> Dict[str, Any]:
        """
        Cancel a PayFast subscription
        
        Args:
            token: Subscription token from PayFast
        
        Returns:
            Cancellation response
        """
        # PayFast API endpoint for subscription cancellation
        url = f"{self.api_url}/subscriptions/{token}/cancel"
        
        headers = {
            'merchant-id': self.merchant_id,
            'version': 'v1',
            'timestamp': datetime.now().isoformat(),
        }
        
        # Generate API signature
        signature = self._generate_api_signature(headers)
        headers['signature'] = signature
        
        try:
            response = requests.put(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            return {
                'success': True,
                'message': 'Subscription cancelled successfully'
            }
        except requests.RequestException as e:
            logger.error(f"Failed to cancel PayFast subscription: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_api_signature(self, headers: Dict[str, str]) -> str:
        """
        Generate signature for PayFast API requests
        
        Args:
            headers: Request headers
        
        Returns:
            API signature
        """
        # Create signature string from headers
        sig_items = []
        for key in sorted(headers.keys()):
            if key != 'signature':
                sig_items.append(f"{key}={headers[key]}")
        
        sig_string = '\n'.join(sig_items)
        
        # Generate HMAC-SHA256 signature
        signature = hmac.new(
            self.passphrase.encode(),
            sig_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    def get_test_cards(self) -> Dict[str, str]:
        """
        Get test card numbers for sandbox testing
        
        Returns:
            Dictionary of test card scenarios
        """
        return {
            'success': '4000 0000 0000 0000',
            'declined': '4000 0000 0000 0002',
            'insufficient_funds': '4000 0000 0000 9995',
            'expired_card': '4000 0000 0000 0069',
            'invalid_cvv': '4000 0000 0000 0127',
            'timeout': '4000 0000 0000 9999'
        }