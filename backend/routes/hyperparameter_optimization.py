"""
Hyperparameter Optimization API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import pandas as pd
import joblib
import os
import json

from services.hyperparameter_optimization import hyperparameter_optimizer
from core.security import get_current_user
from core.database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/hyperparameter-optimization", tags=["Hyperparameter Optimization"])

class OptimizationRequest(BaseModel):
    model_id: str
    algorithm: str
    optimization_method: Optional[str] = "auto"
    n_trials: Optional[int] = None
    cv_folds: Optional[int] = None
    scoring: Optional[str] = None
    time_budget: Optional[int] = None
    random_state: Optional[int] = 42

class OptimizationConfig(BaseModel):
    algorithm: str
    data_shape: List[int]  # [n_samples, n_features]

@router.post("/recommendations")
async def get_optimization_recommendations(
    config: OptimizationConfig,
    current_user = Depends(get_current_user)
):
    """
    Get hyperparameter optimization recommendations based on algorithm and data
    """
    try:
        recommendations = hyperparameter_optimizer.get_optimization_recommendations(
            algorithm=config.algorithm,
            data_shape=tuple(config.data_shape)
        )
        
        return {
            "status": "success",
            "recommendations": recommendations
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")

@router.post("/optimize")
async def optimize_model_hyperparameters(
    request: OptimizationRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Optimize hyperparameters for a trained model
    """
    try:
        # Load model and training data
        model_path = f"models/{request.model_id}/model.joblib"
        data_path = f"models/{request.model_id}/training_data.csv"
        
        if not os.path.exists(model_path) or not os.path.exists(data_path):
            raise HTTPException(status_code=404, detail="Model or training data not found")
        
        model = joblib.load(model_path)
        
        # Load training data
        df = pd.read_csv(data_path)
        
        # Load model metadata to get target column
        metadata_path = f"models/{request.model_id}/metadata.json"
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            target_column = metadata.get('target_column')
        else:
            raise HTTPException(status_code=400, detail="Model metadata not found")
        
        if target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found in data")
        
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Start optimization in background
        background_tasks.add_task(
            run_optimization,
            model, X, y, request, current_user.id
        )
        
        return {
            "status": "started",
            "message": "Hyperparameter optimization started",
            "model_id": request.model_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start optimization: {str(e)}")

async def run_optimization(model, X, y, request: OptimizationRequest, user_id: int):
    """Run hyperparameter optimization in background"""
    try:
        optimized_model, results = hyperparameter_optimizer.optimize_hyperparameters(
            model=model,
            X_train=X,
            y_train=y,
            algorithm=request.algorithm,
            optimization_method=request.optimization_method,
            n_trials=request.n_trials,
            cv_folds=request.cv_folds,
            scoring=request.scoring,
            time_budget=request.time_budget,
            random_state=request.random_state
        )
        
        # Save optimized model
        optimized_model_path = f"models/{request.model_id}/optimized_model.joblib"
        os.makedirs(os.path.dirname(optimized_model_path), exist_ok=True)
        joblib.dump(optimized_model, optimized_model_path)
        
        # Save optimization results
        results_path = f"models/{request.model_id}/optimization_results.json"
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"Optimization completed for model {request.model_id}")
        
    except Exception as e:
        print(f"Optimization failed for model {request.model_id}: {str(e)}")

@router.get("/results/{model_id}")
async def get_optimization_results(
    model_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get optimization results for a model
    """
    try:
        results_path = f"models/{model_id}/optimization_results.json"
        
        if not os.path.exists(results_path):
            raise HTTPException(status_code=404, detail="Optimization results not found")
        
        with open(results_path, 'r') as f:
            results = json.load(f)
        
        return {
            "status": "success",
            "model_id": model_id,
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get optimization results: {str(e)}")

@router.get("/history")
async def get_optimization_history(
    optimization_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get optimization history
    """
    try:
        history = hyperparameter_optimizer.export_optimization_history(optimization_id)
        
        return {
            "status": "success",
            "history": history
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get optimization history: {str(e)}")

@router.get("/parameter-spaces/{algorithm}")
async def get_parameter_space(
    algorithm: str,
    method: str = "grid",
    current_user = Depends(get_current_user)
):
    """
    Get parameter space for a specific algorithm and optimization method
    """
    try:
        # Create a temporary optimizer instance to get parameter space
        param_space = hyperparameter_optimizer._get_parameter_space(algorithm, method)
        
        if not param_space:
            raise HTTPException(status_code=404, detail=f"Parameter space not found for algorithm: {algorithm}")
        
        # Convert complex objects to serializable format
        serializable_space = {}
        for param, values in param_space.items():
            if hasattr(values, 'rvs'):  # scipy distributions
                serializable_space[param] = {
                    "type": "distribution",
                    "distribution": str(type(values).__name__),
                    "description": str(values)
                }
            elif isinstance(values, (list, tuple)):
                serializable_space[param] = {
                    "type": "choices",
                    "values": list(values)
                }
            else:
                serializable_space[param] = {
                    "type": "value",
                    "value": values
                }
        
        return {
            "status": "success",
            "algorithm": algorithm,
            "method": method,
            "parameter_space": serializable_space
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get parameter space: {str(e)}")

@router.get("/supported-algorithms")
async def get_supported_algorithms(current_user = Depends(get_current_user)):
    """
    Get list of algorithms that support hyperparameter optimization
    """
    supported_algorithms = {
        "classification": [
            {
                "key": "random_forest_clf",
                "name": "Random Forest Classifier",
                "description": "Tree-based ensemble method for classification",
                "optimization_methods": ["grid", "random", "bayesian"],
                "key_parameters": ["n_estimators", "max_depth", "min_samples_split", "max_features"]
            },
            {
                "key": "logistic_regression",
                "name": "Logistic Regression",
                "description": "Linear model for binary and multiclass classification",
                "optimization_methods": ["grid", "random", "bayesian"],
                "key_parameters": ["C", "penalty", "solver", "max_iter"]
            },
            {
                "key": "svm_clf",
                "name": "Support Vector Machine Classifier",
                "description": "Support vector machine for classification",
                "optimization_methods": ["grid", "random", "bayesian"],
                "key_parameters": ["C", "kernel", "gamma"]
            },
            {
                "key": "xgboost_clf",
                "name": "XGBoost Classifier",
                "description": "Gradient boosting framework for classification",
                "optimization_methods": ["grid", "random", "bayesian"],
                "key_parameters": ["n_estimators", "max_depth", "learning_rate", "subsample"]
            },
            {
                "key": "neural_network_clf",
                "name": "Neural Network Classifier",
                "description": "Multi-layer perceptron for classification",
                "optimization_methods": ["grid", "random", "bayesian"],
                "key_parameters": ["hidden_layer_sizes", "activation", "alpha", "learning_rate"]
            }
        ],
        "regression": [
            {
                "key": "random_forest_reg",
                "name": "Random Forest Regressor",
                "description": "Tree-based ensemble method for regression",
                "optimization_methods": ["grid", "random", "bayesian"],
                "key_parameters": ["n_estimators", "max_depth", "min_samples_split", "max_features"]
            },
            {
                "key": "svm_reg",
                "name": "Support Vector Machine Regressor",
                "description": "Support vector machine for regression",
                "optimization_methods": ["grid", "random", "bayesian"],
                "key_parameters": ["C", "kernel", "gamma", "epsilon"]
            },
            {
                "key": "xgboost_reg",
                "name": "XGBoost Regressor",
                "description": "Gradient boosting framework for regression",
                "optimization_methods": ["grid", "random", "bayesian"],
                "key_parameters": ["n_estimators", "max_depth", "learning_rate", "subsample"]
            },
            {
                "key": "neural_network_reg",
                "name": "Neural Network Regressor",
                "description": "Multi-layer perceptron for regression",
                "optimization_methods": ["grid", "random", "bayesian"],
                "key_parameters": ["hidden_layer_sizes", "activation", "alpha", "learning_rate"]
            }
        ]
    }
    
    return {
        "status": "success",
        "supported_algorithms": supported_algorithms,
        "total_algorithms": sum(len(algs) for algs in supported_algorithms.values())
    }

@router.post("/compare-optimization-methods")
async def compare_optimization_methods(
    config: OptimizationConfig,
    current_user = Depends(get_current_user)
):
    """
    Compare different optimization methods for a given algorithm and dataset
    """
    try:
        algorithm = config.algorithm
        data_shape = tuple(config.data_shape)
        
        methods = ["grid", "random", "bayesian"]
        comparison = {
            "algorithm": algorithm,
            "data_shape": data_shape,
            "methods": {}
        }
        
        for method in methods:
            # Get parameter space size estimation
            param_space = hyperparameter_optimizer._get_parameter_space(algorithm, method)
            
            # Estimate search space size
            if method == "grid":
                if param_space:
                    space_size = 1
                    for param, values in param_space.items():
                        if isinstance(values, (list, tuple)):
                            space_size *= len(values)
                    estimated_time = space_size * 0.1  # Rough estimate: 0.1 seconds per evaluation
                else:
                    space_size = 0
                    estimated_time = 0
            else:
                # For random and Bayesian, use default trial counts
                space_size = hyperparameter_optimizer._get_default_trials(method, data_shape)
                estimated_time = space_size * 0.2 if space_size else 0
            
            # Get recommendations for this method
            if data_shape[0] < 1000 and data_shape[1] < 20 and method == "grid":
                suitability = "high"
                reason = "Small dataset - grid search is comprehensive and fast"
            elif algorithm in ["neural_network_clf", "neural_network_reg", "xgboost_clf", "xgboost_reg"] and method == "bayesian":
                suitability = "high"
                reason = "Complex algorithm - Bayesian optimization handles large parameter spaces efficiently"
            elif method == "random":
                suitability = "medium"
                reason = "Good balance between exploration and computational cost"
            else:
                suitability = "low"
                reason = "Less suitable for this combination of algorithm and data size"
            
            comparison["methods"][method] = {
                "estimated_evaluations": space_size,
                "estimated_time_minutes": round(estimated_time / 60, 1) if estimated_time else 0,
                "suitability": suitability,
                "reason": reason,
                "pros": get_method_pros(method),
                "cons": get_method_cons(method)
            }
        
        return {
            "status": "success",
            "comparison": comparison
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compare optimization methods: {str(e)}")

def get_method_pros(method: str) -> List[str]:
    """Get pros for each optimization method"""
    pros = {
        "grid": [
            "Exhaustive search of parameter space",
            "Guaranteed to find optimal combination in grid",
            "Deterministic results",
            "Simple to understand and implement"
        ],
        "random": [
            "More efficient than grid search for high-dimensional spaces",
            "Better coverage of parameter space",
            "Can find good solutions quickly",
            "Less prone to curse of dimensionality"
        ],
        "bayesian": [
            "Most efficient for expensive evaluations",
            "Learns from previous trials",
            "Can handle complex parameter relationships",
            "Adaptive sampling strategy"
        ]
    }
    return pros.get(method, [])

def get_method_cons(method: str) -> List[str]:
    """Get cons for each optimization method"""
    cons = {
        "grid": [
            "Exponential growth with parameter dimensions",
            "Inefficient for large parameter spaces",
            "May miss optimal combinations between grid points",
            "Computationally expensive"
        ],
        "random": [
            "No guarantee of finding global optimum",
            "May require many iterations for complex spaces",
            "Random sampling can be inefficient",
            "Results vary between runs"
        ],
        "bayesian": [
            "More complex to implement and understand",
            "Overhead from surrogate model training",
            "May converge to local optima",
            "Requires more initial trials to be effective"
        ]
    }
    return cons.get(method, [])