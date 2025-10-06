"""
Feature Engineering API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Dict, List, Any, Optional
import pandas as pd
import io
import json
from pydantic import BaseModel

from services.feature_engineering_service import feature_engineering_service
from core.security import get_current_user

router = APIRouter(prefix="/api/feature-engineering", tags=["Feature Engineering"])

class FeatureEngineeringOperation(BaseModel):
    type: str
    column: Optional[str] = None
    threshold: Optional[float] = None
    k: Optional[int] = None
    n_components: Optional[int] = None
    reason: Optional[str] = None

class FeatureEngineeringRequest(BaseModel):
    operations: List[FeatureEngineeringOperation]
    target_column: Optional[str] = None

@router.post("/analyze")
async def analyze_data_for_feature_engineering(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),
    current_user = Depends(get_current_user)
):
    """
    Analyze uploaded data and suggest feature engineering strategies
    """
    try:
        # Read uploaded file
        if file.content_type not in ['text/csv', 'application/vnd.ms-excel']:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
        
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Validate target column
        if target_column and target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found in data")
        
        # Perform analysis
        analysis = feature_engineering_service.analyze_data_for_feature_engineering(df, target_column)
        
        return {
            "status": "success",
            "analysis": analysis,
            "file_info": {
                "filename": file.filename,
                "shape": df.shape,
                "columns": df.columns.tolist()
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/apply")
async def apply_feature_engineering(
    file: UploadFile = File(...),
    operations: str = Form(...),  # JSON string of operations
    target_column: Optional[str] = Form(None),
    current_user = Depends(get_current_user)
):
    """
    Apply selected feature engineering operations to the data
    """
    try:
        # Parse operations
        try:
            operations_list = json.loads(operations)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid operations format")
        
        # Read uploaded file
        if file.content_type not in ['text/csv', 'application/vnd.ms-excel']:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
        
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Validate target column
        if target_column and target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found in data")
        
        # Apply feature engineering
        result_df, transformation_info = feature_engineering_service.apply_feature_engineering(
            df, operations_list, target_column
        )
        
        # Convert result to CSV for download
        csv_buffer = io.StringIO()
        result_df.to_csv(csv_buffer, index=False)
        csv_content = csv_buffer.getvalue()
        
        return {
            "status": "success",
            "transformation_info": transformation_info,
            "csv_data": csv_content,
            "original_shape": df.shape,
            "final_shape": result_df.shape,
            "sample_data": result_df.head(5).to_dict('records')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature engineering failed: {str(e)}")

@router.get("/operation-types")
async def get_available_operation_types(current_user = Depends(get_current_user)):
    """
    Get list of available feature engineering operation types
    """
    return {
        "encoding": [
            {
                "type": "one_hot",
                "name": "One-Hot Encoding",
                "description": "Convert categorical variables to binary columns",
                "suitable_for": ["Low cardinality categorical data"],
                "parameters": []
            },
            {
                "type": "label",
                "name": "Label Encoding",
                "description": "Convert categorical variables to numeric labels",
                "suitable_for": ["Ordinal categorical data"],
                "parameters": []
            },
            {
                "type": "target",
                "name": "Target Encoding",
                "description": "Encode categories based on target variable mean",
                "suitable_for": ["High cardinality categorical data"],
                "parameters": ["target_column"]
            }
        ],
        "scaling": [
            {
                "type": "standard",
                "name": "Standard Scaling",
                "description": "Scale features to have mean=0 and std=1",
                "suitable_for": ["Normally distributed numeric data"],
                "parameters": []
            },
            {
                "type": "minmax",
                "name": "Min-Max Scaling",
                "description": "Scale features to range [0, 1]",
                "suitable_for": ["Non-negative numeric data"],
                "parameters": []
            },
            {
                "type": "robust",
                "name": "Robust Scaling",
                "description": "Scale using median and IQR",
                "suitable_for": ["Data with outliers"],
                "parameters": []
            },
            {
                "type": "power_transform",
                "name": "Power Transform",
                "description": "Apply Yeo-Johnson transformation",
                "suitable_for": ["Skewed numeric data"],
                "parameters": []
            }
        ],
        "feature_creation": [
            {
                "type": "datetime_features",
                "name": "DateTime Features",
                "description": "Extract temporal features from datetime columns",
                "suitable_for": ["DateTime columns"],
                "parameters": []
            },
            {
                "type": "polynomial",
                "name": "Polynomial Features",
                "description": "Create polynomial features (squared, cubed)",
                "suitable_for": ["Numeric columns with non-linear relationships"],
                "parameters": []
            }
        ],
        "feature_selection": [
            {
                "type": "correlation_filter",
                "name": "Correlation Filter",
                "description": "Remove highly correlated features",
                "suitable_for": ["Datasets with multicollinearity"],
                "parameters": [{"name": "threshold", "type": "float", "default": 0.8}]
            },
            {
                "type": "variance_threshold",
                "name": "Variance Threshold",
                "description": "Remove low-variance features",
                "suitable_for": ["Datasets with constant or near-constant features"],
                "parameters": [{"name": "threshold", "type": "float", "default": 0.01}]
            },
            {
                "type": "univariate_selection",
                "name": "Univariate Selection",
                "description": "Select features based on statistical tests",
                "suitable_for": ["High-dimensional datasets"],
                "parameters": [{"name": "k", "type": "int", "default": 10}]
            }
        ],
        "dimensionality_reduction": [
            {
                "type": "pca",
                "name": "Principal Component Analysis",
                "description": "Reduce dimensionality using PCA",
                "suitable_for": ["High-dimensional numeric data"],
                "parameters": [{"name": "n_components", "type": "int", "default": 10}]
            }
        ]
    }

@router.post("/preview-operation")
async def preview_feature_engineering_operation(
    file: UploadFile = File(...),
    operation: str = Form(...),  # JSON string of single operation
    target_column: Optional[str] = Form(None),
    current_user = Depends(get_current_user)
):
    """
    Preview the effect of a single feature engineering operation
    """
    try:
        # Parse operation
        try:
            operation_dict = json.loads(operation)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid operation format")
        
        # Read uploaded file (sample only)
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Take a sample for preview (first 100 rows)
        df_sample = df.head(100)
        
        # Apply single operation
        result_df, transformation_info = feature_engineering_service.apply_feature_engineering(
            df_sample, [operation_dict], target_column
        )
        
        return {
            "status": "success",
            "operation": operation_dict,
            "transformation_info": transformation_info,
            "before_sample": df_sample.head(5).to_dict('records'),
            "after_sample": result_df.head(5).to_dict('records'),
            "before_columns": df_sample.columns.tolist(),
            "after_columns": result_df.columns.tolist(),
            "shape_change": {
                "before": df_sample.shape,
                "after": result_df.shape
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")

@router.get("/recommendations/{algorithm}")
async def get_algorithm_specific_recommendations(
    algorithm: str,
    current_user = Depends(get_current_user)
):
    """
    Get feature engineering recommendations specific to an ML algorithm
    """
    recommendations = {
        "linear_regression": [
            "Standard scaling recommended for all numeric features",
            "One-hot encoding for categorical variables",
            "Remove highly correlated features",
            "Consider polynomial features for non-linear relationships"
        ],
        "random_forest": [
            "Minimal preprocessing required",
            "Label encoding acceptable for categorical variables",
            "Feature selection may improve performance",
            "Handle missing values appropriately"
        ],
        "svm": [
            "Standard or min-max scaling essential",
            "One-hot encoding for categorical variables", 
            "Remove features with low variance",
            "Consider PCA for high-dimensional data"
        ],
        "neural_network": [
            "Standard scaling critical for convergence",
            "One-hot encoding for categorical variables",
            "Feature selection to reduce complexity",
            "Consider dimensionality reduction"
        ],
        "xgboost": [
            "Minimal preprocessing required",
            "Label encoding for categorical variables",
            "Handle missing values (XGBoost can handle them)",
            "Feature engineering can significantly improve performance"
        ]
    }
    
    return {
        "algorithm": algorithm,
        "recommendations": recommendations.get(algorithm, [
            "Apply standard preprocessing steps",
            "Scale numeric features appropriately",
            "Encode categorical variables",
            "Consider feature selection"
        ])
    }