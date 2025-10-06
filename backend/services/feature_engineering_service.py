"""
Automated Feature Engineering Service
Provides intelligent feature engineering options based on data analysis
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from sklearn.preprocessing import (
    StandardScaler, MinMaxScaler, RobustScaler, PowerTransformer,
    LabelEncoder, OneHotEncoder, OrdinalEncoder
)
from sklearn.feature_selection import (
    SelectKBest, f_classif, f_regression, mutual_info_classif, 
    mutual_info_regression, RFE, SelectFromModel
)
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LassoCV
import warnings
warnings.filterwarnings('ignore')

class FeatureEngineeringService:
    def __init__(self):
        self.feature_transformers = {}
        self.feature_selectors = {}
        self.generated_features = {}
        
    def analyze_data_for_feature_engineering(self, df: pd.DataFrame, target_column: str = None) -> Dict[str, Any]:
        """
        Analyze dataset and suggest feature engineering strategies
        """
        analysis = {
            "data_info": {
                "shape": df.shape,
                "memory_usage": df.memory_usage(deep=True).sum(),
                "dtypes": df.dtypes.to_dict()
            },
            "feature_analysis": {},
            "suggestions": {
                "encoding": [],
                "scaling": [],
                "feature_creation": [],
                "feature_selection": [],
                "dimensionality_reduction": []
            },
            "estimated_impact": {
                "potential_new_features": 0,
                "complexity_score": 0
            }
        }
        
        # Analyze each column
        for column in df.columns:
            if column == target_column:
                continue
                
            col_analysis = self._analyze_column(df[column])
            analysis["feature_analysis"][column] = col_analysis
            
            # Generate suggestions based on column analysis
            self._generate_column_suggestions(column, col_analysis, analysis["suggestions"])
        
        # Analyze relationships between features
        self._analyze_feature_relationships(df, target_column, analysis)
        
        # Calculate complexity and potential impact
        analysis["estimated_impact"] = self._calculate_impact_metrics(df, analysis["suggestions"])
        
        return analysis
    
    def _analyze_column(self, series: pd.Series) -> Dict[str, Any]:
        """Analyze individual column characteristics"""
        analysis = {
            "dtype": str(series.dtype),
            "null_count": series.isnull().sum(),
            "null_percentage": (series.isnull().sum() / len(series)) * 100,
            "unique_count": series.nunique(),
            "unique_percentage": (series.nunique() / len(series)) * 100
        }
        
        if pd.api.types.is_numeric_dtype(series):
            analysis.update({
                "min": series.min(),
                "max": series.max(),
                "mean": series.mean(),
                "std": series.std(),
                "skewness": series.skew(),
                "kurtosis": series.kurtosis(),
                "zeros_count": (series == 0).sum(),
                "outliers_count": self._count_outliers(series)
            })
        elif pd.api.types.is_categorical_dtype(series) or pd.api.types.is_object_dtype(series):
            analysis.update({
                "most_frequent": series.mode().iloc[0] if not series.mode().empty else None,
                "most_frequent_count": series.value_counts().iloc[0] if not series.value_counts().empty else 0,
                "value_counts": series.value_counts().head(10).to_dict()
            })
        elif pd.api.types.is_datetime64_any_dtype(series):
            analysis.update({
                "min_date": series.min(),
                "max_date": series.max(),
                "date_range_days": (series.max() - series.min()).days if series.notna().any() else 0
            })
        
        return analysis
    
    def _count_outliers(self, series: pd.Series) -> int:
        """Count outliers using IQR method"""
        Q1 = series.quantile(0.25)
        Q3 = series.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        return ((series < lower_bound) | (series > upper_bound)).sum()
    
    def _generate_column_suggestions(self, column: str, analysis: Dict, suggestions: Dict):
        """Generate feature engineering suggestions for a column"""
        
        # Encoding suggestions
        if analysis["dtype"] in ["object", "category"]:
            unique_ratio = analysis["unique_percentage"]
            unique_count = analysis["unique_count"]
            
            if unique_count <= 10:
                suggestions["encoding"].append({
                    "type": "one_hot",
                    "column": column,
                    "reason": f"Low cardinality ({unique_count} unique values) - suitable for one-hot encoding",
                    "estimated_new_features": unique_count - 1
                })
            elif unique_count <= 50:
                suggestions["encoding"].append({
                    "type": "label",
                    "column": column,
                    "reason": f"Medium cardinality ({unique_count} unique values) - label encoding recommended",
                    "estimated_new_features": 0
                })
            else:
                suggestions["encoding"].append({
                    "type": "target",
                    "column": column,
                    "reason": f"High cardinality ({unique_count} unique values) - target encoding recommended",
                    "estimated_new_features": 0
                })
        
        # Scaling suggestions
        elif analysis["dtype"] in ["int64", "float64"]:
            if analysis.get("std", 0) > analysis.get("mean", 0) * 2:
                suggestions["scaling"].append({
                    "type": "robust",
                    "column": column,
                    "reason": f"High variance (std: {analysis.get('std', 0):.2f}) - robust scaling recommended"
                })
            elif abs(analysis.get("skewness", 0)) > 2:
                suggestions["scaling"].append({
                    "type": "power_transform",
                    "column": column,
                    "reason": f"High skewness ({analysis.get('skewness', 0):.2f}) - power transform recommended"
                })
            elif analysis.get("min", 0) >= 0:
                suggestions["scaling"].append({
                    "type": "minmax",
                    "column": column,
                    "reason": "Non-negative values - min-max scaling suitable"
                })
            else:
                suggestions["scaling"].append({
                    "type": "standard",
                    "column": column,
                    "reason": "Standard scaling recommended for normal distribution"
                })
        
        # Feature creation suggestions
        if analysis["dtype"] == "datetime64[ns]":
            suggestions["feature_creation"].append({
                "type": "datetime_features",
                "column": column,
                "reason": "Datetime column - extract temporal features",
                "estimated_new_features": 6  # year, month, day, hour, dayofweek, quarter
            })
        
        if analysis["dtype"] in ["int64", "float64"]:
            if analysis.get("skewness", 0) != 0:
                suggestions["feature_creation"].append({
                    "type": "polynomial",
                    "column": column,
                    "reason": f"Numeric column with skewness - polynomial features may help",
                    "estimated_new_features": 2  # square, cube
                })
    
    def _analyze_feature_relationships(self, df: pd.DataFrame, target_column: str, analysis: Dict):
        """Analyze relationships between features"""
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_columns) > 1:
            # Correlation analysis
            corr_matrix = df[numeric_columns].corr().abs()
            
            # Find highly correlated pairs
            high_corr_pairs = []
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    if corr_matrix.iloc[i, j] > 0.8:
                        high_corr_pairs.append((
                            corr_matrix.columns[i], 
                            corr_matrix.columns[j], 
                            corr_matrix.iloc[i, j]
                        ))
            
            if high_corr_pairs:
                analysis["suggestions"]["feature_selection"].append({
                    "type": "correlation_filter",
                    "reason": f"Found {len(high_corr_pairs)} highly correlated feature pairs",
                    "details": high_corr_pairs[:5]  # Show top 5
                })
        
        # Suggest feature selection methods
        if len(df.columns) > 50:
            analysis["suggestions"]["feature_selection"].extend([
                {
                    "type": "variance_threshold",
                    "reason": f"Many features ({len(df.columns)}) - remove low variance features"
                },
                {
                    "type": "univariate_selection",
                    "reason": "Statistical feature selection recommended for high-dimensional data"
                }
            ])
        
        # Dimensionality reduction suggestions
        if len(numeric_columns) > 20:
            analysis["suggestions"]["dimensionality_reduction"].append({
                "type": "pca",
                "reason": f"Many numeric features ({len(numeric_columns)}) - PCA could reduce dimensionality",
                "estimated_components": min(len(numeric_columns) // 2, 50)
            })
    
    def _calculate_impact_metrics(self, df: pd.DataFrame, suggestions: Dict) -> Dict[str, Any]:
        """Calculate estimated impact of feature engineering"""
        potential_features = df.shape[1]
        
        # Count potential new features
        for category in suggestions.values():
            for suggestion in category:
                potential_features += suggestion.get("estimated_new_features", 0)
        
        # Calculate complexity score (0-100)
        complexity_score = min(100, (
            len(suggestions["encoding"]) * 10 +
            len(suggestions["scaling"]) * 5 +
            len(suggestions["feature_creation"]) * 15 +
            len(suggestions["feature_selection"]) * 8 +
            len(suggestions["dimensionality_reduction"]) * 20
        ))
        
        return {
            "potential_new_features": potential_features - df.shape[1],
            "complexity_score": complexity_score,
            "estimated_processing_time": self._estimate_processing_time(df.shape, suggestions)
        }
    
    def _estimate_processing_time(self, shape: Tuple[int, int], suggestions: Dict) -> str:
        """Estimate processing time based on data size and operations"""
        rows, cols = shape
        
        # Base time calculation (rough estimates)
        base_time = (rows * cols) / 100000  # seconds
        
        operation_multipliers = {
            "encoding": 1.5,
            "scaling": 1.2,
            "feature_creation": 2.0,
            "feature_selection": 3.0,
            "dimensionality_reduction": 4.0
        }
        
        total_time = base_time
        for category, multiplier in operation_multipliers.items():
            total_time += base_time * multiplier * len(suggestions.get(category, []))
        
        if total_time < 60:
            return f"{int(total_time)} seconds"
        elif total_time < 3600:
            return f"{int(total_time // 60)} minutes"
        else:
            return f"{int(total_time // 3600)} hours"
    
    def apply_feature_engineering(
        self, 
        df: pd.DataFrame, 
        operations: List[Dict[str, Any]], 
        target_column: str = None
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Apply selected feature engineering operations
        """
        result_df = df.copy()
        applied_operations = []
        transformation_info = {}
        
        for operation in operations:
            try:
                operation_type = operation["type"]
                
                if operation_type == "one_hot":
                    result_df, info = self._apply_one_hot_encoding(result_df, operation)
                elif operation_type == "label":
                    result_df, info = self._apply_label_encoding(result_df, operation)
                elif operation_type == "target":
                    result_df, info = self._apply_target_encoding(result_df, operation, target_column)
                elif operation_type == "standard":
                    result_df, info = self._apply_standard_scaling(result_df, operation)
                elif operation_type == "minmax":
                    result_df, info = self._apply_minmax_scaling(result_df, operation)
                elif operation_type == "robust":
                    result_df, info = self._apply_robust_scaling(result_df, operation)
                elif operation_type == "power_transform":
                    result_df, info = self._apply_power_transform(result_df, operation)
                elif operation_type == "datetime_features":
                    result_df, info = self._create_datetime_features(result_df, operation)
                elif operation_type == "polynomial":
                    result_df, info = self._create_polynomial_features(result_df, operation)
                elif operation_type == "correlation_filter":
                    result_df, info = self._apply_correlation_filter(result_df, operation)
                elif operation_type == "variance_threshold":
                    result_df, info = self._apply_variance_threshold(result_df, operation)
                elif operation_type == "univariate_selection":
                    result_df, info = self._apply_univariate_selection(result_df, operation, target_column)
                elif operation_type == "pca":
                    result_df, info = self._apply_pca(result_df, operation)
                else:
                    continue
                
                applied_operations.append(operation)
                transformation_info[f"{operation_type}_{operation.get('column', 'global')}"] = info
                
            except Exception as e:
                print(f"Error applying {operation_type}: {str(e)}")
                continue
        
        return result_df, {
            "applied_operations": applied_operations,
            "transformation_info": transformation_info,
            "original_shape": df.shape,
            "final_shape": result_df.shape,
            "features_added": result_df.shape[1] - df.shape[1],
            "features_removed": max(0, df.shape[1] - result_df.shape[1])
        }
    
    def _apply_one_hot_encoding(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Apply one-hot encoding"""
        column = operation["column"]
        
        # Get dummy variables
        dummies = pd.get_dummies(df[column], prefix=column, drop_first=True)
        
        # Add to dataframe and remove original
        result_df = pd.concat([df.drop(column, axis=1), dummies], axis=1)
        
        info = {
            "original_column": column,
            "new_columns": dummies.columns.tolist(),
            "unique_values": df[column].nunique()
        }
        
        return result_df, info
    
    def _apply_label_encoding(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Apply label encoding"""
        column = operation["column"]
        
        encoder = LabelEncoder()
        result_df = df.copy()
        result_df[column] = encoder.fit_transform(df[column].astype(str))
        
        self.feature_transformers[f"label_{column}"] = encoder
        
        info = {
            "column": column,
            "classes": encoder.classes_.tolist(),
            "n_classes": len(encoder.classes_)
        }
        
        return result_df, info
    
    def _apply_target_encoding(self, df: pd.DataFrame, operation: Dict, target_column: str) -> Tuple[pd.DataFrame, Dict]:
        """Apply target encoding (mean encoding)"""
        column = operation["column"]
        
        if target_column is None or target_column not in df.columns:
            # Fallback to label encoding
            return self._apply_label_encoding(df, operation)
        
        result_df = df.copy()
        target_means = df.groupby(column)[target_column].mean()
        result_df[f"{column}_target_encoded"] = df[column].map(target_means)
        result_df = result_df.drop(column, axis=1)
        
        info = {
            "original_column": column,
            "new_column": f"{column}_target_encoded",
            "target_column": target_column,
            "unique_mappings": len(target_means)
        }
        
        return result_df, info
    
    def _apply_standard_scaling(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Apply standard scaling"""
        column = operation["column"]
        
        scaler = StandardScaler()
        result_df = df.copy()
        result_df[column] = scaler.fit_transform(df[[column]])
        
        self.feature_transformers[f"standard_{column}"] = scaler
        
        info = {
            "column": column,
            "mean": scaler.mean_[0],
            "scale": scaler.scale_[0]
        }
        
        return result_df, info
    
    def _apply_minmax_scaling(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Apply min-max scaling"""
        column = operation["column"]
        
        scaler = MinMaxScaler()
        result_df = df.copy()
        result_df[column] = scaler.fit_transform(df[[column]])
        
        self.feature_transformers[f"minmax_{column}"] = scaler
        
        info = {
            "column": column,
            "min": scaler.data_min_[0],
            "max": scaler.data_max_[0]
        }
        
        return result_df, info
    
    def _apply_robust_scaling(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Apply robust scaling"""
        column = operation["column"]
        
        scaler = RobustScaler()
        result_df = df.copy()
        result_df[column] = scaler.fit_transform(df[[column]])
        
        self.feature_transformers[f"robust_{column}"] = scaler
        
        info = {
            "column": column,
            "center": scaler.center_[0],
            "scale": scaler.scale_[0]
        }
        
        return result_df, info
    
    def _apply_power_transform(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Apply power transformation"""
        column = operation["column"]
        
        # Ensure positive values for power transform
        min_val = df[column].min()
        if min_val <= 0:
            shift = abs(min_val) + 1
            data = df[column] + shift
        else:
            shift = 0
            data = df[column]
        
        transformer = PowerTransformer(method='yeo-johnson')
        result_df = df.copy()
        result_df[column] = transformer.fit_transform(data.values.reshape(-1, 1)).flatten()
        
        self.feature_transformers[f"power_{column}"] = (transformer, shift)
        
        info = {
            "column": column,
            "shift_applied": shift,
            "lambda": transformer.lambdas_[0] if hasattr(transformer, 'lambdas_') else None
        }
        
        return result_df, info
    
    def _create_datetime_features(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Create datetime features"""
        column = operation["column"]
        
        result_df = df.copy()
        dt_series = pd.to_datetime(df[column])
        
        # Create new features
        new_features = {
            f"{column}_year": dt_series.dt.year,
            f"{column}_month": dt_series.dt.month,
            f"{column}_day": dt_series.dt.day,
            f"{column}_dayofweek": dt_series.dt.dayofweek,
            f"{column}_hour": dt_series.dt.hour,
            f"{column}_quarter": dt_series.dt.quarter
        }
        
        for feature_name, feature_data in new_features.items():
            result_df[feature_name] = feature_data
        
        # Remove original datetime column
        result_df = result_df.drop(column, axis=1)
        
        info = {
            "original_column": column,
            "new_features": list(new_features.keys()),
            "date_range": (dt_series.min(), dt_series.max())
        }
        
        return result_df, info
    
    def _create_polynomial_features(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Create polynomial features"""
        column = operation["column"]
        
        result_df = df.copy()
        
        # Create polynomial features
        result_df[f"{column}_squared"] = df[column] ** 2
        result_df[f"{column}_cubed"] = df[column] ** 3
        
        info = {
            "original_column": column,
            "new_features": [f"{column}_squared", f"{column}_cubed"]
        }
        
        return result_df, info
    
    def _apply_correlation_filter(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Remove highly correlated features"""
        threshold = operation.get("threshold", 0.8)
        
        # Calculate correlation matrix for numeric columns only
        numeric_df = df.select_dtypes(include=[np.number])
        corr_matrix = numeric_df.corr().abs()
        
        # Find highly correlated pairs and remove one from each pair
        upper_triangle = corr_matrix.where(
            np.triu(np.ones(corr_matrix.shape), k=1).astype(bool)
        )
        
        to_drop = [column for column in upper_triangle.columns if any(upper_triangle[column] > threshold)]
        
        result_df = df.drop(columns=to_drop)
        
        info = {
            "removed_columns": to_drop,
            "threshold": threshold,
            "original_features": len(df.columns),
            "remaining_features": len(result_df.columns)
        }
        
        return result_df, info
    
    def _apply_variance_threshold(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Remove low variance features"""
        from sklearn.feature_selection import VarianceThreshold
        
        threshold = operation.get("threshold", 0.01)
        
        # Apply only to numeric columns
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        non_numeric_columns = df.select_dtypes(exclude=[np.number]).columns
        
        if len(numeric_columns) == 0:
            return df, {"message": "No numeric columns to apply variance threshold"}
        
        selector = VarianceThreshold(threshold=threshold)
        selected_data = selector.fit_transform(df[numeric_columns])
        
        selected_columns = numeric_columns[selector.get_support()]
        removed_columns = numeric_columns[~selector.get_support()]
        
        # Combine selected numeric columns with non-numeric columns
        result_df = pd.concat([
            pd.DataFrame(selected_data, columns=selected_columns, index=df.index),
            df[non_numeric_columns]
        ], axis=1)
        
        info = {
            "removed_columns": removed_columns.tolist(),
            "threshold": threshold,
            "variances": dict(zip(numeric_columns, selector.variances_))
        }
        
        return result_df, info
    
    def _apply_univariate_selection(self, df: pd.DataFrame, operation: Dict, target_column: str) -> Tuple[pd.DataFrame, Dict]:
        """Apply univariate feature selection"""
        if target_column is None or target_column not in df.columns:
            return df, {"error": "Target column required for univariate selection"}
        
        k = operation.get("k", min(10, len(df.columns) - 1))
        
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Use appropriate scoring function
        if pd.api.types.is_numeric_dtype(y):
            score_func = f_regression
        else:
            score_func = f_classif
        
        selector = SelectKBest(score_func=score_func, k=k)
        X_selected = selector.fit_transform(X, y)
        
        selected_columns = X.columns[selector.get_support()]
        result_df = pd.concat([
            pd.DataFrame(X_selected, columns=selected_columns, index=df.index),
            df[[target_column]]
        ], axis=1)
        
        info = {
            "selected_features": selected_columns.tolist(),
            "scores": dict(zip(X.columns, selector.scores_)),
            "k": k
        }
        
        return result_df, info
    
    def _apply_pca(self, df: pd.DataFrame, operation: Dict) -> Tuple[pd.DataFrame, Dict]:
        """Apply Principal Component Analysis"""
        n_components = operation.get("n_components", min(10, len(df.select_dtypes(include=[np.number]).columns)))
        
        # Apply only to numeric columns
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        non_numeric_columns = df.select_dtypes(exclude=[np.number]).columns
        
        if len(numeric_columns) < 2:
            return df, {"error": "Need at least 2 numeric columns for PCA"}
        
        pca = PCA(n_components=n_components)
        pca_data = pca.fit_transform(df[numeric_columns])
        
        # Create PCA column names
        pca_columns = [f"PC{i+1}" for i in range(n_components)]
        
        # Combine PCA columns with non-numeric columns
        result_df = pd.concat([
            pd.DataFrame(pca_data, columns=pca_columns, index=df.index),
            df[non_numeric_columns]
        ], axis=1)
        
        self.feature_transformers["pca"] = pca
        
        info = {
            "n_components": n_components,
            "explained_variance_ratio": pca.explained_variance_ratio_.tolist(),
            "cumulative_variance": np.cumsum(pca.explained_variance_ratio_).tolist(),
            "original_features": len(numeric_columns),
            "pca_features": n_components
        }
        
        return result_df, info

# Global service instance
feature_engineering_service = FeatureEngineeringService()