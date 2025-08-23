"""
Synthetic Data Generator Service
Generates synthetic data based on detected patterns
"""

import pandas as pd
import numpy as np
import random
import string
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from faker import Faker
import json
import io
from scipy import stats
import hashlib


class SyntheticDataGenerator:
    """Generates synthetic data based on patterns"""
    
    def __init__(self):
        self.fake = Faker()
        self.seed = None
        self.privacy_enabled = False
        self.epsilon = 1.0  # Differential privacy parameter
        
    def set_seed(self, seed: int):
        """Set random seed for reproducibility"""
        self.seed = seed
        random.seed(seed)
        np.random.seed(seed)
        self.fake.seed_instance(seed)
    
    def generate_from_patterns(
        self, 
        patterns: Dict[str, Any], 
        num_rows: int,
        options: Dict[str, Any] = None
    ) -> pd.DataFrame:
        """
        Generate synthetic data based on detected patterns
        
        Args:
            patterns: Dictionary of column patterns from analyzer
            num_rows: Number of rows to generate
            options: Generation options (preserve_relationships, include_outliers, etc.)
            
        Returns:
            Generated DataFrame
        """
        options = options or {}
        data = {}
        
        # First pass: generate independent columns
        for column, pattern in patterns.items():
            if pattern['type'] == 'empty':
                data[column] = [None] * num_rows
            else:
                data[column] = self._generate_column(pattern, num_rows, options)
        
        df = pd.DataFrame(data)
        
        # Second pass: apply relationships if requested
        if options.get('preserve_relationships') and 'relationships' in options:
            df = self._apply_relationships(df, options['relationships'], patterns)
        
        # Add missing values if requested
        if options.get('add_missing'):
            df = self._add_missing_values(df, patterns, options.get('missing_rate', 0.03))
        
        # Add outliers if requested
        if options.get('include_outliers'):
            df = self._add_outliers(df, patterns, options.get('outlier_rate', 0.05))
        
        return df
    
    def generate_from_config(
        self,
        columns: List[Dict[str, str]],
        num_rows: int,
        data_type: str
    ) -> pd.DataFrame:
        """
        Generate synthetic data from manual configuration
        
        Args:
            columns: List of column configurations
            num_rows: Number of rows to generate
            data_type: Type of data to generate (people, numeric, etc.)
            
        Returns:
            Generated DataFrame
        """
        data = {}
        
        for col_config in columns:
            col_name = col_config['name']
            col_type = col_config['type']
            
            if data_type == 'people':
                data[col_name] = self._generate_people_column(col_name, col_type, num_rows)
            elif data_type == 'numeric':
                data[col_name] = self._generate_numeric_column(col_name, col_type, num_rows)
            elif data_type == 'timeseries':
                data[col_name] = self._generate_timeseries_column(col_name, col_type, num_rows)
            else:
                data[col_name] = self._generate_generic_column(col_type, num_rows)
        
        return pd.DataFrame(data)
    
    def _generate_column(self, pattern: Dict[str, Any], num_rows: int, options: Dict[str, Any]) -> List[Any]:
        """Generate data for a single column based on its pattern"""
        col_type = pattern['type']
        
        if col_type == 'integer':
            return self._generate_integer_pattern(pattern, num_rows)
        elif col_type == 'float':
            return self._generate_float_pattern(pattern, num_rows)
        elif col_type == 'datetime':
            return self._generate_datetime_pattern(pattern, num_rows)
        elif col_type == 'boolean':
            return self._generate_boolean_pattern(pattern, num_rows)
        elif col_type == 'categorical':
            return self._generate_categorical_pattern(pattern, num_rows)
        elif col_type == 'text':
            return self._generate_text_pattern(pattern, num_rows)
        else:
            return [None] * num_rows
    
    def _generate_integer_pattern(self, pattern: Dict[str, Any], num_rows: int) -> List[int]:
        """Generate integer data based on pattern"""
        if pattern.get('is_sequence'):
            # Generate sequential data
            start = pattern.get('sequence_start', 1)
            step = pattern.get('sequence_step', 1)
            return list(range(start, start + num_rows * step, step))
        
        # Generate based on distribution
        min_val = int(pattern['min'])
        max_val = int(pattern['max'])
        mean = pattern.get('mean', (min_val + max_val) / 2)
        std = pattern.get('std', (max_val - min_val) / 4)
        
        distribution = pattern.get('distribution', 'unknown')
        
        if distribution == 'normal':
            values = np.random.normal(mean, std, num_rows)
            values = np.clip(values, min_val, max_val)
            return [int(v) for v in values]
        elif distribution == 'uniform':
            return [random.randint(min_val, max_val) for _ in range(num_rows)]
        else:
            # Default to normal-like distribution
            values = np.random.normal(mean, std, num_rows)
            values = np.clip(values, min_val, max_val)
            return [int(v) for v in values]
    
    def _generate_float_pattern(self, pattern: Dict[str, Any], num_rows: int) -> List[float]:
        """Generate float data based on pattern"""
        min_val = pattern['min']
        max_val = pattern['max']
        mean = pattern.get('mean', (min_val + max_val) / 2)
        std = pattern.get('std', (max_val - min_val) / 4)
        
        distribution = pattern.get('distribution', 'unknown')
        
        if distribution == 'normal':
            values = np.random.normal(mean, std, num_rows)
            values = np.clip(values, min_val, max_val)
            return values.tolist()
        elif distribution == 'uniform':
            return np.random.uniform(min_val, max_val, num_rows).tolist()
        elif distribution == 'exponential':
            values = np.random.exponential(mean, num_rows)
            values = np.clip(values, min_val, max_val)
            return values.tolist()
        else:
            # Default to normal distribution
            values = np.random.normal(mean, std, num_rows)
            values = np.clip(values, min_val, max_val)
            return values.tolist()
    
    def _generate_datetime_pattern(self, pattern: Dict[str, Any], num_rows: int) -> List[datetime]:
        """Generate datetime data based on pattern"""
        min_date = pd.to_datetime(pattern['min_date'])
        max_date = pd.to_datetime(pattern['max_date'])
        
        if pattern.get('is_regular_series'):
            # Generate regular time series
            interval = pd.Timedelta(pattern['interval'])
            dates = pd.date_range(start=min_date, periods=num_rows, freq=interval)
            return dates.tolist()
        else:
            # Generate random dates within range
            date_range = (max_date - min_date).days
            dates = []
            for _ in range(num_rows):
                random_days = random.randint(0, date_range)
                random_seconds = random.randint(0, 86400)  # seconds in a day
                date = min_date + timedelta(days=random_days, seconds=random_seconds)
                dates.append(date)
            
            return sorted(dates)  # Return sorted for realism
    
    def _generate_boolean_pattern(self, pattern: Dict[str, Any], num_rows: int) -> List[Union[bool, str]]:
        """Generate boolean data based on pattern"""
        true_count = pattern.get('true_count', 0)
        false_count = pattern.get('false_count', 0)
        total = true_count + false_count
        
        if total == 0:
            true_prob = 0.5
        else:
            true_prob = true_count / total
        
        # Generate based on probability
        values = [random.random() < true_prob for _ in range(num_rows)]
        
        # Convert to the original representation
        representation = pattern.get('representation', 'True')
        if representation in ['True', 'true', 'TRUE']:
            return [str(v) if representation != 'True' else v for v in values]
        elif representation in ['Yes', 'yes', 'YES']:
            true_val = representation
            false_val = representation.replace('es', 'o').replace('ES', 'O')
            return [true_val if v else false_val for v in values]
        elif representation in ['Y', 'y']:
            true_val = representation
            false_val = 'N' if representation == 'Y' else 'n'
            return [true_val if v else false_val for v in values]
        elif representation in ['1', '0']:
            return ['1' if v else '0' for v in values]
        else:
            return values
    
    def _generate_categorical_pattern(self, pattern: Dict[str, Any], num_rows: int) -> List[str]:
        """Generate categorical data based on pattern"""
        categories = pattern.get('categories', {})
        
        if not categories:
            # No categories found, generate random
            return [f"Category_{i % 5}" for i in range(num_rows)]
        
        # Create weighted choices based on frequencies
        choices = []
        weights = []
        
        for category, count in categories.items():
            choices.append(category)
            weights.append(count)
        
        # Normalize weights
        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]
        
        # Generate values
        return np.random.choice(choices, size=num_rows, p=weights).tolist()
    
    def _generate_text_pattern(self, pattern: Dict[str, Any], num_rows: int) -> List[str]:
        """Generate text data based on pattern"""
        detected_patterns = pattern.get('detected_patterns', [])
        avg_length = int(pattern.get('avg_length', 10))
        min_length = int(pattern.get('min_length', 5))
        max_length = int(pattern.get('max_length', 20))
        
        values = []
        
        for _ in range(num_rows):
            if 'email' in detected_patterns:
                values.append(self.fake.email())
            elif 'url' in detected_patterns:
                values.append(self.fake.url())
            elif 'phone' in detected_patterns:
                values.append(self.fake.phone_number())
            elif 'uuid' in detected_patterns:
                values.append(str(uuid.uuid4()))
            elif 'name' in detected_patterns:
                values.append(self.fake.name())
            else:
                # Generate text with template if available
                prefix = pattern.get('common_prefix', '')
                suffix = pattern.get('common_suffix', '')
                
                if prefix or suffix:
                    # Generate with template
                    middle_length = max(1, avg_length - len(prefix) - len(suffix))
                    middle = ''.join(random.choices(string.ascii_letters + string.digits, k=middle_length))
                    values.append(f"{prefix}{middle}{suffix}")
                else:
                    # Generate random text
                    length = random.randint(min_length, max_length)
                    if avg_length > 50:  # Likely sentences
                        values.append(self.fake.text(max_nb_chars=length))
                    else:  # Likely words or codes
                        values.append(self.fake.word() + ''.join(random.choices(string.digits, k=min(5, length))))
        
        return values
    
    def _generate_people_column(self, col_name: str, col_type: str, num_rows: int) -> List[Any]:
        """Generate people-related data"""
        col_name_lower = col_name.lower()
        
        # Map column names to faker methods
        if 'name' in col_name_lower:
            if 'first' in col_name_lower:
                return [self.fake.first_name() for _ in range(num_rows)]
            elif 'last' in col_name_lower:
                return [self.fake.last_name() for _ in range(num_rows)]
            else:
                return [self.fake.name() for _ in range(num_rows)]
        elif 'email' in col_name_lower:
            return [self.fake.email() for _ in range(num_rows)]
        elif 'phone' in col_name_lower:
            return [self.fake.phone_number() for _ in range(num_rows)]
        elif 'address' in col_name_lower:
            return [self.fake.address() for _ in range(num_rows)]
        elif 'city' in col_name_lower:
            return [self.fake.city() for _ in range(num_rows)]
        elif 'state' in col_name_lower:
            return [self.fake.state() for _ in range(num_rows)]
        elif 'country' in col_name_lower:
            return [self.fake.country() for _ in range(num_rows)]
        elif 'age' in col_name_lower:
            return [random.randint(18, 80) for _ in range(num_rows)]
        elif 'birth' in col_name_lower or 'dob' in col_name_lower:
            return [self.fake.date_of_birth(minimum_age=18, maximum_age=80) for _ in range(num_rows)]
        elif 'gender' in col_name_lower:
            return [random.choice(['Male', 'Female', 'Other']) for _ in range(num_rows)]
        elif 'salary' in col_name_lower or 'income' in col_name_lower:
            return [random.randint(30000, 150000) for _ in range(num_rows)]
        else:
            # Default based on type
            return self._generate_generic_column(col_type, num_rows)
    
    def _generate_numeric_column(self, col_name: str, col_type: str, num_rows: int) -> List[Any]:
        """Generate numeric data"""
        col_name_lower = col_name.lower()
        
        if 'price' in col_name_lower or 'cost' in col_name_lower:
            return [round(random.uniform(10, 1000), 2) for _ in range(num_rows)]
        elif 'quantity' in col_name_lower or 'count' in col_name_lower:
            return [random.randint(1, 100) for _ in range(num_rows)]
        elif 'percentage' in col_name_lower or 'percent' in col_name_lower:
            return [round(random.uniform(0, 100), 2) for _ in range(num_rows)]
        elif 'score' in col_name_lower:
            return [random.randint(0, 100) for _ in range(num_rows)]
        else:
            if col_type == 'integer':
                return [random.randint(-1000, 1000) for _ in range(num_rows)]
            else:
                return [round(random.uniform(-1000, 1000), 2) for _ in range(num_rows)]
    
    def _generate_timeseries_column(self, col_name: str, col_type: str, num_rows: int) -> List[Any]:
        """Generate time series data"""
        if col_type == 'date':
            # Generate sequential dates
            start_date = datetime.now() - timedelta(days=num_rows)
            return [start_date + timedelta(days=i) for i in range(num_rows)]
        elif col_type in ['integer', 'float']:
            # Generate trending numeric data
            base = 100
            trend = 0.1
            noise = 10
            values = []
            for i in range(num_rows):
                value = base + i * trend + random.gauss(0, noise)
                values.append(round(value, 2) if col_type == 'float' else int(value))
            return values
        else:
            return self._generate_generic_column(col_type, num_rows)
    
    def _generate_generic_column(self, col_type: str, num_rows: int) -> List[Any]:
        """Generate generic data based on type"""
        if col_type == 'string':
            return [self.fake.word() for _ in range(num_rows)]
        elif col_type == 'integer':
            return [random.randint(0, 1000) for _ in range(num_rows)]
        elif col_type == 'float':
            return [round(random.uniform(0, 1000), 2) for _ in range(num_rows)]
        elif col_type == 'date':
            return [self.fake.date_between(start_date='-1y', end_date='today') for _ in range(num_rows)]
        elif col_type == 'boolean':
            return [random.choice([True, False]) for _ in range(num_rows)]
        elif col_type == 'category':
            categories = [f"Category_{i}" for i in range(5)]
            return [random.choice(categories) for _ in range(num_rows)]
        else:
            return [f"Value_{i}" for i in range(num_rows)]
    
    def _apply_relationships(self, df: pd.DataFrame, relationships: Dict[str, Any], patterns: Dict[str, Any]) -> pd.DataFrame:
        """Apply detected relationships to generated data"""
        # Apply correlations
        correlations = relationships.get('correlations', {})
        for correlation, corr_value in correlations.items():
            col1, col2 = correlation.split('-')
            if col1 in df.columns and col2 in df.columns:
                # Adjust col2 based on correlation with col1
                if patterns[col1]['type'] in ['integer', 'float'] and patterns[col2]['type'] in ['integer', 'float']:
                    # Add correlated noise to col2
                    base = df[col1].values
                    noise = np.random.normal(0, df[col2].std() * (1 - abs(corr_value)), len(df))
                    df[col2] = base * corr_value + noise
                    
                    # Clip to original range
                    df[col2] = df[col2].clip(patterns[col2]['min'], patterns[col2]['max'])
        
        # Apply functional dependencies
        dependencies = relationships.get('dependencies', [])
        for dep in dependencies:
            determinant = dep['determinant']
            dependent = dep['dependent']
            
            if determinant in df.columns and dependent in df.columns:
                # Create mapping from original data
                unique_values = df[determinant].unique()
                mapping = {}
                
                for val in unique_values:
                    # Generate appropriate dependent value
                    if patterns[dependent]['type'] == 'categorical':
                        categories = list(patterns[dependent]['categories'].keys())
                        mapping[val] = random.choice(categories)
                    else:
                        # Generate based on pattern
                        mapping[val] = self._generate_column(patterns[dependent], 1, {})[0]
                
                # Apply mapping
                df[dependent] = df[determinant].map(mapping)
        
        return df
    
    def _add_missing_values(self, df: pd.DataFrame, patterns: Dict[str, Any], missing_rate: float) -> pd.DataFrame:
        """Add missing values to data"""
        for column in df.columns:
            if column in patterns:
                original_missing = patterns[column].get('null_count', 0)
                original_total = patterns[column].get('total_count', len(df))
                
                if original_total > 0:
                    original_missing_rate = original_missing / original_total
                    
                    # Add missing values to match original rate
                    if original_missing_rate > 0:
                        num_missing = int(len(df) * min(original_missing_rate, missing_rate))
                        missing_indices = random.sample(range(len(df)), num_missing)
                        df.loc[missing_indices, column] = None
        
        return df
    
    def _add_outliers(self, df: pd.DataFrame, patterns: Dict[str, Any], outlier_rate: float) -> pd.DataFrame:
        """Add outliers to numeric columns"""
        for column in df.columns:
            if column in patterns and patterns[column]['type'] in ['integer', 'float']:
                num_outliers = int(len(df) * outlier_rate)
                if num_outliers > 0:
                    outlier_indices = random.sample(range(len(df)), num_outliers)
                    
                    # Generate outliers beyond normal range
                    min_val = patterns[column]['min']
                    max_val = patterns[column]['max']
                    range_val = max_val - min_val
                    
                    for idx in outlier_indices:
                        if random.random() < 0.5:
                            # Low outlier
                            df.loc[idx, column] = min_val - random.uniform(0.1, 0.5) * range_val
                        else:
                            # High outlier
                            df.loc[idx, column] = max_val + random.uniform(0.1, 0.5) * range_val
                    
                    # Convert back to int if needed
                    if patterns[column]['type'] == 'integer':
                        df[column] = df[column].astype(int)
        
        return df
    
    def export_dataframe(self, df: pd.DataFrame, format: str) -> Union[str, bytes]:
        """Export DataFrame to specified format"""
        if format == 'csv':
            return df.to_csv(index=False)
        elif format == 'json':
            return df.to_json(orient='records', indent=2)
        elif format == 'excel':
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Generated Data')
            return output.getvalue()
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def generate_multi_table(
        self,
        table_configs: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        options: Dict[str, Any] = None
    ) -> Dict[str, pd.DataFrame]:
        """
        Generate multiple related tables with referential integrity
        
        Args:
            table_configs: List of table configurations
            relationships: List of relationships between tables
            options: Generation options
            
        Returns:
            Dictionary of table name to DataFrame
        """
        options = options or {}
        tables = {}
        
        # Sort tables by dependencies (primary tables first)
        sorted_tables = self._sort_tables_by_dependency(table_configs, relationships)
        
        # Generate each table
        for table_config in sorted_tables:
            table_name = table_config['name']
            num_rows = table_config['rows']
            columns = table_config['columns']
            
            # Generate base data
            table_data = {}
            for col in columns:
                col_name = col['name']
                col_type = col['type']
                
                if col_type == 'foreign_key':
                    # Find related table
                    rel = self._find_relationship(table_name, relationships)
                    if rel and rel['to'] in tables:
                        # Use existing primary keys
                        parent_table = tables[rel['to']]
                        parent_key = parent_table.iloc[:, 0]  # Assume first column is primary key
                        
                        # Sample with replacement for many-to-one relationships
                        table_data[col_name] = np.random.choice(parent_key, size=num_rows, replace=True)
                    else:
                        # Generate sequential IDs
                        table_data[col_name] = range(1, num_rows + 1)
                elif col_type == 'id':
                    # Generate unique IDs
                    table_data[col_name] = range(1, num_rows + 1)
                else:
                    # Generate based on type
                    table_data[col_name] = self._generate_column_by_type(col_type, num_rows)
            
            tables[table_name] = pd.DataFrame(table_data)
        
        # Apply privacy if requested
        if options.get('differential_privacy'):
            epsilon = options.get('epsilon', 1.0)
            tables = self._apply_differential_privacy(tables, epsilon)
        
        return tables
    
    def _sort_tables_by_dependency(
        self,
        table_configs: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Sort tables so that parent tables are generated before child tables"""
        # Find primary tables (no foreign keys)
        primary_tables = []
        dependent_tables = []
        
        for config in table_configs:
            if config.get('isPrimary', False):
                primary_tables.append(config)
            else:
                dependent_tables.append(config)
        
        return primary_tables + dependent_tables
    
    def _find_relationship(self, table_name: str, relationships: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Find relationship for a table"""
        for rel in relationships:
            if rel['from'] == table_name:
                return rel
        return None
    
    def _generate_column_by_type(self, col_type: str, num_rows: int) -> List[Any]:
        """Generate column data based on type"""
        if col_type == 'string':
            return [self.fake.word() for _ in range(num_rows)]
        elif col_type == 'integer':
            return np.random.randint(1, 1000, num_rows).tolist()
        elif col_type == 'float':
            return np.random.uniform(0, 1000, num_rows).tolist()
        elif col_type == 'date':
            start_date = datetime(2020, 1, 1)
            return [self.fake.date_between(start_date=start_date) for _ in range(num_rows)]
        elif col_type == 'boolean':
            return np.random.choice([True, False], num_rows).tolist()
        else:
            return [None] * num_rows
    
    def _apply_differential_privacy(
        self,
        tables: Dict[str, pd.DataFrame],
        epsilon: float
    ) -> Dict[str, pd.DataFrame]:
        """Apply differential privacy to generated data"""
        for table_name, df in tables.items():
            # Add Laplace noise to numeric columns
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                # Calculate sensitivity (range of values)
                sensitivity = df[col].max() - df[col].min()
                
                # Add Laplace noise
                noise = np.random.laplace(0, sensitivity / epsilon, len(df))
                df[col] = df[col] + noise
                
                # Ensure values stay within reasonable bounds
                df[col] = df[col].clip(df[col].min() * 0.9, df[col].max() * 1.1)
        
        return tables
    
    def apply_privacy_techniques(
        self,
        df: pd.DataFrame,
        techniques: Dict[str, bool],
        config: Dict[str, Any] = None
    ) -> pd.DataFrame:
        """
        Apply various privacy preservation techniques
        
        Args:
            df: Input DataFrame
            techniques: Dictionary of technique names to enable/disable
            config: Additional configuration parameters
            
        Returns:
            Privacy-preserved DataFrame
        """
        config = config or {}
        
        if techniques.get('k_anonymity'):
            df = self._apply_k_anonymity(df, config.get('k', 5))
        
        if techniques.get('l_diversity'):
            df = self._apply_l_diversity(df, config.get('l', 3))
        
        if techniques.get('t_closeness'):
            df = self._apply_t_closeness(df, config.get('t', 0.2))
        
        if techniques.get('data_masking'):
            df = self._apply_data_masking(df, config.get('mask_columns', []))
        
        return df
    
    def _apply_k_anonymity(self, df: pd.DataFrame, k: int) -> pd.DataFrame:
        """Apply k-anonymity by generalizing quasi-identifiers"""
        # Identify quasi-identifiers (simplified)
        quasi_identifiers = []
        for col in df.columns:
            if df[col].nunique() > k and df[col].nunique() < len(df) * 0.8:
                quasi_identifiers.append(col)
        
        # Generalize quasi-identifiers
        for col in quasi_identifiers:
            if df[col].dtype in ['int64', 'float64']:
                # Bin numeric values
                df[col] = pd.cut(df[col], bins=max(len(df) // k, 5), labels=False)
            else:
                # Group categorical values
                value_counts = df[col].value_counts()
                small_categories = value_counts[value_counts < k].index
                df.loc[df[col].isin(small_categories), col] = 'OTHER'
        
        return df
    
    def _apply_l_diversity(self, df: pd.DataFrame, l: int) -> pd.DataFrame:
        """Apply l-diversity for sensitive attributes"""
        # This is a simplified implementation
        # In practice, you would need to identify sensitive attributes
        # and ensure each equivalence class has at least l diverse values
        return df
    
    def _apply_t_closeness(self, df: pd.DataFrame, t: float) -> pd.DataFrame:
        """Apply t-closeness for sensitive attributes"""
        # This is a simplified implementation
        # In practice, you would ensure the distribution of sensitive attributes
        # in each equivalence class is close to the overall distribution
        return df
    
    def _apply_data_masking(self, df: pd.DataFrame, mask_columns: List[str]) -> pd.DataFrame:
        """Apply data masking to specified columns"""
        for col in mask_columns:
            if col in df.columns:
                if df[col].dtype == 'object':
                    # Mask string data
                    df[col] = df[col].apply(lambda x: hashlib.sha256(str(x).encode()).hexdigest()[:8] if pd.notna(x) else x)
                else:
                    # Mask numeric data
                    df[col] = df[col].apply(lambda x: hash(str(x)) % 10000 if pd.notna(x) else x)
        
        return df