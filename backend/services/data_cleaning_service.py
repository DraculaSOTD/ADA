"""
Data Cleaning Service
Advanced data cleaning with AI-powered operations and industry-specific models
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass
from datetime import datetime
import re
import hashlib
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
from sklearn.ensemble import IsolationForest
import json
import os
from pathlib import Path
from fuzzywuzzy import fuzz, process
import warnings
warnings.filterwarnings('ignore')


@dataclass
class CleaningConfig:
    """Configuration for data cleaning operations"""
    tier: str  # basic, advanced, ai-powered
    template: Optional[str] = None  # Industry template
    
    # Basic cleaning options
    remove_duplicates: bool = True
    validate_types: bool = True
    handle_missing: bool = True
    missing_strategy: str = "remove"  # remove, mean, median, mode, forward, backward
    standardize_formats: bool = True
    trim_whitespace: bool = True
    
    # Advanced cleaning options
    ai_anomaly_detection: bool = False
    statistical_outliers: bool = False
    outlier_sensitivity: float = 3.0
    fuzzy_matching: bool = False
    fuzzy_threshold: float = 0.90
    smart_column_mapping: bool = False
    data_enrichment: bool = False
    
    # AI-powered options
    gpt_correction: bool = False
    industry_ml_models: bool = False
    predictive_quality: bool = False
    synthetic_data_generation: bool = False
    entity_resolution: bool = False
    semantic_validation: bool = False
    
    # Privacy and compliance
    differential_privacy: bool = False
    epsilon: float = 1.0
    k_anonymity: bool = False
    l_diversity: bool = False
    t_closeness: bool = False
    data_masking: bool = False
    
    # Compliance standards
    gdpr_compliant: bool = False
    hipaa_compliant: bool = False
    pci_compliant: bool = False


class DataCleaningService:
    """Advanced data cleaning service with AI capabilities"""
    
    def __init__(self):
        self.supported_formats = ['.csv', '.xlsx', '.xls', '.json', '.parquet']
        self.quality_metrics = {}
        self.cleaning_report = {}
        
    async def profile_data(self, file_path: str) -> Dict:
        """
        Profile data to understand quality issues and patterns
        """
        try:
            # Load data
            df = self._load_data(file_path)
            
            profile = {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "file_size": os.path.getsize(file_path),
                "columns": [],
                "quality_score": 0,
                "issues_detected": []
            }
            
            # Profile each column
            for col in df.columns:
                col_profile = self._profile_column(df, col)
                profile["columns"].append(col_profile)
            
            # Calculate overall quality score
            profile["quality_score"] = self._calculate_quality_score(df, profile["columns"])
            
            # Detect common issues
            profile["issues_detected"] = self._detect_issues(df)
            
            return profile
            
        except Exception as e:
            raise Exception(f"Data profiling failed: {str(e)}")
    
    def _profile_column(self, df: pd.DataFrame, column: str) -> Dict:
        """Profile a single column"""
        col_data = df[column]
        profile = {
            "name": column,
            "type": str(col_data.dtype),
            "null_count": col_data.isnull().sum(),
            "null_percentage": (col_data.isnull().sum() / len(df)) * 100,
            "unique_count": col_data.nunique(),
            "unique_percentage": (col_data.nunique() / len(df)) * 100,
            "quality_score": 100
        }
        
        # Calculate quality score for column
        null_penalty = profile["null_percentage"] * 0.5
        uniqueness_bonus = min(profile["unique_percentage"] * 0.1, 10)
        profile["quality_score"] = max(0, 100 - null_penalty + uniqueness_bonus)
        
        # Add statistics for numeric columns
        if pd.api.types.is_numeric_dtype(col_data):
            profile.update({
                "min": float(col_data.min()) if not col_data.empty else None,
                "max": float(col_data.max()) if not col_data.empty else None,
                "mean": float(col_data.mean()) if not col_data.empty else None,
                "median": float(col_data.median()) if not col_data.empty else None,
                "std": float(col_data.std()) if not col_data.empty else None,
                "outliers": self._detect_outliers(col_data)
            })
        
        # Add top values for categorical columns
        elif pd.api.types.is_object_dtype(col_data):
            value_counts = col_data.value_counts()
            profile["top_values"] = value_counts.head(5).to_dict()
            
        return profile
    
    def _detect_outliers(self, data: pd.Series) -> int:
        """Detect outliers using IQR method"""
        Q1 = data.quantile(0.25)
        Q3 = data.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        return ((data < lower_bound) | (data > upper_bound)).sum()
    
    def _calculate_quality_score(self, df: pd.DataFrame, column_profiles: List[Dict]) -> float:
        """Calculate overall data quality score"""
        if not column_profiles:
            return 0
        
        # Average column quality scores
        avg_col_quality = np.mean([col["quality_score"] for col in column_profiles])
        
        # Check for duplicates
        duplicate_penalty = (df.duplicated().sum() / len(df)) * 100
        
        # Check data completeness
        completeness = (1 - df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
        
        # Calculate final score
        quality_score = (avg_col_quality * 0.4 + completeness * 0.4 + (100 - duplicate_penalty) * 0.2)
        
        return round(quality_score, 2)
    
    def _detect_issues(self, df: pd.DataFrame) -> List[Dict]:
        """Detect common data quality issues"""
        issues = []
        
        # Check for duplicates
        duplicate_count = df.duplicated().sum()
        if duplicate_count > 0:
            issues.append({
                "type": "duplicates",
                "severity": "medium",
                "count": duplicate_count,
                "message": f"Found {duplicate_count} duplicate rows"
            })
        
        # Check for missing values
        missing_count = df.isnull().sum().sum()
        if missing_count > 0:
            issues.append({
                "type": "missing_values",
                "severity": "low" if missing_count < len(df) * 0.05 else "medium",
                "count": missing_count,
                "message": f"Found {missing_count} missing values"
            })
        
        # Check for inconsistent data types
        for col in df.columns:
            if df[col].dtype == 'object':
                # Try to detect mixed types
                types = df[col].dropna().apply(lambda x: type(x).__name__).unique()
                if len(types) > 1:
                    issues.append({
                        "type": "mixed_types",
                        "severity": "high",
                        "column": col,
                        "message": f"Column '{col}' contains mixed data types"
                    })
        
        return issues
    
    async def clean_data(self, file_path: str, config: CleaningConfig, job_id: int) -> Dict:
        """
        Perform data cleaning based on configuration
        """
        try:
            # Load data
            df = self._load_data(file_path)
            original_shape = df.shape
            
            # Initialize cleaning report
            self.cleaning_report = {
                "job_id": job_id,
                "operations_performed": [],
                "rows_before": original_shape[0],
                "rows_after": 0,
                "quality_before": self._calculate_quality_score(df, []),
                "quality_after": 0
            }
            
            # Execute cleaning operations based on tier
            if config.tier == "basic":
                df = await self._basic_cleaning(df, config)
            elif config.tier == "advanced":
                df = await self._advanced_cleaning(df, config)
            elif config.tier == "ai-powered":
                df = await self._ai_powered_cleaning(df, config)
            
            # Apply compliance if needed
            if any([config.gdpr_compliant, config.hipaa_compliant, config.pci_compliant]):
                df = await self._apply_compliance(df, config)
            
            # Calculate final metrics
            self.cleaning_report["rows_after"] = len(df)
            self.cleaning_report["quality_after"] = self._calculate_quality_score(df, [])
            
            # Save cleaned data
            output_path = file_path.replace('.', '_cleaned.')
            self._save_data(df, output_path)
            
            return {
                "success": True,
                "output_path": output_path,
                "report": self.cleaning_report,
                "rows_cleaned": len(df),
                "quality_improvement": self.cleaning_report["quality_after"] - self.cleaning_report["quality_before"]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "report": self.cleaning_report
            }
    
    async def _basic_cleaning(self, df: pd.DataFrame, config: CleaningConfig) -> pd.DataFrame:
        """Perform basic cleaning operations"""
        
        # Remove duplicates
        if config.remove_duplicates:
            before = len(df)
            df = df.drop_duplicates()
            self._log_operation("remove_duplicates", before - len(df))
        
        # Validate data types
        if config.validate_types:
            df = self._validate_and_convert_types(df)
        
        # Handle missing values
        if config.handle_missing:
            df = self._handle_missing_values(df, config.missing_strategy)
        
        # Standardize formats
        if config.standardize_formats:
            df = self._standardize_formats(df)
        
        # Trim whitespace
        if config.trim_whitespace:
            df = self._trim_whitespace(df)
        
        return df
    
    async def _advanced_cleaning(self, df: pd.DataFrame, config: CleaningConfig) -> pd.DataFrame:
        """Perform advanced cleaning operations"""
        
        # First apply basic cleaning
        df = await self._basic_cleaning(df, config)
        
        # AI anomaly detection
        if config.ai_anomaly_detection:
            df = self._detect_and_handle_anomalies(df)
        
        # Statistical outlier detection
        if config.statistical_outliers:
            df = self._handle_statistical_outliers(df, config.outlier_sensitivity)
        
        # Fuzzy matching for duplicates
        if config.fuzzy_matching:
            df = self._fuzzy_deduplication(df, config.fuzzy_threshold)
        
        # Smart column mapping
        if config.smart_column_mapping:
            df = self._smart_column_mapping(df)
        
        # Data enrichment
        if config.data_enrichment:
            df = self._enrich_data(df)
        
        return df
    
    async def _ai_powered_cleaning(self, df: pd.DataFrame, config: CleaningConfig) -> pd.DataFrame:
        """Perform AI-powered cleaning operations"""
        
        # First apply advanced cleaning
        df = await self._advanced_cleaning(df, config)
        
        # GPT-powered corrections (simulated)
        if config.gpt_correction:
            df = self._apply_gpt_corrections(df)
        
        # Industry ML models (simulated)
        if config.industry_ml_models:
            df = self._apply_industry_models(df, config.template)
        
        # Predictive quality assessment
        if config.predictive_quality:
            df = self._predictive_quality_assessment(df)
        
        # Synthetic data for gaps
        if config.synthetic_data_generation:
            df = self._generate_synthetic_data(df)
        
        # Entity resolution
        if config.entity_resolution:
            df = self._resolve_entities(df)
        
        # Semantic validation
        if config.semantic_validation:
            df = self._semantic_validation(df)
        
        return df
    
    def _validate_and_convert_types(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate and convert data types"""
        for col in df.columns:
            # Try to convert to numeric if possible
            if df[col].dtype == 'object':
                try:
                    df[col] = pd.to_numeric(df[col], errors='ignore')
                except:
                    pass
                
                # Try to convert to datetime
                try:
                    if df[col].str.match(r'\d{4}-\d{2}-\d{2}').any():
                        df[col] = pd.to_datetime(df[col], errors='ignore')
                except:
                    pass
        
        self._log_operation("type_validation", len(df.columns))
        return df
    
    def _handle_missing_values(self, df: pd.DataFrame, strategy: str) -> pd.DataFrame:
        """Handle missing values based on strategy"""
        missing_before = df.isnull().sum().sum()
        
        if strategy == "remove":
            df = df.dropna()
        elif strategy == "mean":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
        elif strategy == "median":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
        elif strategy == "mode":
            for col in df.columns:
                if not df[col].empty:
                    mode_value = df[col].mode()[0] if len(df[col].mode()) > 0 else None
                    if mode_value is not None:
                        df[col] = df[col].fillna(mode_value)
        elif strategy == "forward":
            df = df.fillna(method='ffill')
        elif strategy == "backward":
            df = df.fillna(method='bfill')
        
        missing_after = df.isnull().sum().sum()
        self._log_operation("handle_missing", missing_before - missing_after)
        return df
    
    def _standardize_formats(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardize data formats"""
        for col in df.columns:
            if df[col].dtype == 'object':
                # Standardize string formats
                df[col] = df[col].str.strip()
                
                # Standardize email formats
                if df[col].str.contains('@', na=False).any():
                    df[col] = df[col].str.lower()
                
                # Standardize phone numbers (basic)
                if df[col].str.match(r'[\d\-\(\)\+\s]+').any():
                    df[col] = df[col].str.replace(r'[^\d+]', '', regex=True)
        
        self._log_operation("standardize_formats", len(df.columns))
        return df
    
    def _trim_whitespace(self, df: pd.DataFrame) -> pd.DataFrame:
        """Trim whitespace from string columns"""
        string_cols = df.select_dtypes(include=['object']).columns
        for col in string_cols:
            df[col] = df[col].str.strip()
        
        self._log_operation("trim_whitespace", len(string_cols))
        return df
    
    def _detect_and_handle_anomalies(self, df: pd.DataFrame) -> pd.DataFrame:
        """Detect and handle anomalies using machine learning"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if len(numeric_cols) > 0:
            # Use Isolation Forest for anomaly detection
            iso_forest = IsolationForest(contamination=0.1, random_state=42)
            numeric_data = df[numeric_cols].fillna(0)
            
            anomalies = iso_forest.fit_predict(numeric_data)
            anomaly_count = (anomalies == -1).sum()
            
            # Mark anomalies but don't remove them
            df['_anomaly_score'] = anomalies
            
            self._log_operation("anomaly_detection", anomaly_count)
        
        return df
    
    def _handle_statistical_outliers(self, df: pd.DataFrame, sensitivity: float) -> pd.DataFrame:
        """Handle statistical outliers using Z-score"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        outliers_handled = 0
        
        for col in numeric_cols:
            z_scores = np.abs(stats.zscore(df[col].dropna()))
            outlier_indices = np.where(z_scores > sensitivity)[0]
            
            if len(outlier_indices) > 0:
                # Cap outliers at threshold values
                lower_bound = df[col].quantile(0.01)
                upper_bound = df[col].quantile(0.99)
                df[col] = df[col].clip(lower_bound, upper_bound)
                outliers_handled += len(outlier_indices)
        
        self._log_operation("outlier_handling", outliers_handled)
        return df
    
    def _fuzzy_deduplication(self, df: pd.DataFrame, threshold: float) -> pd.DataFrame:
        """Remove fuzzy duplicates using string similarity"""
        string_cols = df.select_dtypes(include=['object']).columns
        duplicates_removed = 0
        
        if len(string_cols) > 0:
            # Create a hash of string columns for comparison
            df['_fuzzy_hash'] = df[string_cols].fillna('').agg(''.join, axis=1)
            
            # Find fuzzy duplicates (simplified implementation)
            to_remove = []
            processed = set()
            
            for idx, row in df.iterrows():
                if idx not in processed:
                    similar = df[df.index > idx].copy()
                    for sim_idx, sim_row in similar.iterrows():
                        if sim_idx not in processed:
                            ratio = fuzz.ratio(row['_fuzzy_hash'], sim_row['_fuzzy_hash'])
                            if ratio > threshold * 100:
                                to_remove.append(sim_idx)
                                processed.add(sim_idx)
                    processed.add(idx)
            
            df = df.drop(to_remove)
            df = df.drop('_fuzzy_hash', axis=1)
            duplicates_removed = len(to_remove)
        
        self._log_operation("fuzzy_deduplication", duplicates_removed)
        return df
    
    def _smart_column_mapping(self, df: pd.DataFrame) -> pd.DataFrame:
        """Intelligently map and standardize column names"""
        # Common column name mappings
        mappings = {
            'fname': 'first_name',
            'lname': 'last_name',
            'dob': 'date_of_birth',
            'addr': 'address',
            'phone': 'phone_number',
            'email': 'email_address',
            'amt': 'amount',
            'qty': 'quantity'
        }
        
        new_columns = {}
        for col in df.columns:
            col_lower = col.lower().strip()
            # Check direct mapping
            if col_lower in mappings:
                new_columns[col] = mappings[col_lower]
            else:
                # Standardize format (snake_case)
                new_name = re.sub(r'[^\w\s]', '', col_lower)
                new_name = re.sub(r'\s+', '_', new_name)
                new_columns[col] = new_name
        
        df = df.rename(columns=new_columns)
        self._log_operation("column_mapping", len(new_columns))
        return df
    
    def _enrich_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Enrich data with derived features"""
        enriched_cols = 0
        
        # Extract date components
        date_cols = df.select_dtypes(include=['datetime64']).columns
        for col in date_cols:
            df[f'{col}_year'] = df[col].dt.year
            df[f'{col}_month'] = df[col].dt.month
            df[f'{col}_day'] = df[col].dt.day
            df[f'{col}_weekday'] = df[col].dt.weekday
            enriched_cols += 4
        
        # Create value categories for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col not in ['_anomaly_score'] and df[col].nunique() > 10:
                df[f'{col}_quartile'] = pd.qcut(df[col], q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'], duplicates='drop')
                enriched_cols += 1
        
        self._log_operation("data_enrichment", enriched_cols)
        return df
    
    def _apply_gpt_corrections(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply GPT-powered corrections (simulated)"""
        # This would integrate with actual GPT API in production
        corrections_made = 0
        
        # Simulate corrections for common issues
        string_cols = df.select_dtypes(include=['object']).columns
        for col in string_cols:
            # Fix common typos (simplified)
            if 'address' in col.lower():
                df[col] = df[col].str.replace(r'\bSt\b', 'Street', regex=True)
                df[col] = df[col].str.replace(r'\bAve\b', 'Avenue', regex=True)
                corrections_made += df[col].notna().sum()
        
        self._log_operation("gpt_corrections", corrections_made)
        return df
    
    def _apply_industry_models(self, df: pd.DataFrame, template: Optional[str]) -> pd.DataFrame:
        """Apply industry-specific ML models"""
        # This would use actual trained models in production
        
        if template == "healthcare":
            # Validate medical codes, standardize terminology
            pass
        elif template == "finance":
            # Validate transaction patterns, detect fraud indicators
            pass
        elif template == "retail":
            # Standardize product categories, validate SKUs
            pass
        
        self._log_operation("industry_models", 1)
        return df
    
    def _predictive_quality_assessment(self, df: pd.DataFrame) -> pd.DataFrame:
        """Assess and predict data quality issues"""
        # Add quality score column
        df['_quality_score'] = 100
        
        # Reduce score for missing values
        missing_penalty = df.isnull().sum(axis=1) * 10
        df['_quality_score'] -= missing_penalty
        
        # Ensure score is between 0 and 100
        df['_quality_score'] = df['_quality_score'].clip(0, 100)
        
        self._log_operation("quality_assessment", len(df))
        return df
    
    def _generate_synthetic_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Generate synthetic data for missing values"""
        # This would use advanced generation techniques in production
        synthetic_count = df.isnull().sum().sum()
        
        # Simple interpolation for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            df[col] = df[col].interpolate(method='linear', limit_direction='both')
        
        self._log_operation("synthetic_generation", synthetic_count)
        return df
    
    def _resolve_entities(self, df: pd.DataFrame) -> pd.DataFrame:
        """Resolve entities across different representations"""
        # This would use entity resolution algorithms in production
        self._log_operation("entity_resolution", 0)
        return df
    
    def _semantic_validation(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate semantic relationships in data"""
        # This would use semantic analysis in production
        self._log_operation("semantic_validation", 0)
        return df
    
    async def _apply_compliance(self, df: pd.DataFrame, config: CleaningConfig) -> pd.DataFrame:
        """Apply compliance standards to data"""
        
        if config.gdpr_compliant:
            # Apply GDPR compliance
            df = self._apply_gdpr(df)
        
        if config.hipaa_compliant:
            # Apply HIPAA compliance
            df = self._apply_hipaa(df)
        
        if config.pci_compliant:
            # Apply PCI compliance
            df = self._apply_pci(df)
        
        return df
    
    def _apply_gdpr(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply GDPR compliance rules"""
        # Pseudonymize personal identifiers
        pii_columns = self._detect_pii_columns(df)
        for col in pii_columns:
            df[col] = df[col].apply(lambda x: hashlib.sha256(str(x).encode()).hexdigest()[:8] if pd.notna(x) else x)
        
        self._log_operation("gdpr_compliance", len(pii_columns))
        return df
    
    def _apply_hipaa(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply HIPAA compliance rules"""
        # De-identify PHI
        phi_columns = self._detect_phi_columns(df)
        for col in phi_columns:
            df[col] = df[col].apply(lambda x: hashlib.sha256(str(x).encode()).hexdigest()[:8] if pd.notna(x) else x)
        
        self._log_operation("hipaa_compliance", len(phi_columns))
        return df
    
    def _apply_pci(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply PCI compliance rules"""
        # Mask credit card numbers
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].apply(self._mask_credit_card)
        
        self._log_operation("pci_compliance", 1)
        return df
    
    def _detect_pii_columns(self, df: pd.DataFrame) -> List[str]:
        """Detect PII columns"""
        pii_patterns = ['name', 'email', 'phone', 'address', 'ssn', 'dob']
        pii_cols = []
        
        for col in df.columns:
            col_lower = col.lower()
            if any(pattern in col_lower for pattern in pii_patterns):
                pii_cols.append(col)
        
        return pii_cols
    
    def _detect_phi_columns(self, df: pd.DataFrame) -> List[str]:
        """Detect PHI columns"""
        phi_patterns = ['patient', 'diagnosis', 'treatment', 'medication', 'medical']
        phi_cols = []
        
        for col in df.columns:
            col_lower = col.lower()
            if any(pattern in col_lower for pattern in phi_patterns):
                phi_cols.append(col)
        
        return phi_cols
    
    def _mask_credit_card(self, value):
        """Mask credit card numbers"""
        if pd.isna(value):
            return value
        
        value_str = str(value)
        # Simple credit card pattern
        if re.match(r'^\d{13,19}$', value_str.replace(' ', '').replace('-', '')):
            return value_str[:4] + '*' * (len(value_str) - 8) + value_str[-4:]
        
        return value
    
    def _load_data(self, file_path: str) -> pd.DataFrame:
        """Load data from various formats"""
        ext = Path(file_path).suffix.lower()
        
        if ext == '.csv':
            return pd.read_csv(file_path)
        elif ext in ['.xlsx', '.xls']:
            return pd.read_excel(file_path)
        elif ext == '.json':
            return pd.read_json(file_path)
        elif ext == '.parquet':
            return pd.read_parquet(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")
    
    def _save_data(self, df: pd.DataFrame, output_path: str):
        """Save cleaned data"""
        ext = Path(output_path).suffix.lower()
        
        # Remove any temporary columns
        temp_cols = [col for col in df.columns if col.startswith('_')]
        df = df.drop(columns=temp_cols, errors='ignore')
        
        if ext == '.csv':
            df.to_csv(output_path, index=False)
        elif ext in ['.xlsx', '.xls']:
            df.to_excel(output_path, index=False)
        elif ext == '.json':
            df.to_json(output_path, orient='records', indent=2)
        elif ext == '.parquet':
            df.to_parquet(output_path, index=False)
    
    def _log_operation(self, operation: str, count: int):
        """Log cleaning operation"""
        if "operations_performed" not in self.cleaning_report:
            self.cleaning_report["operations_performed"] = []
        
        self.cleaning_report["operations_performed"].append({
            "operation": operation,
            "records_affected": count,
            "timestamp": datetime.now().isoformat()
        })