"""
Payment API Routes
Handles payment processing, webhooks, and transaction management
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from core.database import get_db
from models.payment import Transaction, TokenPackage, Subscription, Invoice
from models.user import User
from services import security
from services.payment import PayFastService, PayStackService, StripeService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/payment",
    tags=["payment"],
)

# Initialize payment services
payfast_service = PayFastService(sandbox=True)  # Use sandbox for development
paystack_service = PayStackService(test_mode=True)
stripe_service = StripeService(test_mode=True)


@router.get("/packages")
async def get_token_packages(db: Session = Depends(get_db)):
    """
    Get all available token packages
    """
    packages = db.query(TokenPackage).filter(
        TokenPackage.is_active == True
    ).order_by(TokenPackage.sort_order).all()
    
    return {
        "packages": [
            {
                "id": str(pkg.id),
                "name": pkg.name,
                "tokens": pkg.tokens,
                "price": float(pkg.price),
                "currency": pkg.currency,
                "discount_percentage": float(pkg.discount_percentage) if pkg.discount_percentage else 0,
                "is_popular": pkg.is_popular,
                "description": pkg.description,
                "features": pkg.features
            }
            for pkg in packages
        ]
    }


@router.post("/create-session")
async def create_payment_session(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Create a payment session for token purchase
    """
    package_id = request.get("package_id")
    gateway = request.get("gateway", "payfast")  # Default to PayFast for SA
    
    # Get package details
    package = db.query(TokenPackage).filter(TokenPackage.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Create transaction record
    transaction = Transaction(
        user_id=current_user.id,
        gateway=gateway,
        amount=package.price,
        vat_amount=float(package.price) * 0.15,  # 15% VAT
        total_amount=float(package.price) * 1.15,
        currency=package.currency,
        status="pending",
        transaction_type="token_purchase",
        package_id=package.id,
        metadata={
            "package_name": package.name,
            "tokens": package.tokens
        },
        ip_address=request.get("client_ip"),
        user_agent=request.get("user_agent")
    )
    db.add(transaction)
    db.commit()
    
    # Initialize payment based on gateway
    if gateway == "payfast":
        payment_data = payfast_service.create_payment(
            amount=transaction.total_amount,
            item_name=f"ADA Platform - {package.name}",
            item_description=f"{package.tokens} tokens for ADA Platform",
            user_email=current_user.email,
            user_name=current_user.full_name,
            custom_str1=str(current_user.id),
            custom_str2=str(package.id),
            custom_str3=str(transaction.id)
        )
        
        return {
            "success": True,
            "payment_url": payment_data["payment_url"],
            "transaction_id": str(transaction.id),
            "gateway": gateway
        }
        
    elif gateway == "paystack":
        payment_data = paystack_service.initialize_transaction(
            amount=transaction.total_amount,
            email=current_user.email,
            currency=package.currency,
            reference=str(transaction.id),
            metadata={
                "user_id": str(current_user.id),
                "package_id": str(package.id),
                "tokens": package.tokens
            }
        )
        
        if payment_data["success"]:
            # Update transaction with gateway reference
            transaction.gateway_reference = payment_data.get("reference")
            db.commit()
            
            return {
                "success": True,
                "payment_url": payment_data["payment_url"],
                "access_code": payment_data.get("access_code"),
                "transaction_id": str(transaction.id),
                "gateway": gateway
            }
        else:
            transaction.status = "failed"
            transaction.error_message = payment_data.get("error")
            db.commit()
            raise HTTPException(status_code=400, detail=payment_data.get("error"))
            
    elif gateway == "stripe":
        payment_data = stripe_service.create_checkout_session(
            amount=transaction.total_amount,
            currency=package.currency.lower(),
            product_name=f"ADA Platform - {package.name}",
            product_description=f"{package.tokens} tokens for ADA Platform",
            customer_email=current_user.email,
            metadata={
                "user_id": str(current_user.id),
                "package_id": str(package.id),
                "transaction_id": str(transaction.id),
                "tokens": str(package.tokens)
            }
        )
        
        if payment_data["success"]:
            # Update transaction with session ID
            transaction.gateway_reference = payment_data["session_id"]
            db.commit()
            
            return {
                "success": True,
                "payment_url": payment_data["payment_url"],
                "session_id": payment_data["session_id"],
                "transaction_id": str(transaction.id),
                "gateway": gateway
            }
        else:
            transaction.status = "failed"
            transaction.error_message = payment_data.get("error")
            db.commit()
            raise HTTPException(status_code=400, detail=payment_data.get("error"))
    
    else:
        raise HTTPException(status_code=400, detail="Invalid payment gateway")


@router.post("/payfast/webhook")
async def handle_payfast_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Handle PayFast ITN (Instant Transaction Notification)
    """
    # Get form data
    form_data = await request.form()
    post_data = dict(form_data)
    
    # Get source IP for validation
    source_ip = request.client.host
    
    # Validate source IP
    if not payfast_service.validate_webhook_source(source_ip):
        logger.warning(f"Invalid PayFast webhook source: {source_ip}")
        raise HTTPException(status_code=403, detail="Invalid source")
    
    # Verify signature
    signature = post_data.get("signature")
    if not payfast_service.verify_webhook_signature(post_data, signature):
        logger.warning("Invalid PayFast webhook signature")
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    # Parse webhook data
    webhook_data = payfast_service.parse_webhook(post_data)
    
    # Get transaction
    transaction_id = webhook_data.get("custom_str3")
    if transaction_id:
        transaction = db.query(Transaction).filter(
            Transaction.id == transaction_id
        ).first()
        
        if transaction:
            # Update transaction status
            transaction.status = webhook_data["status"]
            transaction.gateway_reference = webhook_data.get("pf_payment_id")
            transaction.gateway_response = webhook_data.get("raw_data")
            
            if webhook_data["status"] == "success":
                transaction.completed_at = datetime.utcnow()
                
                # Grant tokens to user
                user = db.query(User).filter(User.id == transaction.user_id).first()
                if user:
                    tokens_to_grant = transaction.metadata.get("tokens", 0)
                    user.token_balance = (user.token_balance or 0) + tokens_to_grant
                    user.lifetime_tokens_purchased = (user.lifetime_tokens_purchased or 0) + tokens_to_grant
                    
                    # Schedule invoice generation in background
                    background_tasks.add_task(
                        generate_invoice,
                        transaction_id=str(transaction.id),
                        db=db
                    )
            
            db.commit()
    
    # PayFast expects HTTP 200 response
    return {"status": "ok"}


@router.post("/paystack/webhook")
async def handle_paystack_webhook(
    request: Request,
    x_paystack_signature: str = Header(None),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Handle PayStack webhook events
    """
    # Get raw body
    body = await request.body()
    
    # Verify signature
    if not paystack_service.verify_webhook_signature(body, x_paystack_signature):
        logger.warning("Invalid PayStack webhook signature")
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    # Parse webhook
    webhook_data = await request.json()
    parsed_data = paystack_service.parse_webhook(webhook_data)
    
    # Handle event
    if parsed_data["event"] == "success":
        reference = parsed_data.get("reference")
        transaction = db.query(Transaction).filter(
            Transaction.id == reference
        ).first()
        
        if transaction:
            transaction.status = "success"
            transaction.gateway_response = parsed_data.get("raw_data")
            transaction.completed_at = datetime.utcnow()
            
            # Grant tokens
            user = db.query(User).filter(User.id == transaction.user_id).first()
            if user:
                tokens_to_grant = transaction.metadata.get("tokens", 0)
                user.token_balance = (user.token_balance or 0) + tokens_to_grant
                user.lifetime_tokens_purchased = (user.lifetime_tokens_purchased or 0) + tokens_to_grant
                
                # Schedule invoice generation
                background_tasks.add_task(
                    generate_invoice,
                    transaction_id=str(transaction.id),
                    db=db
                )
            
            db.commit()
    
    return {"status": "ok"}


@router.post("/stripe/webhook")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhook events
    """
    # Get raw body
    body = await request.body()
    
    # Parse webhook
    parsed_data = stripe_service.parse_webhook(body.decode(), stripe_signature)
    
    if parsed_data.get("event") == "error":
        logger.warning(f"Stripe webhook error: {parsed_data.get('error')}")
        raise HTTPException(status_code=403, detail="Invalid webhook")
    
    # Handle checkout session completed
    if parsed_data["event"] == "checkout_completed":
        session_id = parsed_data.get("session_id")
        transaction = db.query(Transaction).filter(
            Transaction.gateway_reference == session_id
        ).first()
        
        if transaction:
            transaction.status = "success"
            transaction.gateway_response = parsed_data.get("raw_data")
            transaction.completed_at = datetime.utcnow()
            
            # Grant tokens
            user = db.query(User).filter(User.id == transaction.user_id).first()
            if user:
                tokens_to_grant = transaction.metadata.get("tokens", 0)
                user.token_balance = (user.token_balance or 0) + tokens_to_grant
                user.lifetime_tokens_purchased = (user.lifetime_tokens_purchased or 0) + tokens_to_grant
                
                # Schedule invoice generation
                background_tasks.add_task(
                    generate_invoice,
                    transaction_id=str(transaction.id),
                    db=db
                )
            
            db.commit()
    
    return {"status": "ok"}


@router.get("/history")
async def get_payment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user),
    limit: int = 10,
    offset: int = 0
):
    """
    Get user's payment history
    """
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(
        Transaction.created_at.desc()
    ).limit(limit).offset(offset).all()
    
    return {
        "transactions": [
            {
                "id": str(t.id),
                "amount": float(t.total_amount),
                "currency": t.currency,
                "status": t.status,
                "gateway": t.gateway,
                "tokens_granted": t.tokens_granted,
                "created_at": t.created_at.isoformat(),
                "completed_at": t.completed_at.isoformat() if t.completed_at else None
            }
            for t in transactions
        ]
    }


@router.post("/verify/{transaction_id}")
async def verify_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Verify transaction status
    """
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Verify with gateway if pending
    if transaction.status == "pending" and transaction.gateway == "paystack":
        result = paystack_service.verify_transaction(transaction.gateway_reference)
        if result["success"] and result["status"] == "success":
            transaction.status = "success"
            transaction.completed_at = datetime.utcnow()
            
            # Grant tokens if not already granted
            if transaction.tokens_granted == 0:
                tokens_to_grant = transaction.metadata.get("tokens", 0)
                user = db.query(User).filter(User.id == current_user.id).first()
                user.token_balance = (user.token_balance or 0) + tokens_to_grant
                user.lifetime_tokens_purchased = (user.lifetime_tokens_purchased or 0) + tokens_to_grant
                transaction.tokens_granted = tokens_to_grant
            
            db.commit()
    
    return {
        "status": transaction.status,
        "tokens_granted": transaction.tokens_granted,
        "completed_at": transaction.completed_at.isoformat() if transaction.completed_at else None
    }


async def generate_invoice(transaction_id: str, db: Session):
    """
    Background task to generate invoice PDF
    """
    # TODO: Implement invoice generation with reportlab
    logger.info(f"Generating invoice for transaction {transaction_id}")
    pass