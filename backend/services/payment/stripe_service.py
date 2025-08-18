"""
Stripe Payment Gateway Integration
International payment processor with ZAR support
"""

import stripe
from typing import Dict, Optional, Any, List
from datetime import datetime
import logging
import os
from decimal import Decimal

logger = logging.getLogger(__name__)


class StripeService:
    """
    Stripe payment gateway integration for international payments
    Supports cards, wallets (Apple Pay, Google Pay), and various currencies
    """
    
    def __init__(self, test_mode: bool = True):
        """
        Initialize Stripe service
        
        Args:
            test_mode: Use test keys for development
        """
        self.test_mode = test_mode
        
        if test_mode:
            self.secret_key = os.getenv('STRIPE_TEST_SECRET_KEY', 'sk_test_')
            self.publishable_key = os.getenv('STRIPE_TEST_PUBLISHABLE_KEY', 'pk_test_')
            self.webhook_secret = os.getenv('STRIPE_TEST_WEBHOOK_SECRET')
        else:
            self.secret_key = os.getenv('STRIPE_SECRET_KEY')
            self.publishable_key = os.getenv('STRIPE_PUBLISHABLE_KEY')
            self.webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        
        # Configure Stripe
        stripe.api_key = self.secret_key
        stripe.api_version = '2023-10-16'  # Use specific API version for consistency
        
        self.success_url = os.getenv('STRIPE_SUCCESS_URL', 'https://yourdomain.com/payment/success')
        self.cancel_url = os.getenv('STRIPE_CANCEL_URL', 'https://yourdomain.com/payment/cancel')
    
    def create_checkout_session(
        self,
        amount: Decimal,
        currency: str = 'zar',
        product_name: str = None,
        product_description: str = None,
        customer_email: str = None,
        metadata: Dict = None,
        payment_method_types: List[str] = None,
        mode: str = 'payment',
        success_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session
        
        Args:
            amount: Payment amount
            currency: Currency code (lowercase)
            product_name: Product name
            product_description: Product description
            customer_email: Customer email
            metadata: Transaction metadata
            payment_method_types: Allowed payment methods
            mode: Session mode ('payment', 'setup', 'subscription')
            success_url: Custom success URL
            cancel_url: Custom cancel URL
        
        Returns:
            Checkout session response
        """
        try:
            # Default payment methods if not specified
            if not payment_method_types:
                payment_method_types = ['card']
            
            # Create line items
            line_items = [{
                'price_data': {
                    'currency': currency,
                    'unit_amount': int(amount * 100),  # Convert to smallest unit
                    'product_data': {
                        'name': product_name or 'ADA Platform Tokens',
                        'description': product_description or 'Token purchase for ADA Platform',
                    },
                },
                'quantity': 1,
            }]
            
            # Create checkout session
            session_data = {
                'payment_method_types': payment_method_types,
                'line_items': line_items,
                'mode': mode,
                'success_url': success_url or f"{self.success_url}?session_id={{CHECKOUT_SESSION_ID}}",
                'cancel_url': cancel_url or self.cancel_url,
            }
            
            # Add optional parameters
            if customer_email:
                session_data['customer_email'] = customer_email
            
            if metadata:
                session_data['metadata'] = metadata
            
            # Enable automatic tax calculation for supported regions
            session_data['automatic_tax'] = {'enabled': False}  # Can be enabled if configured
            
            # Create the session
            session = stripe.checkout.Session.create(**session_data)
            
            return {
                'success': True,
                'payment_url': session.url,
                'session_id': session.id,
                'payment_intent': session.payment_intent,
                'raw_response': session
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe checkout session creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = 'zar',
        customer: str = None,
        payment_method: str = None,
        description: str = None,
        metadata: Dict = None,
        confirm: bool = False
    ) -> Dict[str, Any]:
        """
        Create a Payment Intent for custom payment flows
        
        Args:
            amount: Payment amount
            currency: Currency code
            customer: Stripe customer ID
            payment_method: Payment method ID
            description: Payment description
            metadata: Payment metadata
            confirm: Confirm payment immediately
        
        Returns:
            Payment Intent response
        """
        try:
            intent_data = {
                'amount': int(amount * 100),  # Convert to smallest unit
                'currency': currency,
            }
            
            # Add optional parameters
            if customer:
                intent_data['customer'] = customer
            
            if payment_method:
                intent_data['payment_method'] = payment_method
            
            if description:
                intent_data['description'] = description
            
            if metadata:
                intent_data['metadata'] = metadata
            
            if confirm:
                intent_data['confirm'] = True
            
            # Create payment intent
            intent = stripe.PaymentIntent.create(**intent_data)
            
            return {
                'success': True,
                'payment_intent_id': intent.id,
                'client_secret': intent.client_secret,
                'status': intent.status,
                'amount': intent.amount / 100,
                'currency': intent.currency,
                'raw_response': intent
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment intent creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def retrieve_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """
        Retrieve a Payment Intent
        
        Args:
            payment_intent_id: Payment Intent ID
        
        Returns:
            Payment Intent details
        """
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                'success': True,
                'status': intent.status,
                'amount': intent.amount / 100,
                'currency': intent.currency,
                'payment_method': intent.payment_method,
                'customer': intent.customer,
                'metadata': intent.metadata,
                'created': datetime.fromtimestamp(intent.created),
                'raw_response': intent
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve payment intent: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_customer(
        self,
        email: str,
        name: str = None,
        phone: str = None,
        description: str = None,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe customer
        
        Args:
            email: Customer email
            name: Customer name
            phone: Customer phone
            description: Customer description
            metadata: Customer metadata
        
        Returns:
            Customer creation response
        """
        try:
            customer_data = {'email': email}
            
            if name:
                customer_data['name'] = name
            if phone:
                customer_data['phone'] = phone
            if description:
                customer_data['description'] = description
            if metadata:
                customer_data['metadata'] = metadata
            
            customer = stripe.Customer.create(**customer_data)
            
            return {
                'success': True,
                'customer_id': customer.id,
                'raw_response': customer
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_days: int = None,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Create a subscription for a customer
        
        Args:
            customer_id: Stripe customer ID
            price_id: Stripe price ID
            trial_days: Trial period in days
            metadata: Subscription metadata
        
        Returns:
            Subscription creation response
        """
        try:
            subscription_data = {
                'customer': customer_id,
                'items': [{'price': price_id}],
            }
            
            if trial_days:
                subscription_data['trial_period_days'] = trial_days
            
            if metadata:
                subscription_data['metadata'] = metadata
            
            subscription = stripe.Subscription.create(**subscription_data)
            
            return {
                'success': True,
                'subscription_id': subscription.id,
                'status': subscription.status,
                'current_period_start': datetime.fromtimestamp(subscription.current_period_start),
                'current_period_end': datetime.fromtimestamp(subscription.current_period_end),
                'raw_response': subscription
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True
    ) -> Dict[str, Any]:
        """
        Cancel a subscription
        
        Args:
            subscription_id: Subscription ID
            at_period_end: Cancel at current period end vs immediately
        
        Returns:
            Cancellation response
        """
        try:
            if at_period_end:
                # Cancel at period end
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                # Cancel immediately
                subscription = stripe.Subscription.delete(subscription_id)
            
            return {
                'success': True,
                'status': subscription.status,
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'canceled_at': datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None,
                'raw_response': subscription
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription cancellation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_refund(
        self,
        payment_intent_id: str = None,
        charge_id: str = None,
        amount: Decimal = None,
        reason: str = None,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Create a refund
        
        Args:
            payment_intent_id: Payment Intent ID
            charge_id: Charge ID
            amount: Refund amount (None for full refund)
            reason: Refund reason
            metadata: Refund metadata
        
        Returns:
            Refund response
        """
        try:
            refund_data = {}
            
            if payment_intent_id:
                refund_data['payment_intent'] = payment_intent_id
            elif charge_id:
                refund_data['charge'] = charge_id
            else:
                return {
                    'success': False,
                    'error': 'Either payment_intent_id or charge_id is required'
                }
            
            if amount:
                refund_data['amount'] = int(amount * 100)
            
            if reason:
                refund_data['reason'] = reason
            
            if metadata:
                refund_data['metadata'] = metadata
            
            refund = stripe.Refund.create(**refund_data)
            
            return {
                'success': True,
                'refund_id': refund.id,
                'status': refund.status,
                'amount': refund.amount / 100,
                'currency': refund.currency,
                'raw_response': refund
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe refund creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_webhook_signature(
        self,
        payload: str,
        signature: str,
        endpoint_secret: str = None
    ) -> bool:
        """
        Verify Stripe webhook signature
        
        Args:
            payload: Raw webhook payload
            signature: Signature from Stripe headers
            endpoint_secret: Webhook endpoint secret
        
        Returns:
            True if signature is valid
        """
        try:
            endpoint_secret = endpoint_secret or self.webhook_secret
            
            # Verify webhook signature
            stripe.Webhook.construct_event(
                payload,
                signature,
                endpoint_secret
            )
            
            return True
            
        except stripe.error.SignatureVerificationError:
            logger.warning("Invalid Stripe webhook signature")
            return False
        except Exception as e:
            logger.error(f"Stripe webhook verification error: {e}")
            return False
    
    def parse_webhook(self, payload: str, signature: str) -> Dict[str, Any]:
        """
        Parse Stripe webhook event
        
        Args:
            payload: Raw webhook payload
            signature: Signature from Stripe headers
        
        Returns:
            Parsed webhook data
        """
        try:
            # Construct and verify event
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                self.webhook_secret
            )
            
            # Map Stripe events to internal events
            event_map = {
                'payment_intent.succeeded': 'payment_success',
                'payment_intent.payment_failed': 'payment_failed',
                'checkout.session.completed': 'checkout_completed',
                'customer.subscription.created': 'subscription_created',
                'customer.subscription.updated': 'subscription_updated',
                'customer.subscription.deleted': 'subscription_cancelled',
                'invoice.payment_succeeded': 'invoice_paid',
                'invoice.payment_failed': 'invoice_payment_failed',
                'charge.refunded': 'refund_completed',
            }
            
            internal_event = event_map.get(event['type'], event['type'])
            data = event['data']['object']
            
            parsed_data = {
                'event': internal_event,
                'event_id': event['id'],
                'created': datetime.fromtimestamp(event['created']),
            }
            
            # Extract relevant data based on event type
            if 'payment_intent' in event['type']:
                parsed_data.update({
                    'payment_intent_id': data['id'],
                    'amount': data['amount'] / 100,
                    'currency': data['currency'],
                    'status': data['status'],
                    'customer': data.get('customer'),
                    'metadata': data.get('metadata', {}),
                })
            elif 'checkout.session' in event['type']:
                parsed_data.update({
                    'session_id': data['id'],
                    'payment_intent': data.get('payment_intent'),
                    'amount_total': data.get('amount_total', 0) / 100,
                    'currency': data.get('currency'),
                    'customer_email': data.get('customer_email'),
                    'metadata': data.get('metadata', {}),
                })
            elif 'subscription' in event['type']:
                parsed_data.update({
                    'subscription_id': data['id'],
                    'customer': data['customer'],
                    'status': data['status'],
                    'current_period_start': datetime.fromtimestamp(data['current_period_start']),
                    'current_period_end': datetime.fromtimestamp(data['current_period_end']),
                    'metadata': data.get('metadata', {}),
                })
            
            parsed_data['raw_data'] = event
            
            return parsed_data
            
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            return {
                'event': 'error',
                'error': 'Invalid signature'
            }
        except Exception as e:
            logger.error(f"Webhook parsing error: {e}")
            return {
                'event': 'error',
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
                'number': '4242424242424242',
                'exp_month': '12',
                'exp_year': '2025',
                'cvc': '123'
            },
            'success_3d_secure': {
                'number': '4000002500003155',
                'exp_month': '12',
                'exp_year': '2025',
                'cvc': '123'
            },
            'declined': {
                'number': '4000000000000002',
                'exp_month': '12',
                'exp_year': '2025',
                'cvc': '123'
            },
            'insufficient_funds': {
                'number': '4000000000009995',
                'exp_month': '12',
                'exp_year': '2025',
                'cvc': '123'
            },
            'expired_card': {
                'number': '4000000000000069',
                'exp_month': '12',
                'exp_year': '2020',
                'cvc': '123'
            },
            'incorrect_cvc': {
                'number': '4000000000000127',
                'exp_month': '12',
                'exp_year': '2025',
                'cvc': '999'
            }
        }