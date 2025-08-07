"""
Pattern Analysis Service for Data Generator
Analyzes uploaded data to detect patterns for synthetic data generation
"""

import pandas as pd
import numpy as np
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import re
from collections import Counter
from pathlib import Path
import io


class PatternAnalyzer:
    """Analyzes data patterns for synthetic data generation"""
    
    def __init__(self):
        self.supported_formats = ['.csv', '.json', '.xlsx', '.xls']
        self.max_preview_rows = 1000
        
    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze uploaded file and extract patterns
        
        Args:
            file_path: Path to the uploaded file
            
        Returns:
            Dictionary containing analysis results
        """
        # Read the file into a DataFrame
        df = self._read_file(file_path)
        
        # Get basic info
        total_rows = len(df)
        columns = list(df.columns)
        
        # Analyze each column
        patterns = {}
        for column in columns:
            patterns[column] = self._analyze_column(df[column])
        
        # Detect relationships between columns
        relationships = self._detect_relationships(df)
        
        # Create preview data
        preview_rows = min(total_rows, self.max_preview_rows)
        preview = {
            'columns': columns,
            'rows': df.head(preview_rows).to_dict('records'),
            'total_rows': total_rows
        }
        
        return {
            'columns': columns,
            'row_count': total_rows,
            'patterns': patterns,
            'relationships': relationships,
            'preview': preview
        }
    
    def _read_file(self, file_path: str) -> pd.DataFrame:
        """Read file into pandas DataFrame based on file type"""
        path = Path(file_path)
        ext = path.suffix.lower()
        
        if ext == '.csv':
            # Try different encodings
            for encoding in ['utf-8', 'latin-1', 'iso-8859-1']:
                try:
                    return pd.read_csv(file_path, encoding=encoding)
                except UnicodeDecodeError:
                    continue
            raise ValueError("Unable to decode CSV file")
            
        elif ext == '.json':
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Handle different JSON structures
            if isinstance(data, list):
                return pd.DataFrame(data)
            elif isinstance(data, dict):
                # Try to find the data array
                for key in ['data', 'records', 'items', 'results']:
                    if key in data and isinstance(data[key], list):
                        return pd.DataFrame(data[key])
                # If no array found, treat as single record
                return pd.DataFrame([data])
            else:
                raise ValueError("Unsupported JSON structure")
                
        elif ext in ['.xlsx', '.xls']:
            return pd.read_excel(file_path)
            
        else:
            raise ValueError(f"Unsupported file format: {ext}")
    
    def _analyze_column(self, series: pd.Series) -> Dict[str, Any]:
        """Analyze a single column to detect its pattern"""
        # Remove null values for analysis
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return {
                'type': 'empty',
                'null_count': len(series),
                'unique_count': 0
            }
        
        # Basic stats
        pattern = {
            'null_count': series.isnull().sum(),
            'unique_count': series.nunique(),
            'total_count': len(series)
        }
        
        # Try to detect data type
        if self._is_numeric(non_null):
            pattern.update(self._analyze_numeric(non_null))
        elif self._is_datetime(non_null):
            pattern.update(self._analyze_datetime(non_null))
        elif self._is_boolean(non_null):
            pattern.update(self._analyze_boolean(non_null))
        elif self._is_categorical(non_null):
            pattern.update(self._analyze_categorical(non_null))
        else:
            pattern.update(self._analyze_text(non_null))
        
        return pattern
    
    def _is_numeric(self, series: pd.Series) -> bool:
        """Check if column is numeric"""
        try:
            pd.to_numeric(series)
            return True
        except:
            return False
    
    def _is_datetime(self, series: pd.Series) -> bool:
        """Check if column is datetime"""
        if series.dtype == 'datetime64[ns]':
            return True
        
        # Try to parse as datetime
        try:
            sample = series.head(10)
            pd.to_datetime(sample)
            return True
        except:
            return False
    
    def _is_boolean(self, series: pd.Series) -> bool:
        """Check if column is boolean"""
        unique_values = series.unique()
        if len(unique_values) <= 2:
            # Check common boolean representations
            bool_values = [
                {True, False},
                {'true', 'false'},
                {'True', 'False'},
                {'TRUE', 'FALSE'},
                {'yes', 'no'},
                {'Yes', 'No'},
                {'YES', 'NO'},
                {'1', '0'},
                {1, 0},
                {'Y', 'N'},
                {'y', 'n'}
            ]
            
            str_values = {str(v).strip() for v in unique_values}
            for bool_set in bool_values:
                if str_values.issubset({str(v) for v in bool_set}):
                    return True
        
        return False
    
    def _is_categorical(self, series: pd.Series) -> bool:
        """Check if column is categorical (low cardinality)"""
        unique_ratio = series.nunique() / len(series)
        return unique_ratio < 0.5  # Less than 50% unique values
    
    def _analyze_numeric(self, series: pd.Series) -> Dict[str, Any]:
        """Analyze numeric column"""
        numeric_series = pd.to_numeric(series)
        
        # Check if integer or float
        is_integer = (numeric_series % 1 == 0).all()
        
        pattern = {
            'type': 'integer' if is_integer else 'float',
            'min': float(numeric_series.min()),
            'max': float(numeric_series.max()),
            'mean': float(numeric_series.mean()),
            'median': float(numeric_series.median()),
            'std': float(numeric_series.std()),
            'distribution': self._detect_distribution(numeric_series)
        }
        
        # Detect if it's a sequence
        if is_integer and len(numeric_series) > 1:
            sorted_values = numeric_series.sort_values()
            diffs = sorted_values.diff().dropna()
            if (diffs == 1).all():
                pattern['is_sequence'] = True
                pattern['sequence_start'] = int(sorted_values.iloc[0])
                pattern['sequence_step'] = 1
        
        return pattern
    
    def _analyze_datetime(self, series: pd.Series) -> Dict[str, Any]:
        """Analyze datetime column"""
        # Convert to datetime if not already
        if series.dtype != 'datetime64[ns]':
            datetime_series = pd.to_datetime(series)
        else:
            datetime_series = series
        
        pattern = {
            'type': 'datetime',
            'min_date': datetime_series.min().isoformat(),
            'max_date': datetime_series.max().isoformat(),
            'format': self._detect_datetime_format(series)
        }
        
        # Detect if it's a time series with regular intervals
        sorted_dates = datetime_series.sort_values()
        if len(sorted_dates) > 1:
            intervals = sorted_dates.diff().dropna()
            if intervals.std() < pd.Timedelta(seconds=1):
                pattern['is_regular_series'] = True
                pattern['interval'] = str(intervals.mode()[0])
        
        return pattern
    
    def _analyze_boolean(self, series: pd.Series) -> Dict[str, Any]:
        """Analyze boolean column"""
        value_counts = series.value_counts()
        
        return {
            'type': 'boolean',
            'true_count': value_counts.get(True, 0) + value_counts.get('true', 0) + 
                         value_counts.get('True', 0) + value_counts.get('TRUE', 0) +
                         value_counts.get('yes', 0) + value_counts.get('Yes', 0) +
                         value_counts.get('YES', 0) + value_counts.get('1', 0) +
                         value_counts.get(1, 0) + value_counts.get('Y', 0) +
                         value_counts.get('y', 0),
            'false_count': len(series) - (value_counts.get(True, 0) + value_counts.get('true', 0) + 
                          value_counts.get('True', 0) + value_counts.get('TRUE', 0) +
                          value_counts.get('yes', 0) + value_counts.get('Yes', 0) +
                          value_counts.get('YES', 0) + value_counts.get('1', 0) +
                          value_counts.get(1, 0) + value_counts.get('Y', 0) +
                          value_counts.get('y', 0)),
            'representation': str(series.iloc[0])  # How booleans are represented
        }
    
    def _analyze_categorical(self, series: pd.Series) -> Dict[str, Any]:
        """Analyze categorical column"""
        value_counts = series.value_counts()
        
        pattern = {
            'type': 'categorical',
            'categories': value_counts.to_dict(),
            'top_value': value_counts.index[0],
            'top_frequency': value_counts.iloc[0] / len(series)
        }
        
        # Include distribution of top categories
        top_10 = value_counts.head(10)
        pattern['top_categories'] = {
            str(k): v for k, v in top_10.items()
        }
        
        return pattern
    
    def _analyze_text(self, series: pd.Series) -> Dict[str, Any]:
        """Analyze text column"""
        str_series = series.astype(str)
        
        pattern = {
            'type': 'text',
            'avg_length': str_series.str.len().mean(),
            'min_length': str_series.str.len().min(),
            'max_length': str_series.str.len().max()
        }
        
        # Detect common patterns
        patterns_found = []
        
        # Email pattern
        if str_series.str.contains(r'[\w\.-]+@[\w\.-]+\.\w+', regex=True).any():
            patterns_found.append('email')
        
        # URL pattern
        if str_series.str.contains(r'https?://|www\.', regex=True).any():
            patterns_found.append('url')
        
        # Phone pattern
        if str_series.str.contains(r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}', regex=True).any():
            patterns_found.append('phone')
        
        # UUID pattern
        if str_series.str.contains(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', regex=True, case=False).any():
            patterns_found.append('uuid')
        
        # Name pattern (capitalized words)
        if str_series.str.match(r'^[A-Z][a-z]+(\s[A-Z][a-z]+)*$').sum() > len(series) * 0.5:
            patterns_found.append('name')
        
        pattern['detected_patterns'] = patterns_found
        
        # Detect if values follow a template
        if series.nunique() < len(series) * 0.1:  # Many duplicates
            # Extract common prefix/suffix
            common_prefix = self._find_common_prefix(str_series.head(100).tolist())
            common_suffix = self._find_common_suffix(str_series.head(100).tolist())
            
            if common_prefix:
                pattern['common_prefix'] = common_prefix
            if common_suffix:
                pattern['common_suffix'] = common_suffix
        
        return pattern
    
    def _detect_distribution(self, series: pd.Series) -> str:
        """Detect the distribution type of numeric data"""
        from scipy import stats
        
        # Normalize the data
        normalized = (series - series.mean()) / series.std()
        
        # Test for normal distribution
        _, p_normal = stats.normaltest(normalized)
        if p_normal > 0.05:
            return 'normal'
        
        # Test for uniform distribution
        _, p_uniform = stats.kstest(normalized, 'uniform')
        if p_uniform > 0.05:
            return 'uniform'
        
        # Check for exponential by looking at skewness
        skewness = series.skew()
        if skewness > 2:
            return 'exponential'
        
        return 'unknown'
    
    def _detect_datetime_format(self, series: pd.Series) -> str:
        """Detect the datetime format from string representations"""
        sample = str(series.iloc[0])
        
        # Common datetime formats
        formats = [
            '%Y-%m-%d',
            '%Y/%m/%d',
            '%d-%m-%Y',
            '%d/%m/%Y',
            '%Y-%m-%d %H:%M:%S',
            '%Y/%m/%d %H:%M:%S',
            '%d-%m-%Y %H:%M:%S',
            '%d/%m/%Y %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%d %H:%M:%S.%f'
        ]
        
        for fmt in formats:
            try:
                datetime.strptime(sample, fmt)
                return fmt
            except:
                continue
        
        return 'ISO'  # Default to ISO format
    
    def _detect_relationships(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect relationships between columns"""
        relationships = {
            'correlations': {},
            'dependencies': []
        }
        
        # Find correlations between numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 1:
            corr_matrix = df[numeric_cols].corr()
            
            # Find strong correlations (> 0.7)
            for i in range(len(numeric_cols)):
                for j in range(i + 1, len(numeric_cols)):
                    corr_value = corr_matrix.iloc[i, j]
                    if abs(corr_value) > 0.7:
                        relationships['correlations'][f"{numeric_cols[i]}-{numeric_cols[j]}"] = float(corr_value)
        
        # Detect functional dependencies
        for col1 in df.columns:
            for col2 in df.columns:
                if col1 != col2:
                    # Check if col1 determines col2
                    grouped = df.groupby(col1)[col2].nunique()
                    if (grouped == 1).all():
                        relationships['dependencies'].append({
                            'determinant': col1,
                            'dependent': col2
                        })
        
        return relationships
    
    def _find_common_prefix(self, strings: List[str]) -> str:
        """Find common prefix among strings"""
        if not strings:
            return ""
        
        prefix = strings[0]
        for s in strings[1:]:
            while not s.startswith(prefix):
                prefix = prefix[:-1]
                if not prefix:
                    return ""
        
        return prefix
    
    def _find_common_suffix(self, strings: List[str]) -> str:
        """Find common suffix among strings"""
        if not strings:
            return ""
        
        suffix = strings[0]
        for s in strings[1:]:
            while not s.endswith(suffix):
                suffix = suffix[1:]
                if not suffix:
                    return ""
        
        return suffix