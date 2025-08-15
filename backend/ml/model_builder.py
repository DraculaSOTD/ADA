"""
Model Builder Service
Dynamic model construction based on configuration
"""

import json
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class FrameworkType(Enum):
    """Supported ML frameworks"""
    SKLEARN = "sklearn"
    TENSORFLOW = "tensorflow"
    PYTORCH = "pytorch"
    XGBOOST = "xgboost"
    LIGHTGBM = "lightgbm"
    CATBOOST = "catboost"


@dataclass
class ModelArchitecture:
    """Model architecture definition"""
    framework: FrameworkType
    model_type: str
    layers: Optional[List[Dict]] = None
    hyperparameters: Dict[str, Any] = None
    input_shape: Optional[Tuple] = None
    output_shape: Optional[Tuple] = None
    loss_function: Optional[str] = None
    optimizer: Optional[str] = None
    metrics: Optional[List[str]] = None


class ModelBuilder:
    """Dynamic model builder for various frameworks"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.supported_frameworks = self._initialize_frameworks()
    
    def _initialize_frameworks(self) -> Dict:
        """Initialize supported frameworks"""
        frameworks = {}
        
        # Check available frameworks
        try:
            import sklearn
            frameworks[FrameworkType.SKLEARN] = True
        except ImportError:
            frameworks[FrameworkType.SKLEARN] = False
        
        try:
            import tensorflow as tf
            frameworks[FrameworkType.TENSORFLOW] = True
        except ImportError:
            frameworks[FrameworkType.TENSORFLOW] = False
        
        try:
            import torch
            frameworks[FrameworkType.PYTORCH] = True
        except ImportError:
            frameworks[FrameworkType.PYTORCH] = False
        
        try:
            import xgboost
            frameworks[FrameworkType.XGBOOST] = True
        except ImportError:
            frameworks[FrameworkType.XGBOOST] = False
        
        try:
            import lightgbm
            frameworks[FrameworkType.LIGHTGBM] = True
        except ImportError:
            frameworks[FrameworkType.LIGHTGBM] = False
        
        try:
            import catboost
            frameworks[FrameworkType.CATBOOST] = True
        except ImportError:
            frameworks[FrameworkType.CATBOOST] = False
        
        return frameworks
    
    async def build_model(self, architecture: ModelArchitecture) -> Any:
        """Build model based on architecture"""
        try:
            # Check if framework is available
            if not self.supported_frameworks.get(architecture.framework):
                raise ValueError(f"Framework {architecture.framework.value} is not available")
            
            # Build model based on framework
            if architecture.framework == FrameworkType.SKLEARN:
                return await self._build_sklearn_model(architecture)
            elif architecture.framework == FrameworkType.TENSORFLOW:
                return await self._build_tensorflow_model(architecture)
            elif architecture.framework == FrameworkType.PYTORCH:
                return await self._build_pytorch_model(architecture)
            elif architecture.framework == FrameworkType.XGBOOST:
                return await self._build_xgboost_model(architecture)
            elif architecture.framework == FrameworkType.LIGHTGBM:
                return await self._build_lightgbm_model(architecture)
            elif architecture.framework == FrameworkType.CATBOOST:
                return await self._build_catboost_model(architecture)
            else:
                raise ValueError(f"Unsupported framework: {architecture.framework}")
            
        except Exception as e:
            logger.error(f"Model building failed: {str(e)}")
            raise
    
    async def _build_sklearn_model(self, architecture: ModelArchitecture) -> Any:
        """Build scikit-learn model"""
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
        from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso, ElasticNet
        from sklearn.svm import SVC, SVR
        from sklearn.naive_bayes import GaussianNB, MultinomialNB
        from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
        from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
        from sklearn.neural_network import MLPClassifier, MLPRegressor
        from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
        
        model_map = {
            # Classification
            'random_forest_classifier': RandomForestClassifier,
            'gradient_boosting_classifier': GradientBoostingClassifier,
            'logistic_regression': LogisticRegression,
            'svm_classifier': SVC,
            'naive_bayes': GaussianNB,
            'multinomial_nb': MultinomialNB,
            'knn_classifier': KNeighborsClassifier,
            'decision_tree_classifier': DecisionTreeClassifier,
            'mlp_classifier': MLPClassifier,
            
            # Regression
            'random_forest_regressor': RandomForestRegressor,
            'gradient_boosting_regressor': GradientBoostingRegressor,
            'linear_regression': LinearRegression,
            'ridge_regression': Ridge,
            'lasso_regression': Lasso,
            'elastic_net': ElasticNet,
            'svm_regressor': SVR,
            'knn_regressor': KNeighborsRegressor,
            'decision_tree_regressor': DecisionTreeRegressor,
            'mlp_regressor': MLPRegressor,
            
            # Clustering
            'kmeans': KMeans,
            'dbscan': DBSCAN,
            'agglomerative_clustering': AgglomerativeClustering
        }
        
        model_class = model_map.get(architecture.model_type)
        if not model_class:
            raise ValueError(f"Unknown sklearn model type: {architecture.model_type}")
        
        # Initialize with hyperparameters
        hyperparams = architecture.hyperparameters or {}
        model = model_class(**hyperparams)
        
        return model
    
    async def _build_tensorflow_model(self, architecture: ModelArchitecture) -> Any:
        """Build TensorFlow/Keras model"""
        import tensorflow as tf
        from tensorflow import keras
        from tensorflow.keras import layers, models
        
        # Create model
        if architecture.layers:
            # Custom architecture
            model = models.Sequential()
            
            for i, layer_config in enumerate(architecture.layers):
                layer_type = layer_config.get('type')
                layer_params = layer_config.get('params', {})
                
                # Add input shape to first layer
                if i == 0 and architecture.input_shape:
                    layer_params['input_shape'] = architecture.input_shape
                
                # Create layer based on type
                if layer_type == 'dense':
                    layer = layers.Dense(**layer_params)
                elif layer_type == 'conv2d':
                    layer = layers.Conv2D(**layer_params)
                elif layer_type == 'maxpool2d':
                    layer = layers.MaxPooling2D(**layer_params)
                elif layer_type == 'dropout':
                    layer = layers.Dropout(**layer_params)
                elif layer_type == 'flatten':
                    layer = layers.Flatten(**layer_params)
                elif layer_type == 'lstm':
                    layer = layers.LSTM(**layer_params)
                elif layer_type == 'gru':
                    layer = layers.GRU(**layer_params)
                elif layer_type == 'embedding':
                    layer = layers.Embedding(**layer_params)
                elif layer_type == 'batchnorm':
                    layer = layers.BatchNormalization(**layer_params)
                elif layer_type == 'activation':
                    layer = layers.Activation(**layer_params)
                else:
                    raise ValueError(f"Unknown layer type: {layer_type}")
                
                model.add(layer)
        
        else:
            # Predefined architectures
            if architecture.model_type == 'simple_nn':
                model = models.Sequential([
                    layers.Dense(128, activation='relu', input_shape=architecture.input_shape),
                    layers.Dropout(0.2),
                    layers.Dense(64, activation='relu'),
                    layers.Dropout(0.2),
                    layers.Dense(architecture.output_shape[0], activation='softmax')
                ])
            
            elif architecture.model_type == 'cnn':
                model = models.Sequential([
                    layers.Conv2D(32, (3, 3), activation='relu', input_shape=architecture.input_shape),
                    layers.MaxPooling2D((2, 2)),
                    layers.Conv2D(64, (3, 3), activation='relu'),
                    layers.MaxPooling2D((2, 2)),
                    layers.Conv2D(64, (3, 3), activation='relu'),
                    layers.Flatten(),
                    layers.Dense(64, activation='relu'),
                    layers.Dense(architecture.output_shape[0], activation='softmax')
                ])
            
            elif architecture.model_type == 'lstm':
                model = models.Sequential([
                    layers.LSTM(128, return_sequences=True, input_shape=architecture.input_shape),
                    layers.LSTM(64),
                    layers.Dense(architecture.output_shape[0])
                ])
            
            else:
                raise ValueError(f"Unknown TensorFlow model type: {architecture.model_type}")
        
        # Compile model
        optimizer = architecture.optimizer or 'adam'
        loss = architecture.loss_function or 'categorical_crossentropy'
        metrics = architecture.metrics or ['accuracy']
        
        model.compile(optimizer=optimizer, loss=loss, metrics=metrics)
        
        return model
    
    async def _build_pytorch_model(self, architecture: ModelArchitecture) -> Any:
        """Build PyTorch model"""
        import torch
        import torch.nn as nn
        
        class DynamicNet(nn.Module):
            def __init__(self, architecture):
                super(DynamicNet, self).__init__()
                self.layers = nn.ModuleList()
                
                if architecture.layers:
                    for layer_config in architecture.layers:
                        layer_type = layer_config.get('type')
                        layer_params = layer_config.get('params', {})
                        
                        if layer_type == 'linear':
                            layer = nn.Linear(**layer_params)
                        elif layer_type == 'conv2d':
                            layer = nn.Conv2d(**layer_params)
                        elif layer_type == 'maxpool2d':
                            layer = nn.MaxPool2d(**layer_params)
                        elif layer_type == 'dropout':
                            layer = nn.Dropout(**layer_params)
                        elif layer_type == 'relu':
                            layer = nn.ReLU()
                        elif layer_type == 'sigmoid':
                            layer = nn.Sigmoid()
                        elif layer_type == 'softmax':
                            layer = nn.Softmax(**layer_params)
                        elif layer_type == 'lstm':
                            layer = nn.LSTM(**layer_params)
                        elif layer_type == 'gru':
                            layer = nn.GRU(**layer_params)
                        elif layer_type == 'batchnorm1d':
                            layer = nn.BatchNorm1d(**layer_params)
                        elif layer_type == 'batchnorm2d':
                            layer = nn.BatchNorm2d(**layer_params)
                        else:
                            raise ValueError(f"Unknown layer type: {layer_type}")
                        
                        self.layers.append(layer)
            
            def forward(self, x):
                for layer in self.layers:
                    x = layer(x)
                return x
        
        # Create model instance
        model = DynamicNet(architecture)
        
        # Set device
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = model.to(device)
        
        return model
    
    async def _build_xgboost_model(self, architecture: ModelArchitecture) -> Any:
        """Build XGBoost model"""
        import xgboost as xgb
        
        model_map = {
            'classifier': xgb.XGBClassifier,
            'regressor': xgb.XGBRegressor,
            'ranker': xgb.XGBRanker
        }
        
        model_class = model_map.get(architecture.model_type, xgb.XGBClassifier)
        
        # Initialize with hyperparameters
        hyperparams = architecture.hyperparameters or {}
        model = model_class(**hyperparams)
        
        return model
    
    async def _build_lightgbm_model(self, architecture: ModelArchitecture) -> Any:
        """Build LightGBM model"""
        import lightgbm as lgb
        
        model_map = {
            'classifier': lgb.LGBMClassifier,
            'regressor': lgb.LGBMRegressor,
            'ranker': lgb.LGBMRanker
        }
        
        model_class = model_map.get(architecture.model_type, lgb.LGBMClassifier)
        
        # Initialize with hyperparameters
        hyperparams = architecture.hyperparameters or {}
        model = model_class(**hyperparams)
        
        return model
    
    async def _build_catboost_model(self, architecture: ModelArchitecture) -> Any:
        """Build CatBoost model"""
        import catboost as cb
        
        model_map = {
            'classifier': cb.CatBoostClassifier,
            'regressor': cb.CatBoostRegressor
        }
        
        model_class = model_map.get(architecture.model_type, cb.CatBoostClassifier)
        
        # Initialize with hyperparameters
        hyperparams = architecture.hyperparameters or {}
        model = model_class(**hyperparams)
        
        return model
    
    async def validate_architecture(self, architecture: ModelArchitecture) -> Dict[str, Any]:
        """Validate model architecture"""
        errors = []
        warnings = []
        
        # Check framework availability
        if not self.supported_frameworks.get(architecture.framework):
            errors.append(f"Framework {architecture.framework.value} is not installed")
        
        # Validate layers if provided
        if architecture.layers:
            for i, layer in enumerate(architecture.layers):
                if 'type' not in layer:
                    errors.append(f"Layer {i} missing 'type' field")
                
                # Check layer compatibility
                if i > 0:
                    prev_layer = architecture.layers[i-1]
                    if not self._check_layer_compatibility(prev_layer, layer):
                        warnings.append(f"Potential incompatibility between layers {i-1} and {i}")
        
        # Validate hyperparameters
        if architecture.hyperparameters:
            validation = self._validate_hyperparameters(
                architecture.framework,
                architecture.model_type,
                architecture.hyperparameters
            )
            errors.extend(validation.get('errors', []))
            warnings.extend(validation.get('warnings', []))
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }
    
    def _check_layer_compatibility(self, prev_layer: Dict, curr_layer: Dict) -> bool:
        """Check if two layers are compatible"""
        # Basic compatibility checks
        prev_type = prev_layer.get('type')
        curr_type = curr_layer.get('type')
        
        # Add specific compatibility rules
        incompatible_pairs = [
            ('flatten', 'conv2d'),
            ('maxpool2d', 'linear'),
        ]
        
        return (prev_type, curr_type) not in incompatible_pairs
    
    def _validate_hyperparameters(self, framework: FrameworkType, 
                                 model_type: str, 
                                 hyperparameters: Dict) -> Dict:
        """Validate hyperparameters for specific model"""
        errors = []
        warnings = []
        
        # Framework-specific validation
        if framework == FrameworkType.SKLEARN:
            if model_type.startswith('random_forest'):
                if 'n_estimators' in hyperparameters:
                    if hyperparameters['n_estimators'] < 10:
                        warnings.append("n_estimators < 10 may lead to poor performance")
                    if hyperparameters['n_estimators'] > 1000:
                        warnings.append("n_estimators > 1000 may be computationally expensive")
        
        elif framework == FrameworkType.TENSORFLOW:
            if 'learning_rate' in hyperparameters:
                lr = hyperparameters['learning_rate']
                if lr <= 0 or lr >= 1:
                    errors.append("learning_rate should be between 0 and 1")
        
        return {'errors': errors, 'warnings': warnings}
    
    async def get_model_summary(self, model: Any, framework: FrameworkType) -> Dict:
        """Get model summary information"""
        summary = {
            'framework': framework.value,
            'type': type(model).__name__
        }
        
        if framework == FrameworkType.TENSORFLOW:
            import tensorflow as tf
            if isinstance(model, tf.keras.Model):
                # Get model summary
                stringlist = []
                model.summary(print_fn=lambda x: stringlist.append(x))
                summary['architecture'] = '\n'.join(stringlist)
                summary['total_params'] = model.count_params()
                summary['trainable_params'] = sum([tf.keras.backend.count_params(w) 
                                                  for w in model.trainable_weights])
        
        elif framework == FrameworkType.PYTORCH:
            import torch
            if isinstance(model, torch.nn.Module):
                summary['total_params'] = sum(p.numel() for p in model.parameters())
                summary['trainable_params'] = sum(p.numel() for p in model.parameters() 
                                                 if p.requires_grad)
        
        elif framework == FrameworkType.SKLEARN:
            if hasattr(model, 'get_params'):
                summary['parameters'] = model.get_params()
        
        return summary
    
    async def export_model(self, model: Any, framework: FrameworkType, 
                          export_path: str, format: str = 'native') -> Dict:
        """Export model in various formats"""
        try:
            if framework == FrameworkType.TENSORFLOW:
                import tensorflow as tf
                if format == 'saved_model':
                    tf.saved_model.save(model, export_path)
                elif format == 'h5':
                    model.save(f"{export_path}.h5")
                elif format == 'tflite':
                    converter = tf.lite.TFLiteConverter.from_keras_model(model)
                    tflite_model = converter.convert()
                    with open(f"{export_path}.tflite", 'wb') as f:
                        f.write(tflite_model)
                elif format == 'onnx':
                    import tf2onnx
                    import onnx
                    onnx_model, _ = tf2onnx.convert.from_keras(model)
                    onnx.save(onnx_model, f"{export_path}.onnx")
            
            elif framework == FrameworkType.PYTORCH:
                import torch
                if format == 'torchscript':
                    scripted = torch.jit.script(model)
                    scripted.save(f"{export_path}.pt")
                elif format == 'onnx':
                    import torch.onnx
                    dummy_input = torch.randn(1, *model.input_shape)
                    torch.onnx.export(model, dummy_input, f"{export_path}.onnx")
                elif format == 'state_dict':
                    torch.save(model.state_dict(), f"{export_path}.pth")
            
            elif framework == FrameworkType.SKLEARN:
                import joblib
                import pickle
                if format == 'joblib':
                    joblib.dump(model, f"{export_path}.joblib")
                elif format == 'pickle':
                    with open(f"{export_path}.pkl", 'wb') as f:
                        pickle.dump(model, f)
            
            return {
                'success': True,
                'export_path': export_path,
                'format': format
            }
            
        except Exception as e:
            logger.error(f"Model export failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }