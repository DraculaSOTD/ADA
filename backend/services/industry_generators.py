"""
Industry-Specific Data Generators
Provides realistic data generation patterns for different industries
"""

import random
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from faker import Faker
import uuid
import hashlib

class IndustryGenerators:
    """Industry-specific data generation patterns"""
    
    def __init__(self):
        self.fake = Faker()
        Faker.seed(42)  # For reproducibility in testing
        
        # Common ICD-10 codes for healthcare
        self.icd10_codes = [
            'J06.9', 'I10', 'E11.9', 'K21.9', 'M79.3', 'R50.9', 'J20.9',
            'N39.0', 'K92.2', 'R06.02', 'R51', 'J02.9', 'M25.511', 'F32.9',
            'E78.5', 'B34.9', 'R10.9', 'J45.909', 'L03.90', 'S01.00XA'
        ]
        
        # Insurance providers
        self.insurance_providers = [
            'BlueCross BlueShield', 'Aetna', 'UnitedHealth', 'Kaiser Permanente',
            'Cigna', 'Humana', 'Anthem', 'Centene', 'Molina Healthcare', 'WellCare'
        ]
        
        # Medical departments
        self.departments = [
            'Emergency', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Oncology',
            'Neurology', 'Psychiatry', 'Radiology', 'Surgery', 'Internal Medicine'
        ]
        
        # Merchant categories for finance
        self.merchant_categories = {
            'Retail': ['Walmart', 'Target', 'Best Buy', 'Home Depot', 'Costco'],
            'Food': ['Starbucks', 'McDonalds', 'Chipotle', 'Subway', 'Pizza Hut'],
            'Travel': ['United Airlines', 'Marriott', 'Uber', 'Lyft', 'Hertz'],
            'Entertainment': ['Netflix', 'Spotify', 'AMC Theaters', 'Disney+', 'Hulu'],
            'Services': ['AT&T', 'Verizon', 'Comcast', 'State Farm', 'Geico'],
            'Gas': ['Shell', 'Exxon', 'BP', 'Chevron', 'Mobil'],
            'Groceries': ['Kroger', 'Safeway', 'Whole Foods', 'Trader Joes', 'Albertsons']
        }
        
        # Product categories for retail
        self.product_names = {
            'Electronics': ['Laptop', 'Smartphone', 'Tablet', 'Headphones', 'Smart Watch'],
            'Clothing': ['T-Shirt', 'Jeans', 'Dress', 'Jacket', 'Shoes'],
            'Home': ['Sofa', 'Table', 'Lamp', 'Rug', 'Curtains'],
            'Food': ['Coffee', 'Bread', 'Milk', 'Eggs', 'Chicken'],
            'Sports': ['Basketball', 'Yoga Mat', 'Running Shoes', 'Weights', 'Bike'],
            'Books': ['Fiction Novel', 'Cookbook', 'Biography', 'Textbook', 'Magazine'],
            'Toys': ['LEGO Set', 'Board Game', 'Action Figure', 'Puzzle', 'Doll']
        }
    
    def generate_healthcare_field(self, field_name: str, field_config: Dict[str, Any], num_rows: int) -> List[Any]:
        """Generate healthcare-specific field data"""
        field_type = field_config.get('type', 'string')
        
        if field_name == 'patient_id':
            return [f"P{str(uuid.uuid4())[:8].upper()}" for _ in range(num_rows)]
        
        elif field_name == 'patient_name':
            return [self.fake.name() for _ in range(num_rows)]
        
        elif field_name == 'age':
            # Normal distribution with mean=45, std=20, clipped to 0-100
            ages = np.random.normal(45, 20, num_rows)
            return [max(0, min(100, int(age))) for age in ages]
        
        elif field_name == 'gender':
            # Realistic distribution
            genders = ['Male', 'Female', 'Other']
            weights = [0.49, 0.49, 0.02]
            return np.random.choice(genders, num_rows, p=weights).tolist()
        
        elif field_name == 'diagnosis_code':
            # Use common ICD-10 codes with weighted distribution
            weights = np.array([20, 18, 15, 12, 10] + [5] * 5 + [2] * 10)
            weights = weights / weights.sum()
            return np.random.choice(self.icd10_codes, num_rows, p=weights).tolist()
        
        elif field_name == 'admission_date':
            # Generate dates within last 2 years
            start_date = datetime.now() - timedelta(days=730)
            dates = []
            for _ in range(num_rows):
                random_days = random.randint(0, 730)
                dates.append((start_date + timedelta(days=random_days)).date())
            return dates
        
        elif field_name == 'discharge_date':
            # Should be after admission date (1-14 days typically)
            dates = []
            for _ in range(num_rows):
                base_date = datetime.now() - timedelta(days=random.randint(0, 730))
                stay_length = random.randint(1, 14)
                dates.append((base_date + timedelta(days=stay_length)).date())
            return dates
        
        elif field_name == 'treatment_cost':
            # Log-normal distribution for medical costs
            costs = np.random.lognormal(8.5, 1.5, num_rows)  # Mean ~$5000, high variance
            return [round(min(max(cost, 100), 500000), 2) for cost in costs]
        
        elif field_name == 'insurance_provider':
            # Weighted distribution of insurance providers
            weights = [0.25, 0.20, 0.15, 0.10, 0.08, 0.07, 0.05, 0.04, 0.03, 0.03]
            return np.random.choice(self.insurance_providers, num_rows, p=weights).tolist()
        
        elif field_name == 'doctor_name':
            titles = ['Dr.', 'Dr.', 'Dr.', 'Prof.']  # Most are Dr., some Prof.
            return [f"{random.choice(titles)} {self.fake.name()}" for _ in range(num_rows)]
        
        elif field_name == 'department':
            return [random.choice(self.departments) for _ in range(num_rows)]
        
        else:
            # Fallback to generic generation
            return self._generate_generic_field(field_type, num_rows)
    
    def generate_finance_field(self, field_name: str, field_config: Dict[str, Any], num_rows: int) -> List[Any]:
        """Generate finance-specific field data"""
        field_type = field_config.get('type', 'string')
        
        if field_name == 'transaction_id':
            return [f"TXN{str(uuid.uuid4())[:12].upper()}" for _ in range(num_rows)]
        
        elif field_name == 'account_number':
            # Generate realistic account numbers with check digit
            accounts = []
            for _ in range(num_rows):
                base = ''.join([str(random.randint(0, 9)) for _ in range(9)])
                check_digit = sum(int(d) for d in base) % 10
                accounts.append(f"{base}{check_digit}")
            return accounts
        
        elif field_name == 'customer_name':
            return [self.fake.name() for _ in range(num_rows)]
        
        elif field_name == 'transaction_amount':
            # Bimodal distribution - small daily transactions and large monthly
            amounts = []
            for _ in range(num_rows):
                if random.random() < 0.8:  # 80% small transactions
                    amount = np.random.lognormal(3.0, 1.0)  # ~$20 median
                else:  # 20% large transactions
                    amount = np.random.lognormal(6.0, 0.8)  # ~$400 median
                amounts.append(round(min(amount, 10000), 2))
            return amounts
        
        elif field_name == 'transaction_date' or field_name == 'transaction_datetime':
            # Higher volume on weekdays, business hours
            dates = []
            for _ in range(num_rows):
                base_date = datetime.now() - timedelta(days=random.randint(0, 365))
                # Prefer weekdays
                while base_date.weekday() >= 5 and random.random() < 0.7:
                    base_date = base_date - timedelta(days=random.randint(1, 2))
                # Add time with business hours preference
                hour = np.random.normal(14, 4)  # Peak around 2 PM
                hour = max(0, min(23, int(hour)))
                minute = random.randint(0, 59)
                dates.append(base_date.replace(hour=hour, minute=minute))
            return dates
        
        elif field_name == 'transaction_type':
            types = ['Debit', 'Credit', 'Transfer', 'ATM', 'Online', 'Check']
            weights = [0.35, 0.25, 0.15, 0.10, 0.10, 0.05]
            return np.random.choice(types, num_rows, p=weights).tolist()
        
        elif field_name == 'merchant_name':
            merchants = []
            for _ in range(num_rows):
                category = random.choice(list(self.merchant_categories.keys()))
                merchant = random.choice(self.merchant_categories[category])
                merchants.append(merchant)
            return merchants
        
        elif field_name == 'merchant_category':
            categories = list(self.merchant_categories.keys())
            weights = [0.25, 0.20, 0.15, 0.15, 0.10, 0.10, 0.05]
            return np.random.choice(categories, num_rows, p=weights).tolist()
        
        elif field_name == 'balance_after':
            # Power law distribution for account balances
            balances = np.random.pareto(1.16, num_rows) * 1000  # Pareto for wealth distribution
            return [round(min(balance, 1000000), 2) for balance in balances]
        
        elif field_name == 'location':
            return [f"{self.fake.city()}, {self.fake.state_abbr()}" for _ in range(num_rows)]
        
        else:
            return self._generate_generic_field(field_type, num_rows)
    
    def generate_retail_field(self, field_name: str, field_config: Dict[str, Any], num_rows: int) -> List[Any]:
        """Generate retail-specific field data"""
        field_type = field_config.get('type', 'string')
        
        if field_name == 'order_id':
            return [f"ORD{str(uuid.uuid4())[:10].upper()}" for _ in range(num_rows)]
        
        elif field_name == 'customer_id':
            # Some customers order multiple times (80/20 rule)
            unique_customers = max(1, num_rows // 3)
            customer_ids = [f"CUST{str(i).zfill(8)}" for i in range(unique_customers)]
            # Create power law distribution for customer frequency
            weights = np.random.pareto(0.8, unique_customers)
            weights = weights / weights.sum()
            return np.random.choice(customer_ids, num_rows, p=weights).tolist()
        
        elif field_name == 'customer_name':
            return [self.fake.name() for _ in range(num_rows)]
        
        elif field_name == 'customer_email':
            # Generate unique emails
            emails = set()
            while len(emails) < num_rows:
                emails.add(self.fake.email())
            return list(emails)
        
        elif field_name == 'product_id':
            # SKU format: CAT-XXXX
            skus = []
            for _ in range(num_rows):
                category_prefix = random.choice(['ELC', 'CLO', 'HOM', 'FOD', 'SPT', 'BOK', 'TOY'])
                sku_number = str(random.randint(1000, 9999))
                skus.append(f"{category_prefix}-{sku_number}")
            return skus
        
        elif field_name == 'product_name':
            products = []
            for _ in range(num_rows):
                category = random.choice(list(self.product_names.keys()))
                product = random.choice(self.product_names[category])
                # Add variant
                variant = random.choice(['', ' Pro', ' Plus', ' Basic', ' Premium', ' XL', ' Mini'])
                products.append(f"{product}{variant}")
            return products
        
        elif field_name == 'price':
            # Competitive pricing clusters
            prices = []
            for _ in range(num_rows):
                base_price = np.random.lognormal(3.5, 1.2)  # Median ~$33
                # Round to .99, .95, .00 endings
                ending = random.choice([0.99, 0.95, 0.00])
                price = int(base_price) + ending
                prices.append(round(min(max(price, 0.99), 999.99), 2))
            return prices
        
        elif field_name == 'quantity':
            # Geometric distribution for quantities (most orders are 1-2 items)
            quantities = np.random.geometric(0.6, num_rows)
            return [min(q, 20) for q in quantities]
        
        elif field_name == 'category':
            categories = list(self.product_names.keys())
            # Zipf distribution for product popularity
            weights = 1 / (np.arange(len(categories)) + 1)
            weights = weights / weights.sum()
            return np.random.choice(categories, num_rows, p=weights).tolist()
        
        elif field_name == 'order_date' or field_name == 'order_datetime':
            # Seasonal patterns with holidays
            dates = []
            for _ in range(num_rows):
                base_date = datetime.now() - timedelta(days=random.randint(0, 365))
                # Black Friday / Holiday surge
                if base_date.month in [11, 12] and random.random() < 0.3:
                    base_date = base_date.replace(month=11, day=random.randint(24, 30))
                dates.append(base_date)
            return dates
        
        elif field_name == 'shipping_address':
            return [self.fake.address().replace('\n', ', ') for _ in range(num_rows)]
        
        elif field_name == 'payment_method':
            methods = ['Credit Card', 'Debit Card', 'PayPal', 'Apple Pay', 'Google Pay', 'Cash']
            weights = [0.40, 0.25, 0.15, 0.10, 0.08, 0.02]
            return np.random.choice(methods, num_rows, p=weights).tolist()
        
        else:
            return self._generate_generic_field(field_type, num_rows)
    
    def generate_manufacturing_field(self, field_name: str, field_config: Dict[str, Any], num_rows: int) -> List[Any]:
        """Generate manufacturing-specific field data"""
        field_type = field_config.get('type', 'string')
        
        if 'part' in field_name.lower() or 'component' in field_name.lower():
            # Part numbers with format: PRT-XXXX-YY
            parts = []
            for _ in range(num_rows):
                prefix = 'PRT'
                middle = str(random.randint(1000, 9999))
                suffix = random.choice(['AA', 'AB', 'AC', 'BA', 'BB', 'CA'])
                parts.append(f"{prefix}-{middle}-{suffix}")
            return parts
        
        elif 'quantity' in field_name.lower() or 'stock' in field_name.lower():
            # Inventory levels with safety stock consideration
            quantities = np.random.normal(500, 150, num_rows)
            return [max(0, int(q)) for q in quantities]
        
        elif 'defect' in field_name.lower() or 'quality' in field_name.lower():
            # Quality scores (Six Sigma inspired)
            scores = np.random.normal(99.7, 0.3, num_rows)  # 99.7% quality target
            return [round(min(max(score, 95), 100), 2) for score in scores]
        
        elif 'supplier' in field_name.lower():
            suppliers = [f"Supplier {chr(65 + i)}" for i in range(10)]
            # Some suppliers are preferred
            weights = np.array([30, 25, 20, 10, 5, 3, 3, 2, 1, 1])
            weights = weights / weights.sum()
            return np.random.choice(suppliers, num_rows, p=weights).tolist()
        
        else:
            return self._generate_generic_field(field_type, num_rows)
    
    def generate_insurance_field(self, field_name: str, field_config: Dict[str, Any], num_rows: int) -> List[Any]:
        """Generate insurance-specific field data"""
        field_type = field_config.get('type', 'string')
        
        if 'policy' in field_name.lower():
            # Policy numbers
            return [f"POL{str(uuid.uuid4())[:10].upper()}" for _ in range(num_rows)]
        
        elif 'claim' in field_name.lower() and 'amount' in field_name.lower():
            # Claim amounts - long tail distribution
            claims = np.random.lognormal(7.5, 1.8, num_rows)
            return [round(min(claim, 1000000), 2) for claim in claims]
        
        elif 'premium' in field_name.lower():
            # Monthly premiums
            premiums = np.random.normal(300, 100, num_rows)
            return [round(max(premium, 50), 2) for premium in premiums]
        
        elif 'risk' in field_name.lower() and 'score' in field_name.lower():
            # Risk scores 0-100
            scores = np.random.beta(2, 5, num_rows) * 100  # Skewed toward lower risk
            return [round(score, 1) for score in scores]
        
        else:
            return self._generate_generic_field(field_type, num_rows)
    
    def _generate_generic_field(self, field_type: str, num_rows: int) -> List[Any]:
        """Fallback generic field generation"""
        if field_type == 'string':
            return [self.fake.word() for _ in range(num_rows)]
        elif field_type == 'integer':
            return [random.randint(0, 1000) for _ in range(num_rows)]
        elif field_type == 'float' or field_type == 'currency':
            return [round(random.uniform(0, 1000), 2) for _ in range(num_rows)]
        elif field_type == 'date':
            return [self.fake.date_between(start_date='-1y', end_date='today') for _ in range(num_rows)]
        elif field_type == 'boolean':
            return [random.choice([True, False]) for _ in range(num_rows)]
        elif field_type == 'email':
            return [self.fake.email() for _ in range(num_rows)]
        elif field_type == 'phone':
            return [self.fake.phone_number() for _ in range(num_rows)]
        elif field_type == 'name':
            return [self.fake.name() for _ in range(num_rows)]
        elif field_type == 'address':
            return [self.fake.address() for _ in range(num_rows)]
        else:
            return [None] * num_rows
    
    def get_industry_generator(self, industry: str):
        """Get the appropriate generator method for an industry"""
        generators = {
            'healthcare': self.generate_healthcare_field,
            'finance': self.generate_finance_field,
            'retail': self.generate_retail_field,
            'manufacturing': self.generate_manufacturing_field,
            'insurance': self.generate_insurance_field
        }
        return generators.get(industry.lower(), self._generate_generic_field)