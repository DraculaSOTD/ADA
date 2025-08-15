"""
Training Pipeline Service
Comprehensive ML model training pipeline with preprocessing, training, and evaluation
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import asyncio
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, mean_absolute_error, r2_score,
    confusion_matrix, roc_auc_score, roc_curve,
    silhouette_score, davies_bouldin_score
)
import joblib
import hashlib
from pathlib import Path


class TaskType(Enum):
    """Machine learning task types"""
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    ANOMALY_DETECTION = "anomaly_detection"
    TIME_SERIES = "time_series"
    NLP = "nlp"
    COMPUTER_VISION = "computer_vision"


@dataclass
class TrainingConfig:
    """Training configuration"""
    model_id: str
    model_type: str
    task_type: TaskType
    data_path: str
    target_column: Optional[str]
    feature_columns: Optional[List[str]]
    
    # Data split
    test_size: float = 0.2
    validation_size: float = 0.2
    random_state: int = 42
    stratify: bool = True
    
    # Preprocessing
    handle_missing: str = "mean"  # mean, median, mode, drop
    scale_features: bool = True
    encode_categorical: bool = True
    feature_selection: bool = False
    n_features: Optional[int] = None
    
    # Training
    hyperparameters: Dict[str, Any] = None
    cross_validation: bool = True
    cv_folds: int = 5
    optimization_metric: str = "accuracy"
    early_stopping: bool = True
    patience: int = 10
    
    # Resources
    max_training_time: int = 3600  # seconds
    checkpoint_frequency: int = 100  # iterations
    use_gpu: bool = False
    n_jobs: int = -1  # parallel jobs


@dataclass
class TrainingResult:
    """Training result container"""
    success: bool
    model_path: str
    training_metrics: Dict[str, float]
    validation_metrics: Dict[str, float]
    test_metrics: Dict[str, float]
    feature_importance: Optional[Dict[str, float]]
    training_time: float
    model_size: int
    best_hyperparameters: Optional[Dict[str, Any]]
    cross_validation_scores: Optional[List[float]]
    confusion_matrix: Optional[np.ndarray]
    roc_curve_data: Optional[Dict]
    error_message: Optional[str] = None


class TrainingPipeline:
    """Comprehensive training pipeline for ML models"""
    
    def __init__(self, storage_path: str, config: Dict):
        self.storage_path = Path(storage_path)
        self.config = config
        self.checkpoints_path = self.storage_path / "checkpoints"
        self.checkpoints_path.mkdir(parents=True, exist_ok=True)
        
    async def train_model(self, training_config: TrainingConfig) -> TrainingResult:
        """
        Execute complete training pipeline
        """
        start_time = datetime.utcnow()
        
        try:
            # Load and validate data
            print(f"Loading data from {training_config.data_path}")
            data = await self._load_data(training_config.data_path)
            
            if data is None or data.empty:
                return TrainingResult(
                    success=False,
                    model_path="",
                    training_metrics={},
                    validation_metrics={},
                    test_metrics={},
                    feature_importance=None,
                    training_time=0,
                    model_size=0,
                    best_hyperparameters=None,
                    cross_validation_scores=None,
                    confusion_matrix=None,
                    roc_curve_data=None,
                    error_message="Failed to load data"
                )
            
            # Preprocess data
            print("Preprocessing data...")
            X, y, preprocessor = await self._preprocess_data(
                data, training_config
            )
            
            # Split data
            print("Splitting data...")
            X_train, X_val, X_test, y_train, y_val, y_test = await self._split_data(
                X, y, training_config
            )
            
            # Select and initialize model
            print(f"Initializing {training_config.model_type} model...")
            model = await self._initialize_model(training_config)
            
            # Hyperparameter optimization if requested
            best_params = training_config.hyperparameters
            if training_config.cross_validation:
                print("Performing hyperparameter optimization...")
                model, best_params, cv_scores = await self._optimize_hyperparameters(
                    model, X_train, y_train, training_config
                )
            else:
                cv_scores = None
            
            # Train model
            print("Training model...")
            model, training_history = await self._train_model(
                model, X_train, y_train, X_val, y_val, training_config
            )
            
            # Evaluate model
            print("Evaluating model...")
            evaluation_results = await self._evaluate_model(
                model, X_train, y_train, X_val, y_val, X_test, y_test, training_config
            )
            
            # Extract feature importance
            feature_importance = await self._get_feature_importance(
                model, training_config
            )
            
            # Save model and preprocessor
            print("Saving model...")
            model_path = await self._save_model(
                model, preprocessor, training_config.model_id
            )
            
            # Calculate model size
            model_size = os.path.getsize(model_path)
            
            # Calculate training time
            training_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Generate detailed metrics based on task type
            if training_config.task_type == TaskType.CLASSIFICATION:
                # Get confusion matrix and ROC curve
                cm = confusion_matrix(y_test, model.predict(X_test))
                
                if hasattr(model, 'predict_proba'):
                    y_proba = model.predict_proba(X_test)
                    if len(np.unique(y_test)) == 2:  # Binary classification
                        fpr, tpr, thresholds = roc_curve(y_test, y_proba[:, 1])
                        roc_data = {
                            'fpr': fpr.tolist(),
                            'tpr': tpr.tolist(),
                            'thresholds': thresholds.tolist(),
                            'auc': roc_auc_score(y_test, y_proba[:, 1])
                        }
                    else:
                        roc_data = None
                else:
                    roc_data = None
            else:
                cm = None
                roc_data = None
            
            return TrainingResult(
                success=True,
                model_path=str(model_path),
                training_metrics=evaluation_results['training_metrics'],
                validation_metrics=evaluation_results['validation_metrics'],
                test_metrics=evaluation_results['test_metrics'],
                feature_importance=feature_importance,
                training_time=training_time,
                model_size=model_size,
                best_hyperparameters=best_params,
                cross_validation_scores=cv_scores,
                confusion_matrix=cm,
                roc_curve_data=roc_data
            )
            
        except Exception as e:
            print(f"Training failed: {str(e)}")
            return TrainingResult(
                success=False,
                model_path="",
                training_metrics={},
                validation_metrics={},
                test_metrics={},
                feature_importance=None,
                training_time=(datetime.utcnow() - start_time).total_seconds(),
                model_size=0,
                best_hyperparameters=None,
                cross_validation_scores=None,
                confusion_matrix=None,
                roc_curve_data=None,
                error_message=str(e)
            )
    
    async def _load_data(self, data_path: str) -> Optional[pd.DataFrame]:
        """Load data from various formats"""
        try:
            if data_path.endswith('.csv'):
                return pd.read_csv(data_path)
            elif data_path.endswith('.json'):
                return pd.read_json(data_path)
            elif data_path.endswith('.parquet'):
                return pd.read_parquet(data_path)
            elif data_path.endswith('.pkl'):
                with open(data_path, 'rb') as f:
                    return pickle.load(f)
            else:
                # Try to infer format
                return pd.read_csv(data_path)
        except Exception as e:
            print(f"Failed to load data: {e}")
            return None
    
    async def _preprocess_data(self, data: pd.DataFrame, 
                              config: TrainingConfig) -> Tuple[np.ndarray, np.ndarray, Dict]:
        """Preprocess data for training"""
        preprocessor = {}
        
        # Separate features and target
        if config.target_column:
            X = data.drop(columns=[config.target_column])
            y = data[config.target_column]
        else:
            # For unsupervised learning
            X = data
            y = None
        
        # Select specific features if provided
        if config.feature_columns:
            X = X[config.feature_columns]
        
        # Handle missing values
        if config.handle_missing != "drop":
            imputer = SimpleImputer(strategy=config.handle_missing)
            numeric_columns = X.select_dtypes(include=[np.number]).columns
            X[numeric_columns] = imputer.fit_transform(X[numeric_columns])
            preprocessor['imputer'] = imputer
        else:
            X = X.dropna()
            if y is not None:
                y = y[X.index]
        
        # Encode categorical variables
        if config.encode_categorical:
            categorical_columns = X.select_dtypes(include=['object']).columns
            
            if len(categorical_columns) > 0:
                # Use one-hot encoding for features
                encoder = OneHotEncoder(sparse=False, handle_unknown='ignore')
                encoded_features = encoder.fit_transform(X[categorical_columns])
                
                # Create column names for encoded features
                feature_names = []
                for i, col in enumerate(categorical_columns):
                    for category in encoder.categories_[i]:
                        feature_names.append(f"{col}_{category}")
                
                # Replace categorical columns with encoded ones
                X_encoded = pd.DataFrame(
                    encoded_features,
                    columns=feature_names,
                    index=X.index
                )
                
                # Combine with numeric features
                numeric_columns = X.select_dtypes(exclude=['object']).columns
                X = pd.concat([X[numeric_columns], X_encoded], axis=1)
                
                preprocessor['encoder'] = encoder
                preprocessor['categorical_columns'] = categorical_columns.tolist()
            
            # Encode target if classification
            if y is not None and config.task_type == TaskType.CLASSIFICATION:
                if y.dtype == 'object':
                    label_encoder = LabelEncoder()
                    y = label_encoder.fit_transform(y)
                    preprocessor['label_encoder'] = label_encoder
        
        # Scale features
        if config.scale_features:
            scaler = StandardScaler()
            X = scaler.fit_transform(X)
            preprocessor['scaler'] = scaler
        else:
            X = X.values if isinstance(X, pd.DataFrame) else X
        
        # Convert y to numpy array if needed
        if y is not None:
            y = y.values if isinstance(y, pd.Series) else y
        
        return X, y, preprocessor
    
    async def _split_data(self, X: np.ndarray, y: Optional[np.ndarray], 
                         config: TrainingConfig) -> Tuple:
        """Split data into train, validation, and test sets"""
        if y is None:
            # For unsupervised learning, only split features
            X_temp, X_test = train_test_split(
                X, test_size=config.test_size, random_state=config.random_state
            )
            X_train, X_val = train_test_split(
                X_temp, test_size=config.validation_size, random_state=config.random_state
            )
            return X_train, X_val, X_test, None, None, None
        
        # Stratified split for classification
        stratify_param = y if (config.stratify and config.task_type == TaskType.CLASSIFICATION) else None
        
        # First split: train+val and test
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=config.test_size, 
            random_state=config.random_state,
            stratify=stratify_param
        )
        
        # Second split: train and validation
        stratify_param_val = y_temp if (config.stratify and config.task_type == TaskType.CLASSIFICATION) else None
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, 
            test_size=config.validation_size,
            random_state=config.random_state,
            stratify=stratify_param_val
        )
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    async def _initialize_model(self, config: TrainingConfig):
        """Initialize model based on type and task"""
        model_type = config.model_type.lower()
        
        # Import models dynamically based on type
        if model_type == "random_forest":
            if config.task_type == TaskType.CLASSIFICATION:
                from sklearn.ensemble import RandomForestClassifier
                model = RandomForestClassifier(
                    random_state=config.random_state,
                    n_jobs=config.n_jobs,
                    **(config.hyperparameters or {})
                )
            else:
                from sklearn.ensemble import RandomForestRegressor
                model = RandomForestRegressor(
                    random_state=config.random_state,
                    n_jobs=config.n_jobs,
                    **(config.hyperparameters or {})
                )
        
        elif model_type == "gradient_boost":
            if config.task_type == TaskType.CLASSIFICATION:
                from sklearn.ensemble import GradientBoostingClassifier
                model = GradientBoostingClassifier(
                    random_state=config.random_state,
                    **(config.hyperparameters or {})
                )
            else:
                from sklearn.ensemble import GradientBoostingRegressor
                model = GradientBoostingRegressor(
                    random_state=config.random_state,
                    **(config.hyperparameters or {})
                )
        
        elif model_type == "svm":
            if config.task_type == TaskType.CLASSIFICATION:
                from sklearn.svm import SVC
                model = SVC(
                    random_state=config.random_state,
                    **(config.hyperparameters or {})
                )
            else:
                from sklearn.svm import SVR
                model = SVR(**(config.hyperparameters or {}))
        
        elif model_type == "logistic_regression":
            from sklearn.linear_model import LogisticRegression
            model = LogisticRegression(
                random_state=config.random_state,
                n_jobs=config.n_jobs,
                **(config.hyperparameters or {})
            )
        
        elif model_type == "linear_regression":
            from sklearn.linear_model import LinearRegression
            model = LinearRegression(
                n_jobs=config.n_jobs,
                **(config.hyperparameters or {})
            )
        
        elif model_type == "kmeans":
            from sklearn.cluster import KMeans
            model = KMeans(
                random_state=config.random_state,
                **(config.hyperparameters or {})
            )
        
        elif model_type == "dbscan":
            from sklearn.cluster import DBSCAN
            model = DBSCAN(
                n_jobs=config.n_jobs,
                **(config.hyperparameters or {})
            )
        
        elif model_type == "neural_network":
            # Use sklearn's MLPClassifier/Regressor for simplicity
            if config.task_type == TaskType.CLASSIFICATION:
                from sklearn.neural_network import MLPClassifier
                model = MLPClassifier(
                    random_state=config.random_state,
                    **(config.hyperparameters or {})
                )
            else:
                from sklearn.neural_network import MLPRegressor
                model = MLPRegressor(
                    random_state=config.random_state,
                    **(config.hyperparameters or {})
                )
        
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
        
        return model
    
    async def _optimize_hyperparameters(self, model, X_train, y_train, 
                                       config: TrainingConfig) -> Tuple:
        """Optimize hyperparameters using grid search or random search"""
        # Define parameter grid based on model type
        param_grid = self._get_parameter_grid(config.model_type)
        
        # Select scoring metric
        scoring = self._get_scoring_metric(config)
        
        # Perform grid search
        grid_search = GridSearchCV(
            model,
            param_grid,
            cv=config.cv_folds,
            scoring=scoring,
            n_jobs=config.n_jobs,
            verbose=1
        )
        
        grid_search.fit(X_train, y_train)
        
        # Get best model and parameters
        best_model = grid_search.best_estimator_
        best_params = grid_search.best_params_
        cv_scores = grid_search.cv_results_['mean_test_score'].tolist()
        
        print(f"Best parameters: {best_params}")
        print(f"Best CV score: {grid_search.best_score_}")
        
        return best_model, best_params, cv_scores
    
    def _get_parameter_grid(self, model_type: str) -> Dict:
        """Get parameter grid for hyperparameter optimization"""
        model_type = model_type.lower()
        
        if model_type == "random_forest":
            return {
                'n_estimators': [50, 100, 200],
                'max_depth': [None, 10, 20, 30],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4]
            }
        elif model_type == "gradient_boost":
            return {
                'n_estimators': [50, 100, 200],
                'learning_rate': [0.01, 0.1, 0.2],
                'max_depth': [3, 5, 7],
                'min_samples_split': [2, 5, 10]
            }
        elif model_type == "svm":
            return {
                'C': [0.1, 1, 10],
                'kernel': ['linear', 'rbf', 'poly'],
                'gamma': ['scale', 'auto']
            }
        elif model_type == "logistic_regression":
            return {
                'C': [0.01, 0.1, 1, 10],
                'penalty': ['l2'],
                'solver': ['lbfgs', 'liblinear']
            }
        elif model_type == "neural_network":
            return {
                'hidden_layer_sizes': [(50,), (100,), (50, 50), (100, 50)],
                'activation': ['tanh', 'relu'],
                'learning_rate': ['constant', 'adaptive'],
                'alpha': [0.0001, 0.001, 0.01]
            }
        else:
            return {}
    
    def _get_scoring_metric(self, config: TrainingConfig) -> str:
        """Get scoring metric for optimization"""
        if config.task_type == TaskType.CLASSIFICATION:
            metric_map = {
                'accuracy': 'accuracy',
                'precision': 'precision_weighted',
                'recall': 'recall_weighted',
                'f1': 'f1_weighted',
                'roc_auc': 'roc_auc'
            }
        else:  # Regression
            metric_map = {
                'mse': 'neg_mean_squared_error',
                'mae': 'neg_mean_absolute_error',
                'r2': 'r2'
            }
        
        return metric_map.get(config.optimization_metric, 'accuracy')
    
    async def _train_model(self, model, X_train, y_train, X_val, y_val, 
                          config: TrainingConfig) -> Tuple:
        """Train the model with optional early stopping"""
        training_history = {
            'train_scores': [],
            'val_scores': []
        }
        
        # For models that support partial_fit (online learning)
        if hasattr(model, 'partial_fit'):
            # Implement mini-batch training with early stopping
            batch_size = 32
            n_batches = len(X_train) // batch_size
            best_val_score = -np.inf
            patience_counter = 0
            
            for epoch in range(100):  # Max epochs
                # Shuffle data
                indices = np.random.permutation(len(X_train))
                X_train_shuffled = X_train[indices]
                y_train_shuffled = y_train[indices]
                
                # Train on batches
                for i in range(n_batches):
                    start_idx = i * batch_size
                    end_idx = start_idx + batch_size
                    
                    X_batch = X_train_shuffled[start_idx:end_idx]
                    y_batch = y_train_shuffled[start_idx:end_idx]
                    
                    if config.task_type == TaskType.CLASSIFICATION:
                        model.partial_fit(X_batch, y_batch, classes=np.unique(y_train))
                    else:
                        model.partial_fit(X_batch, y_batch)
                
                # Evaluate
                train_score = model.score(X_train, y_train)
                val_score = model.score(X_val, y_val) if X_val is not None else train_score
                
                training_history['train_scores'].append(train_score)
                training_history['val_scores'].append(val_score)
                
                # Early stopping
                if config.early_stopping and X_val is not None:
                    if val_score > best_val_score:
                        best_val_score = val_score
                        patience_counter = 0
                        # Save best model
                        best_model = model
                    else:
                        patience_counter += 1
                        if patience_counter >= config.patience:
                            print(f"Early stopping at epoch {epoch}")
                            model = best_model
                            break
                
                # Checkpoint
                if epoch % config.checkpoint_frequency == 0:
                    await self._save_checkpoint(model, config.model_id, epoch)
        
        else:
            # Standard fit for models without partial_fit
            if y_train is not None:
                model.fit(X_train, y_train)
            else:
                model.fit(X_train)  # Unsupervised
            
            # Record scores
            if hasattr(model, 'score') and y_train is not None:
                train_score = model.score(X_train, y_train)
                val_score = model.score(X_val, y_val) if X_val is not None else train_score
                training_history['train_scores'] = [train_score]
                training_history['val_scores'] = [val_score]
        
        return model, training_history
    
    async def _evaluate_model(self, model, X_train, y_train, X_val, y_val, 
                             X_test, y_test, config: TrainingConfig) -> Dict:
        """Comprehensive model evaluation"""
        evaluation_results = {
            'training_metrics': {},
            'validation_metrics': {},
            'test_metrics': {}
        }
        
        if config.task_type == TaskType.CLASSIFICATION:
            # Training metrics
            if y_train is not None:
                y_train_pred = model.predict(X_train)
                evaluation_results['training_metrics'] = {
                    'accuracy': accuracy_score(y_train, y_train_pred),
                    'precision': precision_score(y_train, y_train_pred, average='weighted'),
                    'recall': recall_score(y_train, y_train_pred, average='weighted'),
                    'f1': f1_score(y_train, y_train_pred, average='weighted')
                }
            
            # Validation metrics
            if y_val is not None:
                y_val_pred = model.predict(X_val)
                evaluation_results['validation_metrics'] = {
                    'accuracy': accuracy_score(y_val, y_val_pred),
                    'precision': precision_score(y_val, y_val_pred, average='weighted'),
                    'recall': recall_score(y_val, y_val_pred, average='weighted'),
                    'f1': f1_score(y_val, y_val_pred, average='weighted')
                }
            
            # Test metrics
            if y_test is not None:
                y_test_pred = model.predict(X_test)
                evaluation_results['test_metrics'] = {
                    'accuracy': accuracy_score(y_test, y_test_pred),
                    'precision': precision_score(y_test, y_test_pred, average='weighted'),
                    'recall': recall_score(y_test, y_test_pred, average='weighted'),
                    'f1': f1_score(y_test, y_test_pred, average='weighted')
                }
                
                # Add ROC-AUC for binary classification
                if len(np.unique(y_test)) == 2 and hasattr(model, 'predict_proba'):
                    y_proba = model.predict_proba(X_test)[:, 1]
                    evaluation_results['test_metrics']['roc_auc'] = roc_auc_score(y_test, y_proba)
        
        elif config.task_type == TaskType.REGRESSION:
            # Training metrics
            if y_train is not None:
                y_train_pred = model.predict(X_train)
                evaluation_results['training_metrics'] = {
                    'mse': mean_squared_error(y_train, y_train_pred),
                    'mae': mean_absolute_error(y_train, y_train_pred),
                    'r2': r2_score(y_train, y_train_pred)
                }
            
            # Validation metrics
            if y_val is not None:
                y_val_pred = model.predict(X_val)
                evaluation_results['validation_metrics'] = {
                    'mse': mean_squared_error(y_val, y_val_pred),
                    'mae': mean_absolute_error(y_val, y_val_pred),
                    'r2': r2_score(y_val, y_val_pred)
                }
            
            # Test metrics
            if y_test is not None:
                y_test_pred = model.predict(X_test)
                evaluation_results['test_metrics'] = {
                    'mse': mean_squared_error(y_test, y_test_pred),
                    'mae': mean_absolute_error(y_test, y_test_pred),
                    'r2': r2_score(y_test, y_test_pred),
                    'rmse': np.sqrt(mean_squared_error(y_test, y_test_pred))
                }
        
        elif config.task_type == TaskType.CLUSTERING:
            # Clustering metrics (no y labels)
            X_all = np.vstack([X_train, X_val, X_test]) if X_val is not None else X_train
            labels = model.predict(X_all)
            
            if len(np.unique(labels)) > 1:
                evaluation_results['test_metrics'] = {
                    'silhouette_score': silhouette_score(X_all, labels),
                    'davies_bouldin_score': davies_bouldin_score(X_all, labels),
                    'n_clusters': len(np.unique(labels))
                }
        
        return evaluation_results
    
    async def _get_feature_importance(self, model, config: TrainingConfig) -> Optional[Dict[str, float]]:
        """Extract feature importance from model"""
        feature_importance = None
        
        # Check if model has feature_importances_ attribute
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            # Create feature names if not provided
            if config.feature_columns:
                feature_names = config.feature_columns
            else:
                feature_names = [f"feature_{i}" for i in range(len(importances))]
            
            feature_importance = dict(zip(feature_names, importances.tolist()))
            
            # Sort by importance
            feature_importance = dict(
                sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
            )
        
        # For linear models, use coefficients
        elif hasattr(model, 'coef_'):
            coefficients = model.coef_
            if len(coefficients.shape) > 1:
                # Multi-class, take mean absolute coefficient
                coefficients = np.mean(np.abs(coefficients), axis=0)
            else:
                coefficients = np.abs(coefficients)
            
            if config.feature_columns:
                feature_names = config.feature_columns
            else:
                feature_names = [f"feature_{i}" for i in range(len(coefficients))]
            
            feature_importance = dict(zip(feature_names, coefficients.tolist()))
            feature_importance = dict(
                sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
            )
        
        return feature_importance
    
    async def _save_model(self, model, preprocessor: Dict, model_id: str) -> str:
        """Save trained model and preprocessor"""
        model_dir = self.storage_path / model_id
        model_dir.mkdir(parents=True, exist_ok=True)
        
        # Save model
        model_path = model_dir / "model.pkl"
        joblib.dump(model, model_path)
        
        # Save preprocessor
        if preprocessor:
            preprocessor_path = model_dir / "preprocessor.pkl"
            joblib.dump(preprocessor, preprocessor_path)
        
        # Save metadata
        metadata = {
            'model_id': model_id,
            'saved_at': datetime.utcnow().isoformat(),
            'model_type': type(model).__name__,
            'preprocessor_included': bool(preprocessor)
        }
        
        metadata_path = model_dir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return str(model_path)
    
    async def _save_checkpoint(self, model, model_id: str, epoch: int) -> None:
        """Save model checkpoint during training"""
        checkpoint_path = self.checkpoints_path / f"{model_id}_epoch_{epoch}.pkl"
        joblib.dump(model, checkpoint_path)
        
        # Keep only last 5 checkpoints
        checkpoints = sorted(self.checkpoints_path.glob(f"{model_id}_epoch_*.pkl"))
        if len(checkpoints) > 5:
            for old_checkpoint in checkpoints[:-5]:
                old_checkpoint.unlink()
    
    async def load_model(self, model_id: str) -> Tuple[Any, Dict]:
        """Load trained model and preprocessor"""
        model_dir = self.storage_path / model_id
        
        # Load model
        model_path = model_dir / "model.pkl"
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_id}")
        
        model = joblib.load(model_path)
        
        # Load preprocessor if exists
        preprocessor_path = model_dir / "preprocessor.pkl"
        if preprocessor_path.exists():
            preprocessor = joblib.load(preprocessor_path)
        else:
            preprocessor = None
        
        return model, preprocessor
    
    async def predict(self, model_id: str, data: np.ndarray) -> np.ndarray:
        """Make predictions using trained model"""
        # Load model and preprocessor
        model, preprocessor = await self.load_model(model_id)
        
        # Apply preprocessing if available
        if preprocessor:
            if 'scaler' in preprocessor:
                data = preprocessor['scaler'].transform(data)
        
        # Make predictions
        predictions = model.predict(data)
        
        # Inverse transform if needed
        if preprocessor and 'label_encoder' in preprocessor:
            predictions = preprocessor['label_encoder'].inverse_transform(predictions)
        
        return predictions
    
    async def predict_proba(self, model_id: str, data: np.ndarray) -> np.ndarray:
        """Get prediction probabilities for classification"""
        # Load model and preprocessor
        model, preprocessor = await self.load_model(model_id)
        
        # Apply preprocessing if available
        if preprocessor:
            if 'scaler' in preprocessor:
                data = preprocessor['scaler'].transform(data)
        
        # Check if model supports predict_proba
        if not hasattr(model, 'predict_proba'):
            raise ValueError("Model does not support probability predictions")
        
        # Get probabilities
        probabilities = model.predict_proba(data)
        
        return probabilities