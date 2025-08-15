"""
Synthetic Data Generator Service
Advanced data generation with pattern learning and privacy preservation
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import random
import string
import hashlib
from faker import Faker
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.mixture import GaussianMixture
import warnings
warnings.filterwarnings('ignore')


@dataclass
class DataGenerationConfig:
    """Configuration for data generation"""
    rows: int = 1000
    complexity: str = "moderate"  # simple, moderate, complex, very_complex
    
    # Pattern learning
    learn_from_sample: bool = False
    sample_data_path: Optional[str] = None
    preserve_distributions: bool = True
    preserve_correlations: bool = True
    
    # Privacy settings
    apply_differential_privacy: bool = False
    epsilon: float = 1.0  # Privacy budget
    apply_k_anonymity: bool = False
    k_value: int = 5
    
    # Column specifications
    column_specs: Optional[Dict[str, Dict]] = None
    relationships: Optional[List[Dict]] = None
    
    # Output format
    output_format: str = "csv"  # csv, json, parquet
    include_metadata: bool = True


@dataclass
class ColumnSpecification:
    """Specification for a single column"""
    name: str
    data_type: str  # numeric, categorical, datetime, text, email, phone, address
    distribution: Optional[str] = None  # normal, uniform, exponential, custom
    parameters: Dict[str, Any] = field(default_factory=dict)
    constraints: Dict[str, Any] = field(default_factory=dict)
    missing_rate: float = 0.0
    unique: bool = False
    nullable: bool = True


@dataclass
class DataPattern:
    """Learned data patterns"""
    column_distributions: Dict[str, Dict]
    correlations: np.ndarray
    categorical_frequencies: Dict[str, Dict]
    temporal_patterns: Dict[str, Dict]
    missing_patterns: Dict[str, float]
    outlier_patterns: Dict[str, List]
    relationships: List[Dict]


class SyntheticDataGenerator:
    """Advanced synthetic data generation service"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.faker = Faker()
        Faker.seed(42)
        np.random.seed(42)
        random.seed(42)
        
    async def generate_data(self, generation_config: DataGenerationConfig) -> Dict:
        """
        Generate synthetic data based on configuration
        """
        try:
            # Learn patterns if sample provided
            patterns = None
            if generation_config.learn_from_sample and generation_config.sample_data_path:
                print("Learning patterns from sample data...")
                patterns = await self._learn_patterns(generation_config.sample_data_path)
            
            # Generate data based on complexity
            if patterns:
                print("Generating data based on learned patterns...")
                data = await self._generate_from_patterns(patterns, generation_config)
            else:
                print(f"Generating {generation_config.complexity} complexity data...")
                data = await self._generate_by_complexity(generation_config)
            
            # Apply privacy preservation if requested
            if generation_config.apply_differential_privacy:
                print("Applying differential privacy...")
                data = await self._apply_differential_privacy(data, generation_config.epsilon)
            
            if generation_config.apply_k_anonymity:
                print(f"Applying {generation_config.k_value}-anonymity...")
                data = await self._apply_k_anonymity(data, generation_config.k_value)
            
            # Calculate statistics
            statistics = await self._calculate_statistics(data)
            
            # Generate metadata
            metadata = {
                'rows_generated': len(data),
                'columns': list(data.columns),
                'generation_time': datetime.utcnow().isoformat(),
                'complexity': generation_config.complexity,
                'privacy_applied': {
                    'differential_privacy': generation_config.apply_differential_privacy,
                    'k_anonymity': generation_config.apply_k_anonymity
                },
                'statistics': statistics
            }
            
            return {
                'success': True,
                'data': data,
                'metadata': metadata if generation_config.include_metadata else None
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Data generation failed: {str(e)}"
            }
    
    async def _learn_patterns(self, sample_path: str) -> DataPattern:
        """
        Learn patterns from sample data
        """
        # Load sample data
        if sample_path.endswith('.csv'):
            sample_data = pd.read_csv(sample_path)
        elif sample_path.endswith('.json'):
            sample_data = pd.read_json(sample_path)
        else:
            sample_data = pd.read_parquet(sample_path)
        
        patterns = DataPattern(
            column_distributions={},
            correlations=np.array([]),
            categorical_frequencies={},
            temporal_patterns={},
            missing_patterns={},
            outlier_patterns={},
            relationships=[]
        )
        
        # Learn distributions for numeric columns
        numeric_cols = sample_data.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            col_data = sample_data[col].dropna()
            if len(col_data) > 0:
                patterns.column_distributions[col] = {
                    'type': 'numeric',
                    'mean': float(col_data.mean()),
                    'std': float(col_data.std()),
                    'min': float(col_data.min()),
                    'max': float(col_data.max()),
                    'distribution': self._fit_distribution(col_data)
                }
        
        # Learn correlations
        if len(numeric_cols) > 1:
            patterns.correlations = sample_data[numeric_cols].corr().values
        
        # Learn categorical frequencies
        categorical_cols = sample_data.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            value_counts = sample_data[col].value_counts()
            patterns.categorical_frequencies[col] = {
                'values': value_counts.index.tolist(),
                'probabilities': (value_counts / len(sample_data)).tolist()
            }
        
        # Learn missing patterns
        for col in sample_data.columns:
            patterns.missing_patterns[col] = sample_data[col].isna().mean()
        
        # Detect temporal patterns
        datetime_cols = sample_data.select_dtypes(include=['datetime64']).columns
        for col in datetime_cols:
            patterns.temporal_patterns[col] = {
                'min': sample_data[col].min(),
                'max': sample_data[col].max(),
                'frequency': self._detect_temporal_frequency(sample_data[col])
            }
        
        # Detect outliers
        for col in numeric_cols:
            outliers = self._detect_outliers(sample_data[col])
            patterns.outlier_patterns[col] = outliers
        
        # Learn relationships
        patterns.relationships = self._detect_relationships(sample_data)
        
        return patterns
    
    def _fit_distribution(self, data: pd.Series) -> Dict:
        """
        Fit best distribution to data
        """
        distributions = ['norm', 'uniform', 'exponential', 'gamma', 'beta']
        best_distribution = None
        best_params = None
        best_sse = np.inf
        
        for dist_name in distributions:
            try:
                dist = getattr(stats, dist_name)
                params = dist.fit(data)
                
                # Calculate SSE
                arg = params[:-2]
                loc = params[-2]
                scale = params[-1]
                
                # Create theoretical distribution
                theoretical = dist.pdf(data, loc=loc, scale=scale, *arg)
                sse = np.sum((theoretical - data) ** 2)
                
                if sse < best_sse:
                    best_distribution = dist_name
                    best_params = params
                    best_sse = sse
            except:
                continue
        
        return {
            'name': best_distribution,
            'params': best_params if best_params is not None else [],
            'sse': best_sse
        }
    
    def _detect_temporal_frequency(self, datetime_series: pd.Series) -> str:
        """
        Detect temporal frequency in datetime data
        """
        if len(datetime_series) < 2:
            return 'unknown'
        
        # Calculate differences
        sorted_dates = datetime_series.sort_values()
        diffs = sorted_dates.diff().dropna()
        
        # Get mode of differences
        mode_diff = diffs.mode()[0] if len(diffs.mode()) > 0 else diffs.median()
        
        # Determine frequency
        if mode_diff <= pd.Timedelta(seconds=1):
            return 'second'
        elif mode_diff <= pd.Timedelta(minutes=1):
            return 'minute'
        elif mode_diff <= pd.Timedelta(hours=1):
            return 'hour'
        elif mode_diff <= pd.Timedelta(days=1):
            return 'daily'
        elif mode_diff <= pd.Timedelta(days=7):
            return 'weekly'
        elif mode_diff <= pd.Timedelta(days=31):
            return 'monthly'
        else:
            return 'yearly'
    
    def _detect_outliers(self, data: pd.Series, threshold: float = 3) -> List:
        """
        Detect outliers using z-score
        """
        z_scores = np.abs(stats.zscore(data.dropna()))
        outlier_indices = np.where(z_scores > threshold)[0]
        return data.iloc[outlier_indices].tolist()
    
    def _detect_relationships(self, data: pd.DataFrame) -> List[Dict]:
        """
        Detect relationships between columns
        """
        relationships = []
        
        # Check for functional dependencies
        for col1 in data.columns:
            for col2 in data.columns:
                if col1 != col2:
                    # Check if col1 determines col2
                    grouped = data.groupby(col1)[col2].nunique()
                    if grouped.max() == 1:
                        relationships.append({
                            'type': 'functional_dependency',
                            'from': col1,
                            'to': col2
                        })
        
        # Check for strong correlations
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 1:
            corr_matrix = data[numeric_cols].corr()
            for i in range(len(numeric_cols)):
                for j in range(i+1, len(numeric_cols)):
                    if abs(corr_matrix.iloc[i, j]) > 0.7:
                        relationships.append({
                            'type': 'correlation',
                            'columns': [numeric_cols[i], numeric_cols[j]],
                            'strength': corr_matrix.iloc[i, j]
                        })
        
        return relationships
    
    async def _generate_from_patterns(self, patterns: DataPattern, 
                                     config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate data based on learned patterns
        """
        data = {}
        
        # Generate numeric columns
        numeric_cols = [col for col, dist in patterns.column_distributions.items() 
                       if dist['type'] == 'numeric']
        
        if numeric_cols and len(patterns.correlations) > 0:
            # Generate correlated numeric data
            correlated_data = self._generate_correlated_data(
                patterns.correlations,
                config.rows,
                numeric_cols,
                patterns.column_distributions
            )
            for i, col in enumerate(numeric_cols):
                data[col] = correlated_data[:, i]
        else:
            # Generate independent numeric columns
            for col, dist in patterns.column_distributions.items():
                if dist['type'] == 'numeric':
                    data[col] = self._generate_numeric_column(
                        config.rows,
                        dist['distribution'],
                        dist['min'],
                        dist['max']
                    )
        
        # Generate categorical columns
        for col, freq in patterns.categorical_frequencies.items():
            data[col] = np.random.choice(
                freq['values'],
                size=config.rows,
                p=freq['probabilities']
            )
        
        # Apply missing patterns
        df = pd.DataFrame(data)
        for col, missing_rate in patterns.missing_patterns.items():
            if col in df.columns and missing_rate > 0:
                mask = np.random.random(len(df)) < missing_rate
                df.loc[mask, col] = np.nan
        
        # Add outliers
        for col, outliers in patterns.outlier_patterns.items():
            if col in df.columns and outliers:
                n_outliers = int(len(outliers) * config.rows / 1000)  # Proportional
                outlier_indices = np.random.choice(len(df), n_outliers, replace=False)
                df.loc[outlier_indices, col] = np.random.choice(outliers, n_outliers)
        
        return df
    
    def _generate_correlated_data(self, correlation_matrix: np.ndarray,
                                  n_samples: int, column_names: List[str],
                                  distributions: Dict) -> np.ndarray:
        """
        Generate correlated data using copula method
        """
        n_vars = len(column_names)
        
        # Generate standard normal variables
        mean = np.zeros(n_vars)
        samples = np.random.multivariate_normal(mean, correlation_matrix, n_samples)
        
        # Transform to uniform [0,1]
        uniform_samples = stats.norm.cdf(samples)
        
        # Transform to target distributions
        transformed_samples = np.zeros_like(uniform_samples)
        for i, col in enumerate(column_names):
            dist_info = distributions[col]
            
            if dist_info['distribution']['name'] == 'norm':
                transformed_samples[:, i] = stats.norm.ppf(
                    uniform_samples[:, i],
                    loc=dist_info['mean'],
                    scale=dist_info['std']
                )
            elif dist_info['distribution']['name'] == 'uniform':
                transformed_samples[:, i] = stats.uniform.ppf(
                    uniform_samples[:, i],
                    loc=dist_info['min'],
                    scale=dist_info['max'] - dist_info['min']
                )
            else:
                # Default to normal
                transformed_samples[:, i] = stats.norm.ppf(
                    uniform_samples[:, i],
                    loc=dist_info['mean'],
                    scale=dist_info['std']
                )
            
            # Clip to min/max
            transformed_samples[:, i] = np.clip(
                transformed_samples[:, i],
                dist_info['min'],
                dist_info['max']
            )
        
        return transformed_samples
    
    def _generate_numeric_column(self, n_rows: int, distribution: Dict,
                                 min_val: float, max_val: float) -> np.ndarray:
        """
        Generate numeric column based on distribution
        """
        if distribution['name'] == 'norm':
            params = distribution['params']
            data = np.random.normal(params[-2], params[-1], n_rows)
        elif distribution['name'] == 'uniform':
            data = np.random.uniform(min_val, max_val, n_rows)
        elif distribution['name'] == 'exponential':
            params = distribution['params']
            data = np.random.exponential(params[-1], n_rows) + params[-2]
        else:
            # Default to normal
            data = np.random.normal((min_val + max_val) / 2, (max_val - min_val) / 6, n_rows)
        
        return np.clip(data, min_val, max_val)
    
    async def _generate_by_complexity(self, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate data based on complexity level
        """
        if config.complexity == "simple":
            return await self._generate_simple_data(config)
        elif config.complexity == "moderate":
            return await self._generate_moderate_data(config)
        elif config.complexity == "complex":
            return await self._generate_complex_data(config)
        else:  # very_complex
            return await self._generate_very_complex_data(config)
    
    async def _generate_simple_data(self, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate simple dataset with basic columns
        """
        data = {
            'id': range(1, config.rows + 1),
            'name': [self.faker.name() for _ in range(config.rows)],
            'age': np.random.randint(18, 80, config.rows),
            'salary': np.random.normal(50000, 15000, config.rows).round(2),
            'department': np.random.choice(['Sales', 'Engineering', 'Marketing', 'HR'], config.rows),
            'joined_date': [self.faker.date_between(start_date='-5y', end_date='today') 
                          for _ in range(config.rows)]
        }
        
        return pd.DataFrame(data)
    
    async def _generate_moderate_data(self, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate moderate complexity dataset
        """
        # Start with simple data
        df = await self._generate_simple_data(config)
        
        # Add more columns with relationships
        df['email'] = df['name'].apply(lambda x: f"{x.lower().replace(' ', '.')}@company.com")
        df['phone'] = [self.faker.phone_number() for _ in range(config.rows)]
        df['address'] = [self.faker.address().replace('\n', ', ') for _ in range(config.rows)]
        
        # Add correlated columns
        df['experience_years'] = ((df['age'] - 22) * np.random.uniform(0.5, 0.8, config.rows)).clip(0, 40).astype(int)
        df['performance_score'] = np.random.beta(5, 2, config.rows) * 100
        df['bonus'] = df['salary'] * df['performance_score'] / 100 * 0.2
        
        # Add categorical with dependencies
        df['level'] = pd.cut(df['experience_years'], 
                            bins=[0, 2, 5, 10, 40],
                            labels=['Junior', 'Mid', 'Senior', 'Lead'])
        
        return df
    
    async def _generate_complex_data(self, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate complex dataset with multiple patterns
        """
        # Start with moderate data
        df = await self._generate_moderate_data(config)
        
        # Add time series patterns
        dates = pd.date_range(start='2020-01-01', periods=config.rows, freq='D')
        df['transaction_date'] = dates
        df['daily_sales'] = (
            1000 + 
            500 * np.sin(np.arange(config.rows) * 2 * np.pi / 365) +  # Yearly pattern
            200 * np.sin(np.arange(config.rows) * 2 * np.pi / 7) +    # Weekly pattern
            np.random.normal(0, 100, config.rows)                      # Noise
        ).clip(0, None)
        
        # Add nested JSON-like column
        df['metadata'] = [
            {
                'tags': self.faker.words(nb=np.random.randint(1, 5)),
                'scores': {
                    'quality': np.random.uniform(0, 1),
                    'efficiency': np.random.uniform(0, 1),
                    'innovation': np.random.uniform(0, 1)
                }
            } for _ in range(config.rows)
        ]
        
        # Add missing patterns
        # Simulate realistic missing data
        df.loc[df['age'] > 60, 'email'] = np.nan  # Older employees might not have email
        mask = np.random.random(len(df)) < 0.1
        df.loc[mask, 'phone'] = np.nan  # Random 10% missing phones
        
        # Add outliers
        outlier_indices = np.random.choice(config.rows, int(config.rows * 0.05), replace=False)
        df.loc[outlier_indices, 'salary'] *= np.random.uniform(2, 3, len(outlier_indices))
        
        return df
    
    async def _generate_very_complex_data(self, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate very complex dataset with advanced patterns
        """
        # Start with complex data
        df = await self._generate_complex_data(config)
        
        # Add multi-modal distributions
        # Mixture of gaussians for customer segments
        gmm = GaussianMixture(n_components=3, random_state=42)
        segment_data = np.random.randn(config.rows, 2)
        gmm.fit(segment_data)
        
        df['customer_value'] = gmm.sample(config.rows)[0][:, 0] * 1000 + 5000
        df['purchase_frequency'] = gmm.sample(config.rows)[0][:, 1] * 10 + 20
        
        # Add hierarchical relationships
        # Create org structure
        df['manager_id'] = np.nan
        for i in range(1, len(df)):
            if np.random.random() < 0.8:  # 80% have managers
                df.loc[i, 'manager_id'] = np.random.choice(range(max(0, i-10), i))
        
        # Add geospatial data
        df['latitude'] = np.random.uniform(-90, 90, config.rows)
        df['longitude'] = np.random.uniform(-180, 180, config.rows)
        
        # Add text data with patterns
        df['comments'] = [self._generate_text_with_sentiment(np.random.choice(['positive', 'negative', 'neutral']))
                         for _ in range(config.rows)]
        
        # Add image-like data (simulated as arrays)
        df['image_embedding'] = [np.random.randn(128).tolist() for _ in range(config.rows)]
        
        return df
    
    def _generate_text_with_sentiment(self, sentiment: str) -> str:
        """
        Generate text with specific sentiment
        """
        positive_words = ['excellent', 'great', 'wonderful', 'amazing', 'fantastic', 'love']
        negative_words = ['terrible', 'horrible', 'awful', 'hate', 'worst', 'disappointed']
        neutral_words = ['okay', 'fine', 'adequate', 'acceptable', 'moderate', 'average']
        
        if sentiment == 'positive':
            words = positive_words
        elif sentiment == 'negative':
            words = negative_words
        else:
            words = neutral_words
        
        base_text = self.faker.sentence(nb_words=10)
        sentiment_word = np.random.choice(words)
        
        return f"{sentiment_word.capitalize()}! {base_text}"
    
    async def _apply_differential_privacy(self, data: pd.DataFrame, epsilon: float) -> pd.DataFrame:
        """
        Apply differential privacy to data
        """
        df = data.copy()
        
        # Apply Laplace noise to numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            # Calculate sensitivity (max - min)
            sensitivity = df[col].max() - df[col].min()
            
            # Add Laplace noise
            noise = np.random.laplace(0, sensitivity / epsilon, len(df))
            df[col] = df[col] + noise
        
        # For categorical columns, use randomized response
        categorical_cols = df.select_dtypes(include=['object']).columns
        
        for col in categorical_cols:
            # With probability p, keep original value
            # With probability 1-p, replace with random value
            p = np.exp(epsilon) / (np.exp(epsilon) + len(df[col].unique()) - 1)
            mask = np.random.random(len(df)) > p
            
            unique_values = df[col].unique()
            df.loc[mask, col] = np.random.choice(unique_values, sum(mask))
        
        return df
    
    async def _apply_k_anonymity(self, data: pd.DataFrame, k: int) -> pd.DataFrame:
        """
        Apply k-anonymity to data
        """
        df = data.copy()
        
        # Identify quasi-identifiers (columns that could identify someone)
        quasi_identifiers = []
        
        # Check for potential quasi-identifiers
        for col in df.columns:
            if col.lower() in ['age', 'zipcode', 'gender', 'birthdate', 'address']:
                quasi_identifiers.append(col)
        
        if not quasi_identifiers:
            # If no obvious quasi-identifiers, use columns with high cardinality
            for col in df.columns:
                if df[col].nunique() > len(df) * 0.1:  # More than 10% unique values
                    quasi_identifiers.append(col)
        
        # Generalize quasi-identifiers
        for col in quasi_identifiers:
            if col in df.columns:
                if df[col].dtype in [np.int64, np.float64]:
                    # Generalize numeric columns by binning
                    df[col] = pd.cut(df[col], bins=len(df)//k, labels=False)
                else:
                    # Generalize categorical columns by grouping
                    value_counts = df[col].value_counts()
                    small_groups = value_counts[value_counts < k].index
                    df.loc[df[col].isin(small_groups), col] = 'Other'
        
        # Suppress records that are still unique
        if quasi_identifiers:
            grouped = df.groupby(quasi_identifiers).size()
            unique_groups = grouped[grouped < k].index
            
            for group in unique_groups:
                if isinstance(group, tuple):
                    mask = (df[quasi_identifiers] == group).all(axis=1)
                else:
                    mask = df[quasi_identifiers[0]] == group
                df = df[~mask]
        
        return df
    
    async def _calculate_statistics(self, data: pd.DataFrame) -> Dict:
        """
        Calculate comprehensive statistics for generated data
        """
        stats = {
            'shape': data.shape,
            'columns': {}
        }
        
        for col in data.columns:
            col_stats = {
                'dtype': str(data[col].dtype),
                'null_count': int(data[col].isna().sum()),
                'null_percentage': float(data[col].isna().mean() * 100),
                'unique_count': int(data[col].nunique()),
                'unique_percentage': float(data[col].nunique() / len(data) * 100)
            }
            
            # Numeric statistics
            if data[col].dtype in [np.int64, np.float64]:
                col_stats.update({
                    'mean': float(data[col].mean()),
                    'std': float(data[col].std()),
                    'min': float(data[col].min()),
                    'max': float(data[col].max()),
                    'quartiles': {
                        'q25': float(data[col].quantile(0.25)),
                        'q50': float(data[col].quantile(0.50)),
                        'q75': float(data[col].quantile(0.75))
                    }
                })
            
            # Categorical statistics
            elif data[col].dtype == 'object':
                value_counts = data[col].value_counts()
                col_stats.update({
                    'top_values': value_counts.head(5).to_dict(),
                    'mode': value_counts.index[0] if len(value_counts) > 0 else None
                })
            
            stats['columns'][col] = col_stats
        
        return stats
    
    async def generate_specific_dataset(self, dataset_type: str, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate specific types of datasets
        """
        if dataset_type == "ecommerce":
            return await self._generate_ecommerce_data(config)
        elif dataset_type == "healthcare":
            return await self._generate_healthcare_data(config)
        elif dataset_type == "financial":
            return await self._generate_financial_data(config)
        elif dataset_type == "iot":
            return await self._generate_iot_data(config)
        else:
            return await self._generate_by_complexity(config)
    
    async def _generate_ecommerce_data(self, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate e-commerce dataset
        """
        data = {
            'order_id': [f"ORD{str(i).zfill(8)}" for i in range(1, config.rows + 1)],
            'customer_id': [f"CUST{str(np.random.randint(1, config.rows//10)).zfill(6)}" 
                           for _ in range(config.rows)],
            'product_id': [f"PROD{str(np.random.randint(1, 1000)).zfill(5)}" 
                          for _ in range(config.rows)],
            'product_name': [self.faker.catch_phrase() for _ in range(config.rows)],
            'category': np.random.choice(['Electronics', 'Clothing', 'Books', 'Home', 'Sports'], config.rows),
            'price': np.random.lognormal(3, 1, config.rows).round(2),
            'quantity': np.random.geometric(0.3, config.rows),
            'order_date': [self.faker.date_time_between(start_date='-1y', end_date='now') 
                         for _ in range(config.rows)],
            'shipping_address': [self.faker.address().replace('\n', ', ') for _ in range(config.rows)],
            'payment_method': np.random.choice(['Credit Card', 'PayPal', 'Debit Card', 'Bitcoin'], 
                                             config.rows, p=[0.5, 0.3, 0.15, 0.05]),
            'status': np.random.choice(['Pending', 'Shipped', 'Delivered', 'Cancelled'], 
                                      config.rows, p=[0.1, 0.2, 0.65, 0.05])
        }
        
        df = pd.DataFrame(data)
        df['total_amount'] = df['price'] * df['quantity']
        
        return df
    
    async def _generate_healthcare_data(self, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate healthcare dataset
        """
        data = {
            'patient_id': [f"PAT{str(i).zfill(6)}" for i in range(1, config.rows + 1)],
            'age': np.random.beta(5, 2, config.rows) * 100,
            'gender': np.random.choice(['M', 'F', 'Other'], config.rows, p=[0.48, 0.50, 0.02]),
            'blood_type': np.random.choice(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], config.rows),
            'admission_date': [self.faker.date_between(start_date='-2y', end_date='today') 
                             for _ in range(config.rows)],
            'diagnosis': np.random.choice(['Diabetes', 'Hypertension', 'Cardiac', 'Respiratory', 'Other'], 
                                        config.rows),
            'treatment': [self.faker.sentence(nb_words=5) for _ in range(config.rows)],
            'blood_pressure_sys': np.random.normal(120, 20, config.rows).clip(80, 200),
            'blood_pressure_dia': np.random.normal(80, 10, config.rows).clip(50, 120),
            'heart_rate': np.random.normal(72, 12, config.rows).clip(40, 150),
            'temperature': np.random.normal(98.6, 1, config.rows).clip(95, 105),
            'length_of_stay': np.random.exponential(5, config.rows).clip(1, 30)
        }
        
        return pd.DataFrame(data)
    
    async def _generate_financial_data(self, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate financial dataset
        """
        data = {
            'transaction_id': [str(uuid.uuid4()) for _ in range(config.rows)],
            'account_id': [f"ACC{str(np.random.randint(1, config.rows//20)).zfill(8)}" 
                          for _ in range(config.rows)],
            'transaction_date': [self.faker.date_time_between(start_date='-1y', end_date='now') 
                               for _ in range(config.rows)],
            'transaction_type': np.random.choice(['Deposit', 'Withdrawal', 'Transfer', 'Payment'], 
                                               config.rows, p=[0.3, 0.3, 0.2, 0.2]),
            'amount': np.random.lognormal(5, 2, config.rows).round(2),
            'balance_after': np.random.lognormal(8, 1, config.rows).round(2),
            'merchant': [self.faker.company() if np.random.random() > 0.3 else None 
                        for _ in range(config.rows)],
            'category': np.random.choice(['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Other'], 
                                       config.rows),
            'fraud_flag': np.random.choice([0, 1], config.rows, p=[0.995, 0.005])
        }
        
        return pd.DataFrame(data)
    
    async def _generate_iot_data(self, config: DataGenerationConfig) -> pd.DataFrame:
        """
        Generate IoT sensor dataset
        """
        # Generate time series data
        timestamps = pd.date_range(start='2024-01-01', periods=config.rows, freq='1min')
        
        data = {
            'timestamp': timestamps,
            'device_id': [f"DEV{str(np.random.randint(1, 100)).zfill(4)}" for _ in range(config.rows)],
            'sensor_type': np.random.choice(['Temperature', 'Humidity', 'Pressure', 'Motion'], config.rows),
            'value': np.random.normal(25, 5, config.rows),
            'unit': np.random.choice(['C', '%', 'kPa', 'boolean'], config.rows),
            'location': [f"Zone-{np.random.randint(1, 10)}" for _ in range(config.rows)],
            'battery_level': np.random.uniform(0, 100, config.rows),
            'signal_strength': np.random.uniform(-100, -30, config.rows),
            'anomaly_score': np.random.beta(2, 8, config.rows)
        }
        
        df = pd.DataFrame(data)
        
        # Add seasonal patterns to sensor values
        df['value'] = df['value'] + 10 * np.sin(np.arange(config.rows) * 2 * np.pi / 1440)  # Daily pattern
        
        return df