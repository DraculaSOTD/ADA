"""
Enhanced Data Validation Service for Model Editor
Provides comprehensive data validation, file processing, and quality analysis
"""

import pandas as pd
import numpy as np
import io
import json
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
import chardet
import logging

logger = logging.getLogger(__name__)

class DataType(Enum):
    NUMERICAL = "numerical"
    CATEGORICAL = "categorical"
    TEXT = "text"
    DATETIME = "datetime"
    BOOLEAN = "boolean"
    UNKNOWN = "unknown"

class DataQualityIssue(Enum):
    MISSING_VALUES = "missing_values"
    DUPLICATES = "duplicates"
    OUTLIERS = "outliers"
    INCONSISTENT_FORMAT = "inconsistent_format"
    LOW_VARIANCE = "low_variance"
    HIGH_CARDINALITY = "high_cardinality"
    MEMORY_WARNING = "memory_warning"

@dataclass
class ColumnAnalysis:
    name: str
    data_type: DataType
    missing_count: int
    missing_percentage: float
    unique_count: int
    cardinality_ratio: float
    statistics: Dict[str, Any]
    sample_values: List[Any]
    quality_issues: List[DataQualityIssue]
    recommendations: List[str]

@dataclass
class DataValidationResult:
    is_valid: bool
    total_rows: int
    total_columns: int
    file_size_mb: float
    encoding: str
    columns: List[ColumnAnalysis]
    overall_quality_score: float
    data_preview: List[Dict[str, Any]]
    quality_issues: List[DataQualityIssue]
    recommendations: List[str]
    processing_time_seconds: float

class DataValidationService:
    def __init__(self):
        self.max_file_size_mb = 500  # 500MB limit
        self.max_columns = 1000
        self.max_rows_preview = 1000
        self.min_quality_score = 0.6
        
    def validate_file(self, file_content: bytes, filename: str) -> DataValidationResult:
        """
        Comprehensive file validation and analysis
        """
        import time
        start_time = time.time()
        
        try:
            # File size check
            file_size_mb = len(file_content) / (1024 * 1024)
            if file_size_mb > self.max_file_size_mb:
                return self._create_error_result(
                    f"File size ({file_size_mb:.1f}MB) exceeds maximum allowed size ({self.max_file_size_mb}MB)",
                    processing_time_seconds=time.time() - start_time
                )
            
            # Detect encoding
            encoding_result = chardet.detect(file_content)
            encoding = encoding_result.get('encoding', 'utf-8')
            confidence = encoding_result.get('confidence', 0)
            
            if confidence < 0.7:
                logger.warning(f"Low encoding confidence ({confidence}) for file {filename}")
            
            # Parse file based on extension
            try:
                df = self._parse_file(file_content, filename, encoding)
            except Exception as e:
                return self._create_error_result(
                    f"Failed to parse file: {str(e)}",
                    processing_time_seconds=time.time() - start_time
                )
            
            # Basic structure validation
            if df.empty:
                return self._create_error_result(
                    "File appears to be empty or contains no valid data",
                    processing_time_seconds=time.time() - start_time
                )
            
            if len(df.columns) > self.max_columns:
                return self._create_error_result(
                    f"Too many columns ({len(df.columns)}). Maximum allowed: {self.max_columns}",
                    processing_time_seconds=time.time() - start_time
                )
            
            # Perform comprehensive analysis
            columns_analysis = []
            overall_issues = []
            
            for column in df.columns:
                analysis = self._analyze_column(df[column], column)
                columns_analysis.append(analysis)
                overall_issues.extend(analysis.quality_issues)
            
            # Calculate overall quality score
            quality_score = self._calculate_quality_score(columns_analysis, df)
            
            # Generate data preview
            preview_df = df.head(self.max_rows_preview)
            data_preview = preview_df.to_dict('records')
            
            # Generate overall recommendations
            recommendations = self._generate_recommendations(columns_analysis, df, quality_score)
            
            # Check for memory warnings
            if file_size_mb > 100:
                overall_issues.append(DataQualityIssue.MEMORY_WARNING)
                recommendations.append("Large dataset detected. Consider using data sampling for faster training.")
            
            processing_time = time.time() - start_time
            
            return DataValidationResult(
                is_valid=quality_score >= self.min_quality_score,
                total_rows=len(df),
                total_columns=len(df.columns),
                file_size_mb=file_size_mb,
                encoding=encoding,
                columns=columns_analysis,
                overall_quality_score=quality_score,
                data_preview=data_preview,
                quality_issues=list(set(overall_issues)),
                recommendations=recommendations,
                processing_time_seconds=processing_time
            )
            
        except Exception as e:
            logger.error(f"Validation error for {filename}: {str(e)}")
            return self._create_error_result(
                f"Unexpected error during validation: {str(e)}",
                processing_time_seconds=time.time() - start_time
            )
    
    def _parse_file(self, file_content: bytes, filename: str, encoding: str) -> pd.DataFrame:
        """Parse file content into pandas DataFrame"""
        file_extension = filename.lower().split('.')[-1]
        
        if file_extension == 'csv':
            return self._parse_csv(file_content, encoding)
        elif file_extension in ['xlsx', 'xls']:
            return self._parse_excel(file_content)
        elif file_extension == 'json':
            return self._parse_json(file_content, encoding)
        elif file_extension in ['tsv', 'txt']:
            return self._parse_delimited(file_content, encoding, delimiter='\t')
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
    
    def _parse_csv(self, file_content: bytes, encoding: str) -> pd.DataFrame:
        """Parse CSV with intelligent delimiter detection"""
        text_content = file_content.decode(encoding)
        
        # Try different delimiters
        delimiters = [',', ';', '\t', '|']
        best_df = None
        best_score = 0
        
        for delimiter in delimiters:
            try:
                df = pd.read_csv(io.StringIO(text_content), delimiter=delimiter, low_memory=False)
                # Score based on number of columns and non-null values
                score = len(df.columns) * (1 - df.isnull().sum().sum() / (len(df) * len(df.columns)))
                if score > best_score:
                    best_score = score
                    best_df = df
            except:
                continue
        
        if best_df is None:
            raise ValueError("Could not parse CSV with any standard delimiter")
        
        return best_df
    
    def _parse_excel(self, file_content: bytes) -> pd.DataFrame:
        """Parse Excel files"""
        return pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
    
    def _parse_json(self, file_content: bytes, encoding: str) -> pd.DataFrame:
        """Parse JSON files"""
        text_content = file_content.decode(encoding)
        data = json.loads(text_content)
        
        if isinstance(data, list):
            return pd.DataFrame(data)
        elif isinstance(data, dict):
            # Try to find the main data array
            for key, value in data.items():
                if isinstance(value, list) and len(value) > 0:
                    return pd.DataFrame(value)
            return pd.DataFrame([data])
        else:
            raise ValueError("JSON format not supported for tabular data")
    
    def _parse_delimited(self, file_content: bytes, encoding: str, delimiter: str) -> pd.DataFrame:
        """Parse tab-delimited or other delimited files"""
        text_content = file_content.decode(encoding)
        return pd.read_csv(io.StringIO(text_content), delimiter=delimiter, low_memory=False)
    
    def _analyze_column(self, series: pd.Series, column_name: str) -> ColumnAnalysis:
        """Comprehensive analysis of a single column"""
        issues = []
        recommendations = []
        
        # Basic statistics
        total_count = len(series)
        missing_count = series.isnull().sum()
        missing_percentage = (missing_count / total_count) * 100
        unique_count = series.nunique()
        cardinality_ratio = unique_count / total_count
        
        # Detect data type
        data_type = self._detect_data_type(series)
        
        # Calculate statistics based on data type
        statistics = self._calculate_column_statistics(series, data_type)
        
        # Get sample values (non-null)
        sample_values = series.dropna().head(10).tolist()
        
        # Identify quality issues
        if missing_percentage > 50:
            issues.append(DataQualityIssue.MISSING_VALUES)
            recommendations.append(f"High missing values ({missing_percentage:.1f}%). Consider imputation or removal.")
        elif missing_percentage > 20:
            issues.append(DataQualityIssue.MISSING_VALUES)
            recommendations.append(f"Moderate missing values ({missing_percentage:.1f}%). Consider imputation.")
        
        if cardinality_ratio > 0.9 and unique_count > 100:
            issues.append(DataQualityIssue.HIGH_CARDINALITY)
            recommendations.append("High cardinality detected. Consider feature engineering or dimensionality reduction.")
        
        if data_type == DataType.NUMERICAL:
            # Check for outliers using IQR method
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            outlier_threshold = 1.5 * IQR
            outliers = ((series < (Q1 - outlier_threshold)) | (series > (Q3 + outlier_threshold))).sum()
            
            if outliers > total_count * 0.05:  # More than 5% outliers
                issues.append(DataQualityIssue.OUTLIERS)
                recommendations.append(f"Detected {outliers} potential outliers. Consider outlier treatment.")
            
            # Check for low variance
            if series.std() < 0.01:
                issues.append(DataQualityIssue.LOW_VARIANCE)
                recommendations.append("Low variance detected. This column may not be useful for modeling.")
        
        # Check for duplicates in the entire column
        duplicate_count = total_count - unique_count
        if duplicate_count > total_count * 0.8:
            issues.append(DataQualityIssue.DUPLICATES)
            recommendations.append("High number of duplicate values detected.")
        
        return ColumnAnalysis(
            name=column_name,
            data_type=data_type,
            missing_count=missing_count,
            missing_percentage=missing_percentage,
            unique_count=unique_count,
            cardinality_ratio=cardinality_ratio,
            statistics=statistics,
            sample_values=sample_values,
            quality_issues=issues,
            recommendations=recommendations
        )
    
    def _detect_data_type(self, series: pd.Series) -> DataType:
        """Detect the most appropriate data type for a series"""
        # Remove null values for analysis
        clean_series = series.dropna()
        
        if len(clean_series) == 0:
            return DataType.UNKNOWN
        
        # Check for boolean
        if clean_series.dtype == 'bool' or set(clean_series.unique()) <= {0, 1, True, False, 'true', 'false', 'True', 'False'}:
            return DataType.BOOLEAN
        
        # Check for numerical
        if pd.api.types.is_numeric_dtype(clean_series):
            return DataType.NUMERICAL
        
        # Try to convert to numeric
        try:
            pd.to_numeric(clean_series)
            return DataType.NUMERICAL
        except:
            pass
        
        # Check for datetime
        try:
            pd.to_datetime(clean_series, infer_datetime_format=True)
            return DataType.DATETIME
        except:
            pass
        
        # Check if categorical (low cardinality relative to total count)
        unique_ratio = len(clean_series.unique()) / len(clean_series)
        if unique_ratio < 0.1 or len(clean_series.unique()) < 20:
            return DataType.CATEGORICAL
        
        # Default to text
        return DataType.TEXT
    
    def _calculate_column_statistics(self, series: pd.Series, data_type: DataType) -> Dict[str, Any]:
        """Calculate appropriate statistics based on data type"""
        stats = {}
        clean_series = series.dropna()
        
        if data_type == DataType.NUMERICAL:
            try:
                numeric_series = pd.to_numeric(clean_series, errors='coerce').dropna()
                stats.update({
                    'mean': float(numeric_series.mean()),
                    'median': float(numeric_series.median()),
                    'std': float(numeric_series.std()),
                    'min': float(numeric_series.min()),
                    'max': float(numeric_series.max()),
                    'q25': float(numeric_series.quantile(0.25)),
                    'q75': float(numeric_series.quantile(0.75)),
                    'skewness': float(numeric_series.skew()),
                    'kurtosis': float(numeric_series.kurtosis())
                })
            except:
                stats['error'] = 'Could not calculate numerical statistics'
        
        elif data_type == DataType.CATEGORICAL:
            value_counts = clean_series.value_counts()
            stats.update({
                'most_frequent': str(value_counts.index[0]) if len(value_counts) > 0 else None,
                'most_frequent_count': int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
                'category_distribution': value_counts.head(10).to_dict()
            })
        
        elif data_type == DataType.TEXT:
            text_lengths = clean_series.astype(str).str.len()
            stats.update({
                'avg_length': float(text_lengths.mean()),
                'min_length': int(text_lengths.min()),
                'max_length': int(text_lengths.max()),
                'empty_strings': int((clean_series == '').sum())
            })
        
        elif data_type == DataType.DATETIME:
            try:
                dt_series = pd.to_datetime(clean_series, infer_datetime_format=True)
                stats.update({
                    'earliest': str(dt_series.min()),
                    'latest': str(dt_series.max()),
                    'date_range_days': (dt_series.max() - dt_series.min()).days
                })
            except:
                stats['error'] = 'Could not parse datetime values'
        
        return stats
    
    def _calculate_quality_score(self, columns_analysis: List[ColumnAnalysis], df: pd.DataFrame) -> float:
        """Calculate overall data quality score (0-1)"""
        if not columns_analysis:
            return 0.0
        
        # Factors for quality scoring
        completeness_scores = []
        issue_penalties = 0
        
        for col in columns_analysis:
            # Completeness score (1 - missing_percentage/100)
            completeness_scores.append(1 - col.missing_percentage / 100)
            
            # Penalties for quality issues
            issue_penalties += len(col.quality_issues) * 0.1
        
        # Average completeness
        avg_completeness = np.mean(completeness_scores)
        
        # Duplicate rows penalty
        duplicate_rows = df.duplicated().sum()
        duplicate_penalty = min(0.3, (duplicate_rows / len(df)) * 0.5)
        
        # Calculate final score
        quality_score = max(0, avg_completeness - issue_penalties - duplicate_penalty)
        
        return min(1.0, quality_score)
    
    def _generate_recommendations(self, columns_analysis: List[ColumnAnalysis], df: pd.DataFrame, quality_score: float) -> List[str]:
        """Generate overall recommendations for data improvement"""
        recommendations = []
        
        if quality_score < 0.7:
            recommendations.append("Overall data quality is below recommended threshold. Consider data cleaning.")
        
        # Check for duplicate rows
        duplicate_rows = df.duplicated().sum()
        if duplicate_rows > 0:
            recommendations.append(f"Found {duplicate_rows} duplicate rows. Consider removing duplicates.")
        
        # Check column distribution
        numerical_cols = [col for col in columns_analysis if col.data_type == DataType.NUMERICAL]
        categorical_cols = [col for col in columns_analysis if col.data_type == DataType.CATEGORICAL]
        
        if len(numerical_cols) == 0:
            recommendations.append("No numerical columns detected. Ensure you have quantitative features for modeling.")
        
        if len(categorical_cols) > len(numerical_cols) * 2:
            recommendations.append("High proportion of categorical columns. Consider feature engineering or encoding strategies.")
        
        # Memory optimization
        if len(df) > 100000:
            recommendations.append("Large dataset detected. Consider sampling for initial model development.")
        
        return recommendations
    
    def _create_error_result(self, error_message: str, processing_time_seconds: float) -> DataValidationResult:
        """Create a validation result for error cases"""
        return DataValidationResult(
            is_valid=False,
            total_rows=0,
            total_columns=0,
            file_size_mb=0,
            encoding="unknown",
            columns=[],
            overall_quality_score=0.0,
            data_preview=[],
            quality_issues=[],
            recommendations=[error_message],
            processing_time_seconds=processing_time_seconds
        )

# Convenience function for external use
def validate_uploaded_file(file_content: bytes, filename: str) -> DataValidationResult:
    """
    Convenience function to validate an uploaded file
    """
    service = DataValidationService()
    return service.validate_file(file_content, filename)