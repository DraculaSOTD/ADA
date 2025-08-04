import sys
import os
import time

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import engine, SessionLocal
from models import Base, User, Model, Notification
from models.schemas import UserCreate
from services.user_service import create_user, get_user_by_email
from dotenv import load_dotenv

load_dotenv()

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Tables dropped.")

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Database tables created.")

db = SessionLocal()

# Create a test user
test_user = get_user_by_email(db, email="testuser@example.com")
if not test_user:
    print("Creating test user...")
    user = UserCreate(
        email="testuser@example.com",
        password="password123",
        full_name="Test User",
        phone_number="1234567890"
    )
    test_user = create_user(db, user)
    print("Test user created.")
else:
    print("Test user already exists.")

# Create some sample models
if not db.query(Model).first():
    print("Creating sample models...")
    models_to_create = [
        Model(user_id=test_user.id, name="Sentiment Analysis", description="A model to predict sentiment.", type="Classification", visibility="private", status="active", performance={"accuracy": 0.92}),
        Model(user_id=test_user.id, name="Sales Forecaster", description="A model to forecast sales.", type="Regression", visibility="private", status="active", performance={"accuracy": 0.88}),
        Model(user_id=test_user.id, name="Image Classifier", description="A model to classify images.", type="Classification", visibility="private", status="in-progress", performance={"accuracy": 0.95}),
        Model(user_id=1, name="Community Sentiment Analyzer", description="Analyzes text for positive, negative, or neutral sentiment.", type="NLP", visibility="community", status="active", performance={"accuracy": 0.85}),
        Model(user_id=1, name="DataPulse NLP Core", description="Official model for natural language processing.", type="NLP", visibility="pretrained", status="active", performance={"accuracy": 0.98}),
    ]
    db.add_all(models_to_create)
    db.commit()
    print("Sample models created.")

# Create some sample notifications
if not db.query(Notification).first():
    print("Creating sample notifications...")
    notifications_to_create = [
        Notification(user_id=test_user.id, title="Model Training Complete", message="Your sentiment analysis model has finished training."),
        Notification(user_id=test_user.id, title="New Login", message="A new login to your account was detected."),
        Notification(user_id=test_user.id, title="API Usage Warning", message="You have used 80% of your API quota."),
    ]
    db.add_all(notifications_to_create)
    db.commit()
    print("Sample notifications created.")

db.close()
