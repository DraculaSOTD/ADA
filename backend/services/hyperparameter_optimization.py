"""
Advanced Hyperparameter Optimization Service
Provides comprehensive hyperparameter tuning using multiple optimization strategies
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from sklearn.model_selection import (
    GridSearchCV, RandomizedSearchCV, cross_val_score, 
    StratifiedKFold, KFold, TimeSeriesSplit
)
from sklearn.metrics import make_scorer, accuracy_score, f1_score, mean_squared_error, r2_score
from sklearn.base import BaseEstimator
import optuna
from scipy.stats import randint, uniform, loguniform
import joblib
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class HyperparameterOptimizer:
    def __init__(self):
        self.optimization_history = {}
        self.best_params_cache = {}
        
    def optimize_hyperparameters(
        self, 
        model: BaseEstimator, 
        X_train: pd.DataFrame, 
        y_train: pd.Series,
        algorithm: str,
        optimization_method: str = "auto",
        n_trials: int = None,
        cv_folds: int = None,
        scoring: str = None,
        time_budget: int = None,
        random_state: int = 42
    ) -> Tuple[BaseEstimator, Dict[str, Any]]:
        """
        Optimize hyperparameters using specified method
        
        Args:
            model: The model to optimize
            X_train: Training features
            y_train: Training target
            algorithm: Algorithm name
            optimization_method: 'grid', 'random', 'bayesian', 'auto'
            n_trials: Number of trials for optimization
            cv_folds: Number of cross-validation folds
            scoring: Scoring metric
            time_budget: Time budget in seconds
            random_state: Random state for reproducibility
            
        Returns:
            Optimized model and optimization results
        """
        
        # Set defaults based on algorithm and data
        if optimization_method == "auto":
            optimization_method = self._select_optimization_method(X_train, algorithm)
        
        if n_trials is None:
            n_trials = self._get_default_trials(optimization_method, X_train.shape)
            
        if cv_folds is None:
            cv_folds = self._get_default_cv_folds(X_train.shape[0])
            
        if scoring is None:
            scoring = self._get_default_scoring(y_train)
        
        # Get parameter space
        param_space = self._get_parameter_space(algorithm, optimization_method)
        
        if not param_space:
            return model, {"message": "No parameter space defined for algorithm"}
        
        # Set up cross-validation
        cv = self._setup_cross_validation(y_train, cv_folds)
        
        # Perform optimization
        optimization_start = datetime.now()
        
        if optimization_method == "grid":
            optimized_model, results = self._grid_search_optimization(
                model, X_train, y_train, param_space, cv, scoring, random_state
            )
        elif optimization_method == "random":
            optimized_model, results = self._random_search_optimization(
                model, X_train, y_train, param_space, cv, scoring, n_trials, random_state
            )
        elif optimization_method == "bayesian":
            optimized_model, results = self._bayesian_optimization(
                model, X_train, y_train, param_space, cv, scoring, n_trials, random_state, time_budget
            )
        else:
            raise ValueError(f"Unknown optimization method: {optimization_method}")
        
        optimization_time = (datetime.now() - optimization_start).total_seconds()
        
        # Store optimization history
        optimization_id = f"{algorithm}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.optimization_history[optimization_id] = {
            "algorithm": algorithm,
            "method": optimization_method,
            "n_trials": n_trials,
            "cv_folds": cv_folds,
            "scoring": scoring,
            "optimization_time": optimization_time,
            "results": results,
            "data_shape": X_train.shape,
            "timestamp": datetime.now().isoformat()
        }
        
        return optimized_model, {
            "optimization_id": optimization_id,
            "method": optimization_method,
            "n_trials": len(results.get("trials", [])),
            "best_score": results.get("best_score"),
            "best_params": results.get("best_params"),
            "optimization_time": optimization_time,
            "improvement": results.get("improvement", 0),
            "cv_scores": results.get("cv_scores", [])
        }
    
    def _select_optimization_method(self, X_train: pd.DataFrame, algorithm: str) -> str:
        """Automatically select optimization method based on data and algorithm"""
        n_samples, n_features = X_train.shape
        
        # For small datasets, use grid search
        if n_samples < 1000 and n_features < 20:
            return "grid"
        
        # For large datasets or complex algorithms, use Bayesian optimization
        if n_samples > 10000 or algorithm in ["neural_network_clf", "neural_network_reg", "xgboost_clf", "xgboost_reg"]:
            return "bayesian"
        
        # Default to random search for medium-sized problems
        return "random"
    
    def _get_default_trials(self, method: str, data_shape: Tuple[int, int]) -> int:
        """Get default number of trials based on method and data size"""
        n_samples, n_features = data_shape
        
        if method == "grid":
            return None  # Grid search doesn't use trial count
        elif method == "random":
            if n_samples < 1000:
                return 50
            elif n_samples < 10000:
                return 100
            else:
                return 200
        elif method == "bayesian":
            if n_samples < 1000:
                return 100
            elif n_samples < 10000:
                return 200
            else:
                return 300
        
        return 100
    
    def _get_default_cv_folds(self, n_samples: int) -> int:
        """Get default number of CV folds based on sample size"""
        if n_samples < 500:
            return 3
        elif n_samples < 2000:
            return 5
        else:
            return 10
    
    def _get_default_scoring(self, y_train: pd.Series) -> str:
        """Get default scoring metric based on target variable"""
        if pd.api.types.is_numeric_dtype(y_train):
            # Check if it's likely a regression problem
            unique_values = y_train.nunique()
            if unique_values > 20 or not y_train.dtype.kind in 'biufc':
                return 'neg_mean_squared_error'
            else:
                return 'accuracy'
        else:
            # Classification
            return 'f1_weighted' if y_train.nunique() > 2 else 'f1'
    
    def _setup_cross_validation(self, y_train: pd.Series, cv_folds: int):
        """Setup appropriate cross-validation strategy"""
        if pd.api.types.is_numeric_dtype(y_train) and y_train.nunique() > 20:
            # Regression
            return KFold(n_splits=cv_folds, shuffle=True, random_state=42)
        else:
            # Classification
            return StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    
    def _get_parameter_space(self, algorithm: str, method: str) -> Dict[str, Any]:
        """Get parameter space for different algorithms and optimization methods"""
        
        if method == "grid":
            return self._get_grid_parameter_space(algorithm)
        elif method == "random":
            return self._get_random_parameter_space(algorithm)
        elif method == "bayesian":
            return self._get_bayesian_parameter_space(algorithm)
        
        return {}
    
    def _get_grid_parameter_space(self, algorithm: str) -> Dict[str, List]:
        """Get grid search parameter space"""
        spaces = {
            'random_forest_clf': {
                'n_estimators': [50, 100, 200],
                'max_depth': [None, 10, 20, 30],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4],
                'max_features': ['sqrt', 'log2', None]
            },
            'random_forest_reg': {
                'n_estimators': [50, 100, 200],
                'max_depth': [None, 10, 20, 30],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4],
                'max_features': ['sqrt', 'log2', None]
            },
            'logistic_regression': {
                'C': [0.01, 0.1, 1, 10, 100],
                'penalty': ['l1', 'l2', 'elasticnet'],
                'solver': ['liblinear', 'saga'],
                'max_iter': [1000, 5000]
            },
            'svm_clf': {
                'C': [0.1, 1, 10, 100],
                'kernel': ['linear', 'rbf', 'poly'],
                'gamma': ['scale', 'auto', 0.001, 0.01, 0.1, 1]
            },
            'svm_reg': {
                'C': [0.1, 1, 10, 100],
                'kernel': ['linear', 'rbf', 'poly'],
                'gamma': ['scale', 'auto', 0.001, 0.01, 0.1, 1],
                'epsilon': [0.01, 0.1, 0.2]
            },
            'xgboost_clf': {
                'n_estimators': [50, 100, 200],
                'max_depth': [3, 6, 10],
                'learning_rate': [0.01, 0.1, 0.2],
                'subsample': [0.8, 0.9, 1.0],
                'colsample_bytree': [0.8, 0.9, 1.0]
            },
            'xgboost_reg': {
                'n_estimators': [50, 100, 200],
                'max_depth': [3, 6, 10],
                'learning_rate': [0.01, 0.1, 0.2],
                'subsample': [0.8, 0.9, 1.0],
                'colsample_bytree': [0.8, 0.9, 1.0]
            },
            'neural_network_clf': {
                'hidden_layer_sizes': [(50,), (100,), (50, 50), (100, 50)],
                'activation': ['relu', 'tanh'],
                'alpha': [0.0001, 0.001, 0.01],
                'learning_rate': ['constant', 'adaptive']
            },
            'neural_network_reg': {
                'hidden_layer_sizes': [(50,), (100,), (50, 50), (100, 50)],
                'activation': ['relu', 'tanh'],
                'alpha': [0.0001, 0.001, 0.01],
                'learning_rate': ['constant', 'adaptive']
            }
        }
        
        return spaces.get(algorithm, {})
    
    def _get_random_parameter_space(self, algorithm: str) -> Dict[str, Any]:
        """Get random search parameter space with distributions"""
        spaces = {
            'random_forest_clf': {
                'n_estimators': randint(50, 500),
                'max_depth': [None] + list(range(10, 50, 5)),
                'min_samples_split': randint(2, 20),
                'min_samples_leaf': randint(1, 10),
                'max_features': ['sqrt', 'log2', None, 0.3, 0.5, 0.7]
            },
            'random_forest_reg': {
                'n_estimators': randint(50, 500),
                'max_depth': [None] + list(range(10, 50, 5)),
                'min_samples_split': randint(2, 20),
                'min_samples_leaf': randint(1, 10),
                'max_features': ['sqrt', 'log2', None, 0.3, 0.5, 0.7]
            },
            'logistic_regression': {
                'C': loguniform(0.001, 1000),
                'penalty': ['l1', 'l2', 'elasticnet'],
                'solver': ['liblinear', 'saga'],
                'max_iter': randint(1000, 10000)
            },
            'svm_clf': {
                'C': loguniform(0.1, 1000),
                'kernel': ['linear', 'rbf', 'poly', 'sigmoid'],
                'gamma': ['scale', 'auto'] + list(loguniform(0.0001, 10).rvs(10))
            },
            'svm_reg': {
                'C': loguniform(0.1, 1000),
                'kernel': ['linear', 'rbf', 'poly'],
                'gamma': ['scale', 'auto'] + list(loguniform(0.0001, 10).rvs(10)),
                'epsilon': uniform(0.01, 0.5)
            },
            'xgboost_clf': {
                'n_estimators': randint(50, 1000),
                'max_depth': randint(3, 15),
                'learning_rate': uniform(0.01, 0.3),
                'subsample': uniform(0.6, 0.4),
                'colsample_bytree': uniform(0.6, 0.4),
                'reg_alpha': loguniform(0.0001, 10),
                'reg_lambda': loguniform(0.0001, 10)
            },
            'xgboost_reg': {
                'n_estimators': randint(50, 1000),
                'max_depth': randint(3, 15),
                'learning_rate': uniform(0.01, 0.3),
                'subsample': uniform(0.6, 0.4),
                'colsample_bytree': uniform(0.6, 0.4),
                'reg_alpha': loguniform(0.0001, 10),
                'reg_lambda': loguniform(0.0001, 10)
            },
            'neural_network_clf': {
                'hidden_layer_sizes': [(50,), (100,), (150,), (50, 50), (100, 50), (100, 100)],
                'activation': ['relu', 'tanh', 'logistic'],
                'alpha': loguniform(0.00001, 0.1),
                'learning_rate': ['constant', 'invscaling', 'adaptive'],
                'learning_rate_init': loguniform(0.0001, 0.1)
            },
            'neural_network_reg': {
                'hidden_layer_sizes': [(50,), (100,), (150,), (50, 50), (100, 50), (100, 100)],
                'activation': ['relu', 'tanh', 'logistic'],
                'alpha': loguniform(0.00001, 0.1),
                'learning_rate': ['constant', 'invscaling', 'adaptive'],
                'learning_rate_init': loguniform(0.0001, 0.1)
            }
        }
        
        return spaces.get(algorithm, {})
    
    def _get_bayesian_parameter_space(self, algorithm: str) -> Dict[str, Any]:
        """Get Bayesian optimization parameter space for Optuna"""
        spaces = {
            'random_forest_clf': {
                'n_estimators': ('int', 50, 500),
                'max_depth': ('int_none', 10, 50),
                'min_samples_split': ('int', 2, 20),
                'min_samples_leaf': ('int', 1, 10),
                'max_features': ('categorical', ['sqrt', 'log2', None])
            },
            'random_forest_reg': {
                'n_estimators': ('int', 50, 500),
                'max_depth': ('int_none', 10, 50),
                'min_samples_split': ('int', 2, 20),
                'min_samples_leaf': ('int', 1, 10),
                'max_features': ('categorical', ['sqrt', 'log2', None])
            },
            'logistic_regression': {
                'C': ('loguniform', 0.001, 1000),
                'penalty': ('categorical', ['l1', 'l2']),
                'solver': ('categorical', ['liblinear', 'saga']),
                'max_iter': ('int', 1000, 10000)
            },
            'svm_clf': {
                'C': ('loguniform', 0.1, 1000),
                'kernel': ('categorical', ['linear', 'rbf', 'poly']),
                'gamma': ('categorical', ['scale', 'auto'])
            },
            'svm_reg': {
                'C': ('loguniform', 0.1, 1000),
                'kernel': ('categorical', ['linear', 'rbf', 'poly']),
                'gamma': ('categorical', ['scale', 'auto']),
                'epsilon': ('uniform', 0.01, 0.5)
            },
            'xgboost_clf': {
                'n_estimators': ('int', 50, 1000),
                'max_depth': ('int', 3, 15),
                'learning_rate': ('uniform', 0.01, 0.3),
                'subsample': ('uniform', 0.6, 1.0),
                'colsample_bytree': ('uniform', 0.6, 1.0),
                'reg_alpha': ('loguniform', 0.0001, 10),
                'reg_lambda': ('loguniform', 0.0001, 10)
            },
            'xgboost_reg': {
                'n_estimators': ('int', 50, 1000),
                'max_depth': ('int', 3, 15),
                'learning_rate': ('uniform', 0.01, 0.3),
                'subsample': ('uniform', 0.6, 1.0),
                'colsample_bytree': ('uniform', 0.6, 1.0),
                'reg_alpha': ('loguniform', 0.0001, 10),
                'reg_lambda': ('loguniform', 0.0001, 10)
            },
            'neural_network_clf': {
                'hidden_layer_sizes': ('categorical', [(50,), (100,), (150,), (50, 50), (100, 50)]),
                'activation': ('categorical', ['relu', 'tanh']),
                'alpha': ('loguniform', 0.00001, 0.1),
                'learning_rate_init': ('loguniform', 0.0001, 0.1)
            },
            'neural_network_reg': {
                'hidden_layer_sizes': ('categorical', [(50,), (100,), (150,), (50, 50), (100, 50)]),
                'activation': ('categorical', ['relu', 'tanh']),
                'alpha': ('loguniform', 0.00001, 0.1),
                'learning_rate_init': ('loguniform', 0.0001, 0.1)
            }
        }
        
        return spaces.get(algorithm, {})
    
    def _grid_search_optimization(
        self, model, X_train, y_train, param_space, cv, scoring, random_state
    ) -> Tuple[BaseEstimator, Dict[str, Any]]:
        """Perform grid search optimization"""
        
        grid_search = GridSearchCV(
            estimator=model,
            param_grid=param_space,
            cv=cv,
            scoring=scoring,
            n_jobs=-1,
            return_train_score=True,
            random_state=random_state
        )
        
        grid_search.fit(X_train, y_train)
        
        # Calculate baseline score for comparison
        baseline_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring=scoring)
        baseline_score = np.mean(baseline_scores)
        
        improvement = grid_search.best_score_ - baseline_score
        
        results = {
            "best_score": grid_search.best_score_,
            "best_params": grid_search.best_params_,
            "baseline_score": baseline_score,
            "improvement": improvement,
            "cv_scores": grid_search.cv_results_['mean_test_score'].tolist(),
            "trials": [
                {
                    "params": dict(zip(grid_search.cv_results_['params'][i].keys(),
                                     grid_search.cv_results_['params'][i].values())),
                    "score": grid_search.cv_results_['mean_test_score'][i],
                    "std": grid_search.cv_results_['std_test_score'][i]
                }
                for i in range(len(grid_search.cv_results_['params']))
            ],
            "n_total_fits": len(grid_search.cv_results_['params'])
        }
        
        return grid_search.best_estimator_, results
    
    def _random_search_optimization(
        self, model, X_train, y_train, param_space, cv, scoring, n_trials, random_state
    ) -> Tuple[BaseEstimator, Dict[str, Any]]:
        """Perform random search optimization"""
        
        random_search = RandomizedSearchCV(
            estimator=model,
            param_distributions=param_space,
            n_iter=n_trials,
            cv=cv,
            scoring=scoring,
            n_jobs=-1,
            return_train_score=True,
            random_state=random_state
        )
        
        random_search.fit(X_train, y_train)
        
        # Calculate baseline score for comparison
        baseline_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring=scoring)
        baseline_score = np.mean(baseline_scores)
        
        improvement = random_search.best_score_ - baseline_score
        
        results = {
            "best_score": random_search.best_score_,
            "best_params": random_search.best_params_,
            "baseline_score": baseline_score,
            "improvement": improvement,
            "cv_scores": random_search.cv_results_['mean_test_score'].tolist(),
            "trials": [
                {
                    "params": dict(zip(random_search.cv_results_['params'][i].keys(),
                                     random_search.cv_results_['params'][i].values())),
                    "score": random_search.cv_results_['mean_test_score'][i],
                    "std": random_search.cv_results_['std_test_score'][i]
                }
                for i in range(len(random_search.cv_results_['params']))
            ],
            "n_total_fits": len(random_search.cv_results_['params'])
        }
        
        return random_search.best_estimator_, results
    
    def _bayesian_optimization(
        self, model, X_train, y_train, param_space, cv, scoring, n_trials, random_state, time_budget
    ) -> Tuple[BaseEstimator, Dict[str, Any]]:
        """Perform Bayesian optimization using Optuna"""
        
        # Calculate baseline score for comparison
        baseline_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring=scoring)
        baseline_score = np.mean(baseline_scores)
        
        def objective(trial):
            # Build parameters from trial
            params = {}
            for param_name, param_config in param_space.items():
                param_type = param_config[0]
                
                if param_type == 'int':
                    params[param_name] = trial.suggest_int(param_name, param_config[1], param_config[2])
                elif param_type == 'int_none':
                    # Special handling for parameters that can be None or int
                    if trial.suggest_categorical(f"{param_name}_use_none", [True, False]):
                        params[param_name] = None
                    else:
                        params[param_name] = trial.suggest_int(param_name, param_config[1], param_config[2])
                elif param_type == 'uniform':
                    params[param_name] = trial.suggest_uniform(param_name, param_config[1], param_config[2])
                elif param_type == 'loguniform':
                    params[param_name] = trial.suggest_loguniform(param_name, param_config[1], param_config[2])
                elif param_type == 'categorical':
                    params[param_name] = trial.suggest_categorical(param_name, param_config[1])
            
            # Create model with suggested parameters
            model_with_params = model.__class__(**params)
            
            # Evaluate with cross-validation
            scores = cross_val_score(model_with_params, X_train, y_train, cv=cv, scoring=scoring)
            return np.mean(scores)
        
        # Create and run study
        study = optuna.create_study(
            direction='maximize',
            sampler=optuna.samplers.TPESampler(seed=random_state)
        )
        
        if time_budget:
            study.optimize(objective, n_trials=n_trials, timeout=time_budget)
        else:
            study.optimize(objective, n_trials=n_trials)
        
        # Get best parameters and create best model
        best_params = study.best_params
        
        # Handle special int_none parameters
        processed_params = {}
        for param_name, value in best_params.items():
            if param_name.endswith('_use_none'):
                base_param = param_name.replace('_use_none', '')
                if value and base_param not in processed_params:
                    processed_params[base_param] = None
            elif not param_name.endswith('_use_none'):
                if param_name not in processed_params:  # Don't override None values
                    processed_params[param_name] = value
        
        best_model = model.__class__(**processed_params)
        best_model.fit(X_train, y_train)
        
        improvement = study.best_value - baseline_score
        
        results = {
            "best_score": study.best_value,
            "best_params": processed_params,
            "baseline_score": baseline_score,
            "improvement": improvement,
            "trials": [
                {
                    "params": trial.params,
                    "score": trial.value if trial.value is not None else -np.inf,
                    "trial_number": trial.number
                }
                for trial in study.trials
            ],
            "n_total_fits": len(study.trials),
            "optimization_history": [
                {
                    "trial": i,
                    "best_score": study.trials[i].value if study.trials[i].value is not None else -np.inf
                }
                for i in range(len(study.trials))
            ]
        }
        
        return best_model, results
    
    def get_optimization_recommendations(self, algorithm: str, data_shape: Tuple[int, int]) -> Dict[str, Any]:
        """Get optimization recommendations based on algorithm and data"""
        n_samples, n_features = data_shape
        
        recommendations = {
            "algorithm": algorithm,
            "data_shape": data_shape,
            "recommendations": []
        }
        
        # Method recommendation
        if n_samples < 1000 and n_features < 20:
            method = "grid"
            reason = "Small dataset - grid search will be comprehensive and fast"
        elif algorithm in ["neural_network_clf", "neural_network_reg", "xgboost_clf", "xgboost_reg"]:
            method = "bayesian"
            reason = "Complex algorithm - Bayesian optimization more efficient for large parameter spaces"
        else:
            method = "random"
            reason = "Medium-sized problem - random search provides good balance of exploration and speed"
        
        recommendations["recommended_method"] = method
        recommendations["recommendations"].append({
            "type": "method",
            "recommendation": method,
            "reason": reason
        })
        
        # Trial count recommendation
        if method == "random":
            n_trials = min(200, max(50, n_samples // 50))
        elif method == "bayesian":
            n_trials = min(300, max(100, n_samples // 30))
        else:
            n_trials = None
        
        if n_trials:
            recommendations["recommended_trials"] = n_trials
            recommendations["recommendations"].append({
                "type": "trials",
                "recommendation": n_trials,
                "reason": f"Optimal trial count for {method} search with {n_samples} samples"
            })
        
        # CV folds recommendation
        cv_folds = min(10, max(3, n_samples // 200))
        recommendations["recommended_cv_folds"] = cv_folds
        recommendations["recommendations"].append({
            "type": "cv_folds",
            "recommendation": cv_folds,
            "reason": f"Appropriate cross-validation for {n_samples} samples"
        })
        
        # Time budget recommendation
        if n_samples > 10000:
            time_budget = 1800  # 30 minutes
            recommendations["recommended_time_budget"] = time_budget
            recommendations["recommendations"].append({
                "type": "time_budget",
                "recommendation": f"{time_budget // 60} minutes",
                "reason": "Large dataset - time budget recommended to prevent excessive runtime"
            })
        
        return recommendations
    
    def export_optimization_history(self, optimization_id: str = None) -> Dict[str, Any]:
        """Export optimization history for analysis"""
        if optimization_id:
            return self.optimization_history.get(optimization_id, {})
        else:
            return self.optimization_history

# Global service instance
hyperparameter_optimizer = HyperparameterOptimizer()