"""
Comprehensive ML Training Pipeline Service
Handles model training with support for multiple algorithms, preprocessing, and optimization
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# ML Libraries
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, LabelEncoder, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.svm import SVC, SVR
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score
from sklearn.feature_selection import SelectKBest, f_classif, f_regression, RFE
import xgboost as xgb

logger = logging.getLogger(__name__)

class TrainingStatus(Enum):
    PENDING = "pending"
    INITIALIZING = "initializing"
    PREPROCESSING = "preprocessing"
    TRAINING = "training"
    EVALUATING = "evaluating"
    COMPLETED = "completed"
    FAILED = "failed"

class ModelType(Enum):
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    TIME_SERIES = "time_series"

@dataclass
class TrainingConfig:
    model_id: str
    user_id: int
    model_name: str
    algorithm: str
    parameters: Dict[str, Any]
    data_config: Dict[str, Any]
    preprocessing_config: Dict[str, Any]
    training_config: Dict[str, Any]
    optimization_config: Dict[str, Any]

@dataclass
class TrainingProgress:
    job_id: str
    status: TrainingStatus
    progress_percentage: float
    current_stage: str
    message: str
    metrics: Dict[str, Any]
    start_time: datetime
    estimated_completion: Optional[datetime] = None
    logs: List[str] = None

@dataclass
class TrainingResult:
    job_id: str
    model_id: str
    success: bool
    model_path: Optional[str]
    metrics: Dict[str, Any]
    feature_importance: Optional[Dict[str, float]]
    preprocessing_steps: List[str]
    training_time_seconds: float
    error_message: Optional[str] = None

class MLTrainingPipeline:
    def __init__(self, models_dir: str = "models", logs_dir: str = "logs"):
        self.models_dir = models_dir
        self.logs_dir = logs_dir
        self.active_jobs = {}
        
        # Create directories if they don't exist
        os.makedirs(models_dir, exist_ok=True)
        os.makedirs(logs_dir, exist_ok=True)
        
        # Algorithm registry
        self.algorithms = {
            # Classification
            'random_forest_clf': RandomForestClassifier,
            'logistic_regression': LogisticRegression,
            'svm_clf': SVC,
            'neural_network_clf': MLPClassifier,
            'xgboost_clf': xgb.XGBClassifier,
            
            # Regression
            'linear_regression': LinearRegression,
            'random_forest_reg': RandomForestRegressor,
            'ridge_regression': Ridge,
            'lasso_regression': Lasso,
            'svm_reg': SVR,
            'neural_network_reg': MLPRegressor,
            'xgboost_reg': xgb.XGBRegressor,
            
            # Clustering
            'kmeans': KMeans,
            'dbscan': DBSCAN
        }
        
        # Preprocessing methods
        self.scalers = {
            'zscore': StandardScaler,
            'minmax': MinMaxScaler,
            'robust': RobustScaler
        }
    
    async def start_training(self, config: TrainingConfig, data: pd.DataFrame) -> str:
        """Start training a model asynchronously"""
        job_id = str(uuid.uuid4())
        
        # Initialize progress tracking
        progress = TrainingProgress(
            job_id=job_id,
            status=TrainingStatus.PENDING,
            progress_percentage=0.0,
            current_stage="initializing",
            message="Training job created",
            metrics={},
            start_time=datetime.now(),
            logs=[]
        )
        
        self.active_jobs[job_id] = progress
        
        # Start training in background
        asyncio.create_task(self._train_model_async(job_id, config, data))
        
        return job_id
    
    async def _train_model_async(self, job_id: str, config: TrainingConfig, data: pd.DataFrame):
        """Internal async method to handle the training process"""
        progress = self.active_jobs[job_id]
        
        try:
            # Stage 1: Initialize
            await self._update_progress(job_id, 5, TrainingStatus.INITIALIZING, "Initializing training pipeline")
            await asyncio.sleep(0.5)  # Simulate initialization time
            
            # Stage 2: Data Preprocessing
            await self._update_progress(job_id, 15, TrainingStatus.PREPROCESSING, "Preprocessing data")
            X, y, preprocessors = await self._preprocess_data(data, config)
            
            # Stage 3: Split data
            await self._update_progress(job_id, 25, TrainingStatus.PREPROCESSING, "Splitting data")
            X_train, X_test, y_train, y_test = self._split_data(X, y, config)
            
            # Stage 4: Feature selection (if enabled)
            if config.optimization_config.get('auto_features', False):
                await self._update_progress(job_id, 35, TrainingStatus.PREPROCESSING, "Selecting features")
                X_train, X_test, feature_selector = await self._select_features(X_train, X_test, y_train, config)
            else:
                feature_selector = None
            
            # Stage 5: Model training
            await self._update_progress(job_id, 45, TrainingStatus.TRAINING, "Training model")
            model = await self._train_model(X_train, y_train, config)
            
            # Stage 6: Hyperparameter optimization (if enabled)
            if config.optimization_config.get('hyperparameter_tuning', False):
                await self._update_progress(job_id, 65, TrainingStatus.TRAINING, "Optimizing hyperparameters")
                model = await self._optimize_hyperparameters(model, X_train, y_train, config)
            
            # Stage 7: Model evaluation
            await self._update_progress(job_id, 80, TrainingStatus.EVALUATING, "Evaluating model performance")
            metrics = await self._evaluate_model(model, X_test, y_test, config)
            
            # Stage 8: Save model
            await self._update_progress(job_id, 95, TrainingStatus.EVALUATING, "Saving model")
            model_path = await self._save_model(job_id, model, preprocessors, feature_selector, config)
            
            # Stage 9: Complete
            feature_importance = self._get_feature_importance(model, X.columns if hasattr(X, 'columns') else None)
            
            result = TrainingResult(
                job_id=job_id,
                model_id=config.model_id,
                success=True,
                model_path=model_path,
                metrics=metrics,
                feature_importance=feature_importance,
                preprocessing_steps=self._get_preprocessing_steps(config),
                training_time_seconds=(datetime.now() - progress.start_time).total_seconds()
            )
            
            await self._update_progress(job_id, 100, TrainingStatus.COMPLETED, "Training completed successfully", metrics)
            progress.result = result
            
        except Exception as e:
            logger.error(f"Training failed for job {job_id}: {str(e)}")
            await self._update_progress(job_id, progress.progress_percentage, TrainingStatus.FAILED, f"Training failed: {str(e)}")
            
            result = TrainingResult(
                job_id=job_id,
                model_id=config.model_id,
                success=False,
                model_path=None,
                metrics={},
                feature_importance=None,
                preprocessing_steps=[],
                training_time_seconds=(datetime.now() - progress.start_time).total_seconds(),
                error_message=str(e)
            )
            progress.result = result
    
    async def _update_progress(self, job_id: str, percentage: float, status: TrainingStatus, message: str, metrics: Dict[str, Any] = None):
        """Update training progress"""
        if job_id not in self.active_jobs:
            return
        
        progress = self.active_jobs[job_id]
        progress.progress_percentage = percentage
        progress.status = status
        progress.message = message
        progress.current_stage = status.value
        
        if metrics:
            progress.metrics.update(metrics)
        
        # Add to logs
        if progress.logs is None:
            progress.logs = []
        progress.logs.append(f"{datetime.now().strftime('%H:%M:%S')} - {message}")
        
        # Estimate completion time
        if percentage > 0:
            elapsed = (datetime.now() - progress.start_time).total_seconds()
            estimated_total = elapsed / (percentage / 100)
            remaining = estimated_total - elapsed
            progress.estimated_completion = datetime.now() + pd.Timedelta(seconds=remaining)
        
        logger.info(f"Job {job_id}: {percentage}% - {message}")
        
        # Send WebSocket update
        try:
            from services.websocket_service import manager
            await manager.send_training_progress(job_id, {
                "progress_percentage": percentage,
                "status": status.value,
                "message": message,
                "current_stage": status.value,
                "metrics": metrics or {},
                "estimated_completion": progress.estimated_completion.isoformat() if progress.estimated_completion else None
            })
        except Exception as e:
            logger.warning(f"Failed to send WebSocket update: {e}")
    
    async def _preprocess_data(self, data: pd.DataFrame, config: TrainingConfig) -> Tuple[pd.DataFrame, pd.Series, Dict]:
        """Preprocess the training data"""
        preprocessors = {}
        preprocessing_config = config.preprocessing_config
        
        # Separate features and target
        input_features = config.data_config.get('input_features', [])
        target_feature = config.data_config.get('target_feature')
        
        if not input_features or not target_feature:
            raise ValueError("Input features and target feature must be specified")
        
        X = data[input_features].copy()
        y = data[target_feature].copy()
        
        # Handle missing values
        missing_method = preprocessing_config.get('missing_method', 'drop')
        if missing_method == 'drop':
            # Drop rows with any missing values
            mask = ~(X.isnull().any(axis=1) | y.isnull())
            X = X[mask]
            y = y[mask]
        elif missing_method in ['mean', 'median']:
            # Fill missing values
            for col in X.columns:
                if X[col].dtype in ['float64', 'int64']:
                    fill_value = X[col].mean() if missing_method == 'mean' else X[col].median()
                    X[col].fillna(fill_value, inplace=True)
                else:
                    X[col].fillna(X[col].mode()[0] if len(X[col].mode()) > 0 else 'Unknown', inplace=True)
        
        # Handle categorical variables
        categorical_columns = X.select_dtypes(include=['object']).columns
        if len(categorical_columns) > 0:
            # Use LabelEncoder for categorical variables
            label_encoders = {}
            for col in categorical_columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                label_encoders[col] = le
            preprocessors['label_encoders'] = label_encoders
        
        # Scale numerical features
        numerical_method = preprocessing_config.get('numerical_method', 'zscore')
        if numerical_method != 'none':
            scaler_class = self.scalers.get(numerical_method, StandardScaler)
            scaler = scaler_class()
            
            numerical_columns = X.select_dtypes(include=['float64', 'int64']).columns
            if len(numerical_columns) > 0:
                X[numerical_columns] = scaler.fit_transform(X[numerical_columns])
                preprocessors['scaler'] = scaler
                preprocessors['numerical_columns'] = list(numerical_columns)
        
        # Handle outliers
        outlier_method = preprocessing_config.get('outlier_method', 'none')
        if outlier_method == 'iqr':
            for col in X.select_dtypes(include=['float64', 'int64']).columns:
                Q1 = X[col].quantile(0.25)
                Q3 = X[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                X[col] = X[col].clip(lower_bound, upper_bound)
        
        return X, y, preprocessors
    
    def _split_data(self, X: pd.DataFrame, y: pd.Series, config: TrainingConfig) -> Tuple:
        """Split data into training and testing sets"""
        test_size = float(config.training_config.get('test_split', 0.2))
        random_state = int(config.training_config.get('random_seed', 42))
        
        return train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y if self._is_classification(config) else None)
    
    async def _select_features(self, X_train: pd.DataFrame, X_test: pd.DataFrame, y_train: pd.Series, config: TrainingConfig) -> Tuple:
        """Perform automated feature selection"""
        n_features = min(10, X_train.shape[1])  # Select top 10 features or all if less
        
        if self._is_classification(config):
            selector = SelectKBest(score_func=f_classif, k=n_features)
        else:
            selector = SelectKBest(score_func=f_regression, k=n_features)
        
        X_train_selected = selector.fit_transform(X_train, y_train)
        X_test_selected = selector.transform(X_test)
        
        return pd.DataFrame(X_train_selected), pd.DataFrame(X_test_selected), selector
    
    async def _train_model(self, X_train: pd.DataFrame, y_train: pd.Series, config: TrainingConfig):
        """Train the machine learning model"""
        algorithm = config.algorithm
        parameters = config.parameters
        
        if algorithm not in self.algorithms:
            raise ValueError(f"Unsupported algorithm: {algorithm}")
        
        model_class = self.algorithms[algorithm]
        
        # Filter parameters to only include valid ones for the algorithm
        valid_params = self._get_valid_parameters(model_class, parameters)
        
        # Create and train model
        model = model_class(**valid_params)
        model.fit(X_train, y_train)
        
        return model
    
    async def _optimize_hyperparameters(self, model, X_train: pd.DataFrame, y_train: pd.Series, config: TrainingConfig):
        """Optimize model hyperparameters using GridSearchCV"""
        param_grid = self._get_parameter_grid(config.algorithm)
        
        if not param_grid:
            return model  # No optimization if no parameter grid defined
        
        # Use cross-validation for hyperparameter optimization
        cv = 3 if len(X_train) < 1000 else 5  # Adjust CV folds based on data size
        
        grid_search = GridSearchCV(
            model, 
            param_grid, 
            cv=cv, 
            scoring='accuracy' if self._is_classification(config) else 'r2',
            n_jobs=-1
        )
        
        grid_search.fit(X_train, y_train)
        return grid_search.best_estimator_
    
    async def _evaluate_model(self, model, X_test: pd.DataFrame, y_test: pd.Series, config: TrainingConfig) -> Dict[str, Any]:
        """Evaluate model performance"""
        predictions = model.predict(X_test)
        metrics = {}
        
        if self._is_classification(config):
            metrics['accuracy'] = accuracy_score(y_test, predictions)
            metrics['precision'] = precision_score(y_test, predictions, average='weighted')
            metrics['recall'] = recall_score(y_test, predictions, average='weighted')
            metrics['f1_score'] = f1_score(y_test, predictions, average='weighted')
        else:
            metrics['mse'] = mean_squared_error(y_test, predictions)
            metrics['rmse'] = np.sqrt(metrics['mse'])
            metrics['r2_score'] = r2_score(y_test, predictions)
            metrics['mae'] = np.mean(np.abs(y_test - predictions))
        
        # Add cross-validation scores
        if len(X_test) > 50:  # Only if we have enough data
            cv_scores = cross_val_score(model, X_test, y_test, cv=3)
            metrics['cv_mean'] = cv_scores.mean()
            metrics['cv_std'] = cv_scores.std()
        
        return metrics
    
    async def _save_model(self, job_id: str, model, preprocessors: Dict, feature_selector, config: TrainingConfig) -> str:
        """Save the trained model and preprocessing components"""
        model_data = {
            'model': model,
            'preprocessors': preprocessors,
            'feature_selector': feature_selector,
            'config': asdict(config),
            'job_id': job_id,
            'created_at': datetime.now().isoformat(),
            'model_type': self._get_model_type(config.algorithm).value
        }
        
        model_filename = f"{config.model_id}_{job_id}.pkl"
        model_path = os.path.join(self.models_dir, model_filename)
        
        joblib.dump(model_data, model_path)
        
        return model_path
    
    # Helper methods
    def _is_classification(self, config: TrainingConfig) -> bool:
        """Check if this is a classification problem"""
        classification_algorithms = [
            'random_forest_clf', 'logistic_regression', 'svm_clf', 
            'neural_network_clf', 'xgboost_clf'
        ]
        return config.algorithm in classification_algorithms
    
    def _get_model_type(self, algorithm: str) -> ModelType:
        """Get the model type based on algorithm"""
        if algorithm in ['kmeans', 'dbscan']:
            return ModelType.CLUSTERING
        elif algorithm.endswith('_clf'):
            return ModelType.CLASSIFICATION
        elif algorithm.endswith('_reg') or algorithm in ['linear_regression', 'ridge_regression', 'lasso_regression']:
            return ModelType.REGRESSION
        else:
            return ModelType.CLASSIFICATION  # Default
    
    def _get_valid_parameters(self, model_class, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Filter parameters to only include valid ones for the model class"""
        import inspect
        valid_params = {}
        
        try:
            # Get the model's __init__ method parameters
            sig = inspect.signature(model_class.__init__)
            valid_param_names = list(sig.parameters.keys())
            
            for key, value in parameters.items():
                if key in valid_param_names:
                    valid_params[key] = value
        except:
            # If inspection fails, return original parameters
            valid_params = parameters
        
        return valid_params
    
    def _get_parameter_grid(self, algorithm: str) -> Dict[str, List]:
        """Get parameter grid for hyperparameter optimization"""
        grids = {
            'random_forest_clf': {
                'n_estimators': [100, 200],
                'max_depth': [10, 20, None],
                'min_samples_split': [2, 5]
            },
            'random_forest_reg': {
                'n_estimators': [100, 200],
                'max_depth': [10, 20, None],
                'min_samples_split': [2, 5]
            },
            'svm_clf': {
                'C': [0.1, 1, 10],
                'kernel': ['rbf', 'linear']
            }
        }
        return grids.get(algorithm, {})
    
    def _get_feature_importance(self, model, feature_names: Optional[List[str]]) -> Optional[Dict[str, float]]:
        """Extract feature importance from the model"""
        try:
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
                if feature_names and len(feature_names) == len(importances):
                    return dict(zip(feature_names, importances.tolist()))
                else:
                    return {f'feature_{i}': imp for i, imp in enumerate(importances)}
            elif hasattr(model, 'coef_'):
                coefficients = model.coef_
                if coefficients.ndim > 1:
                    coefficients = coefficients[0]  # Take first class for multi-class
                if feature_names and len(feature_names) == len(coefficients):
                    return dict(zip(feature_names, coefficients.tolist()))
                else:
                    return {f'feature_{i}': coef for i, coef in enumerate(coefficients)}
        except:
            pass
        return None
    
    def _get_preprocessing_steps(self, config: TrainingConfig) -> List[str]:
        """Get list of preprocessing steps performed"""
        steps = []
        preprocessing_config = config.preprocessing_config
        
        if preprocessing_config.get('missing_method', 'drop') != 'none':
            steps.append(f"Missing value handling: {preprocessing_config.get('missing_method')}")
        
        if preprocessing_config.get('numerical_method', 'none') != 'none':
            steps.append(f"Numerical scaling: {preprocessing_config.get('numerical_method')}")
        
        if preprocessing_config.get('outlier_method', 'none') != 'none':
            steps.append(f"Outlier treatment: {preprocessing_config.get('outlier_method')}")
        
        if config.optimization_config.get('auto_features', False):
            steps.append("Automated feature selection")
        
        return steps
    
    # Public API methods
    def get_training_progress(self, job_id: str) -> Optional[TrainingProgress]:
        """Get current training progress"""
        return self.active_jobs.get(job_id)
    
    def get_training_result(self, job_id: str) -> Optional[TrainingResult]:
        """Get training result if completed"""
        progress = self.active_jobs.get(job_id)
        return getattr(progress, 'result', None) if progress else None
    
    def cancel_training(self, job_id: str) -> bool:
        """Cancel a training job"""
        if job_id in self.active_jobs:
            progress = self.active_jobs[job_id]
            progress.status = TrainingStatus.FAILED
            progress.message = "Training cancelled by user"
            return True
        return False
    
    def load_model(self, model_path: str):
        """Load a trained model"""
        return joblib.load(model_path)

# Global training pipeline instance
training_pipeline = MLTrainingPipeline()

# Main function for compatibility with existing code
def train_model(user_id: int, model_id: str, config: Dict[str, Any] = None, data: pd.DataFrame = None) -> str:
    """
    Start model training (legacy interface)
    Returns job_id for tracking progress
    """
    if config is None or data is None:
        # Fallback to placeholder behavior
        print(f"Starting training for user {user_id} and model {model_id}")
        return f"job_{model_id}"
    
    # Convert dict config to TrainingConfig
    training_config = TrainingConfig(
        model_id=model_id,
        user_id=user_id,
        model_name=config.get('model_name', f'Model_{model_id}'),
        algorithm=config.get('algorithm', 'random_forest_clf'),
        parameters=config.get('parameters', {}),
        data_config=config.get('data_config', {}),
        preprocessing_config=config.get('preprocessing_config', {}),
        training_config=config.get('training_config', {}),
        optimization_config=config.get('optimization_config', {})
    )
    
    # Start training asynchronously
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    job_id = loop.run_until_complete(training_pipeline.start_training(training_config, data))
    
    return job_id
