"""
Metrics Collector
Comprehensive system metrics collection and aggregation
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import psutil
import GPUtil
import numpy as np
from collections import defaultdict, deque
import json
import aioredis
import logging

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"
    RATE = "rate"


class MetricLevel(Enum):
    """Metric severity levels"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class MetricPoint:
    """Single metric data point"""
    timestamp: datetime
    value: float
    labels: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MetricDefinition:
    """Definition of a metric"""
    name: str
    type: MetricType
    unit: str
    description: str
    labels: List[str] = field(default_factory=list)
    thresholds: Dict[str, float] = field(default_factory=dict)
    aggregation: str = "avg"  # avg, sum, min, max, last
    retention_days: int = 30


@dataclass
class Alert:
    """Alert definition"""
    alert_id: str
    metric_name: str
    condition: str
    threshold: float
    severity: MetricLevel
    message: str
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class MetricsCollector:
    """
    Comprehensive metrics collection and monitoring system
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.redis_client: Optional[aioredis.Redis] = None
        
        # Metric definitions
        self.metrics: Dict[str, MetricDefinition] = {}
        self._initialize_default_metrics()
        
        # In-memory storage for recent metrics
        self.metric_buffers: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=1000)
        )
        
        # Aggregated metrics
        self.aggregated_metrics: Dict[str, Dict] = {}
        
        # Active alerts
        self.active_alerts: Dict[str, Alert] = {}
        
        # Performance tracking
        self.collection_times: deque = deque(maxlen=100)
        
    def _initialize_default_metrics(self):
        """Initialize default system metrics"""
        # System metrics
        self.register_metric(MetricDefinition(
            name="system.cpu.usage",
            type=MetricType.GAUGE,
            unit="percent",
            description="CPU usage percentage",
            thresholds={"warning": 80, "critical": 95}
        ))
        
        self.register_metric(MetricDefinition(
            name="system.memory.usage",
            type=MetricType.GAUGE,
            unit="percent",
            description="Memory usage percentage",
            thresholds={"warning": 85, "critical": 95}
        ))
        
        self.register_metric(MetricDefinition(
            name="system.disk.usage",
            type=MetricType.GAUGE,
            unit="percent",
            description="Disk usage percentage",
            labels=["mount_point"],
            thresholds={"warning": 80, "critical": 90}
        ))
        
        self.register_metric(MetricDefinition(
            name="system.network.throughput",
            type=MetricType.RATE,
            unit="bytes/sec",
            description="Network throughput",
            labels=["interface", "direction"]
        ))
        
        # Application metrics
        self.register_metric(MetricDefinition(
            name="app.requests.total",
            type=MetricType.COUNTER,
            unit="count",
            description="Total API requests",
            labels=["endpoint", "method", "status"]
        ))
        
        self.register_metric(MetricDefinition(
            name="app.requests.duration",
            type=MetricType.HISTOGRAM,
            unit="milliseconds",
            description="Request duration",
            labels=["endpoint", "method"]
        ))
        
        self.register_metric(MetricDefinition(
            name="app.errors.total",
            type=MetricType.COUNTER,
            unit="count",
            description="Total application errors",
            labels=["error_type", "severity"]
        ))
        
        # Model metrics
        self.register_metric(MetricDefinition(
            name="model.training.duration",
            type=MetricType.HISTOGRAM,
            unit="seconds",
            description="Model training duration",
            labels=["model_type", "dataset"]
        ))
        
        self.register_metric(MetricDefinition(
            name="model.inference.latency",
            type=MetricType.HISTOGRAM,
            unit="milliseconds",
            description="Model inference latency",
            labels=["model_id", "version"]
        ))
        
        self.register_metric(MetricDefinition(
            name="model.accuracy",
            type=MetricType.GAUGE,
            unit="ratio",
            description="Model accuracy score",
            labels=["model_id", "dataset"],
            thresholds={"warning": 0.8, "critical": 0.7}
        ))
        
        # Job metrics
        self.register_metric(MetricDefinition(
            name="jobs.queue.size",
            type=MetricType.GAUGE,
            unit="count",
            description="Job queue size",
            labels=["queue", "priority"],
            thresholds={"warning": 100, "critical": 500}
        ))
        
        self.register_metric(MetricDefinition(
            name="jobs.execution.time",
            type=MetricType.HISTOGRAM,
            unit="seconds",
            description="Job execution time",
            labels=["job_type", "status"]
        ))
        
        # Database metrics
        self.register_metric(MetricDefinition(
            name="database.connections.active",
            type=MetricType.GAUGE,
            unit="count",
            description="Active database connections",
            thresholds={"warning": 80, "critical": 95}
        ))
        
        self.register_metric(MetricDefinition(
            name="database.query.duration",
            type=MetricType.HISTOGRAM,
            unit="milliseconds",
            description="Database query duration",
            labels=["query_type", "table"]
        ))
    
    async def initialize(self):
        """Initialize metrics collector"""
        # Connect to Redis for persistent storage
        redis_url = self.config.get('redis_url', 'redis://localhost:6379')
        self.redis_client = await aioredis.from_url(redis_url)
        
        # Start collection tasks
        asyncio.create_task(self._system_metrics_collector())
        asyncio.create_task(self._aggregation_loop())
        asyncio.create_task(self._alert_checker_loop())
        asyncio.create_task(self._cleanup_loop())
        
        logger.info("Metrics collector initialized")
    
    def register_metric(self, definition: MetricDefinition):
        """Register a new metric"""
        self.metrics[definition.name] = definition
        logger.debug(f"Registered metric: {definition.name}")
    
    # Metric Recording
    async def record_counter(self, name: str, value: float = 1, 
                            labels: Optional[Dict[str, str]] = None):
        """Record a counter metric"""
        await self._record_metric(name, value, MetricType.COUNTER, labels)
    
    async def record_gauge(self, name: str, value: float,
                          labels: Optional[Dict[str, str]] = None):
        """Record a gauge metric"""
        await self._record_metric(name, value, MetricType.GAUGE, labels)
    
    async def record_histogram(self, name: str, value: float,
                              labels: Optional[Dict[str, str]] = None):
        """Record a histogram metric"""
        await self._record_metric(name, value, MetricType.HISTOGRAM, labels)
    
    async def record_timing(self, name: str, duration: float,
                           labels: Optional[Dict[str, str]] = None):
        """Record a timing metric"""
        await self._record_metric(name, duration, MetricType.HISTOGRAM, labels)
    
    async def _record_metric(self, name: str, value: float, 
                            metric_type: MetricType,
                            labels: Optional[Dict[str, str]] = None):
        """Internal method to record a metric"""
        if name not in self.metrics:
            logger.warning(f"Unregistered metric: {name}")
            return
        
        metric_point = MetricPoint(
            timestamp=datetime.utcnow(),
            value=value,
            labels=labels or {}
        )
        
        # Add to buffer
        self.metric_buffers[name].append(metric_point)
        
        # Store in Redis for persistence
        if self.redis_client:
            await self._store_metric(name, metric_point)
        
        # Check for alerts
        await self._check_metric_alert(name, value)
    
    async def _store_metric(self, name: str, point: MetricPoint):
        """Store metric in Redis"""
        key = f"metric:{name}:{point.timestamp.timestamp()}"
        value = {
            'value': point.value,
            'labels': point.labels,
            'metadata': point.metadata
        }
        
        # Store with expiration based on retention
        definition = self.metrics.get(name)
        if definition:
            expire = definition.retention_days * 86400
            await self.redis_client.setex(
                key, expire, json.dumps(value)
            )
    
    # System Metrics Collection
    async def _system_metrics_collector(self):
        """Collect system metrics periodically"""
        while True:
            try:
                start_time = time.time()
                
                # CPU metrics
                cpu_percent = psutil.cpu_percent(interval=1)
                await self.record_gauge("system.cpu.usage", cpu_percent)
                
                # Per-core CPU
                cpu_per_core = psutil.cpu_percent(interval=1, percpu=True)
                for i, percent in enumerate(cpu_per_core):
                    await self.record_gauge(
                        "system.cpu.core.usage",
                        percent,
                        {"core": str(i)}
                    )
                
                # Memory metrics
                memory = psutil.virtual_memory()
                await self.record_gauge("system.memory.usage", memory.percent)
                await self.record_gauge("system.memory.available", 
                                       memory.available / (1024**3),
                                       {"unit": "GB"})
                
                # Disk metrics
                for partition in psutil.disk_partitions():
                    try:
                        usage = psutil.disk_usage(partition.mountpoint)
                        await self.record_gauge(
                            "system.disk.usage",
                            usage.percent,
                            {"mount_point": partition.mountpoint}
                        )
                        await self.record_gauge(
                            "system.disk.free",
                            usage.free / (1024**3),
                            {"mount_point": partition.mountpoint, "unit": "GB"}
                        )
                    except:
                        continue
                
                # Network metrics
                net_io = psutil.net_io_counters(pernic=True)
                for interface, counters in net_io.items():
                    await self.record_gauge(
                        "system.network.bytes",
                        counters.bytes_sent,
                        {"interface": interface, "direction": "sent"}
                    )
                    await self.record_gauge(
                        "system.network.bytes",
                        counters.bytes_recv,
                        {"interface": interface, "direction": "received"}
                    )
                
                # GPU metrics if available
                try:
                    gpus = GPUtil.getGPUs()
                    for i, gpu in enumerate(gpus):
                        await self.record_gauge(
                            "system.gpu.usage",
                            gpu.load * 100,
                            {"gpu_id": str(i), "name": gpu.name}
                        )
                        await self.record_gauge(
                            "system.gpu.memory.usage",
                            gpu.memoryUtil * 100,
                            {"gpu_id": str(i)}
                        )
                        await self.record_gauge(
                            "system.gpu.temperature",
                            gpu.temperature,
                            {"gpu_id": str(i), "unit": "celsius"}
                        )
                except:
                    pass
                
                # Track collection time
                collection_time = time.time() - start_time
                self.collection_times.append(collection_time)
                
                # Wait for next collection
                await asyncio.sleep(
                    self.config.get('collection_interval', 10)
                )
                
            except Exception as e:
                logger.error(f"Error collecting system metrics: {e}")
                await asyncio.sleep(10)
    
    # Aggregation
    async def _aggregation_loop(self):
        """Aggregate metrics periodically"""
        while True:
            try:
                await asyncio.sleep(
                    self.config.get('aggregation_interval', 60)
                )
                
                await self._aggregate_metrics()
                
            except Exception as e:
                logger.error(f"Error in aggregation: {e}")
    
    async def _aggregate_metrics(self):
        """Aggregate metrics over time windows"""
        time_windows = {
            '1m': timedelta(minutes=1),
            '5m': timedelta(minutes=5),
            '15m': timedelta(minutes=15),
            '1h': timedelta(hours=1),
            '24h': timedelta(hours=24)
        }
        
        current_time = datetime.utcnow()
        
        for metric_name, buffer in self.metric_buffers.items():
            if not buffer:
                continue
            
            definition = self.metrics.get(metric_name)
            if not definition:
                continue
            
            aggregations = {}
            
            for window_name, window_duration in time_windows.items():
                cutoff_time = current_time - window_duration
                
                # Filter points within window
                window_points = [
                    p for p in buffer
                    if p.timestamp >= cutoff_time
                ]
                
                if not window_points:
                    continue
                
                values = [p.value for p in window_points]
                
                # Calculate aggregations
                if definition.aggregation == "avg":
                    agg_value = np.mean(values)
                elif definition.aggregation == "sum":
                    agg_value = np.sum(values)
                elif definition.aggregation == "min":
                    agg_value = np.min(values)
                elif definition.aggregation == "max":
                    agg_value = np.max(values)
                elif definition.aggregation == "last":
                    agg_value = values[-1]
                else:
                    agg_value = np.mean(values)
                
                # Additional statistics for histograms
                if definition.type == MetricType.HISTOGRAM:
                    aggregations[window_name] = {
                        'mean': np.mean(values),
                        'median': np.median(values),
                        'p95': np.percentile(values, 95),
                        'p99': np.percentile(values, 99),
                        'min': np.min(values),
                        'max': np.max(values),
                        'count': len(values)
                    }
                else:
                    aggregations[window_name] = {
                        'value': agg_value,
                        'count': len(values)
                    }
            
            self.aggregated_metrics[metric_name] = aggregations
    
    # Alerting
    async def _check_metric_alert(self, name: str, value: float):
        """Check if metric triggers an alert"""
        definition = self.metrics.get(name)
        if not definition or not definition.thresholds:
            return
        
        for level_name, threshold in definition.thresholds.items():
            try:
                level = MetricLevel[level_name.upper()]
            except KeyError:
                continue
            
            # Check threshold
            triggered = False
            if definition.type in [MetricType.GAUGE, MetricType.COUNTER]:
                triggered = value > threshold
            
            if triggered:
                alert_id = f"{name}_{level_name}"
                
                # Check if alert already active
                if alert_id not in self.active_alerts:
                    alert = Alert(
                        alert_id=alert_id,
                        metric_name=name,
                        condition=f"> {threshold}",
                        threshold=threshold,
                        severity=level,
                        message=f"{name} exceeded {level_name} threshold: {value:.2f} > {threshold}",
                        triggered_at=datetime.utcnow(),
                        metadata={'current_value': value}
                    )
                    
                    self.active_alerts[alert_id] = alert
                    await self._send_alert(alert)
            else:
                # Check if alert should be resolved
                if alert_id in self.active_alerts:
                    alert = self.active_alerts[alert_id]
                    alert.resolved_at = datetime.utcnow()
                    await self._send_alert_resolution(alert)
                    del self.active_alerts[alert_id]
    
    async def _alert_checker_loop(self):
        """Check for alerts based on aggregated metrics"""
        while True:
            try:
                await asyncio.sleep(30)
                
                # Check aggregated metrics for alerts
                for metric_name, aggregations in self.aggregated_metrics.items():
                    definition = self.metrics.get(metric_name)
                    if not definition or not definition.thresholds:
                        continue
                    
                    # Check 1-minute average
                    if '1m' in aggregations:
                        value = aggregations['1m'].get('value') or aggregations['1m'].get('mean')
                        if value:
                            await self._check_metric_alert(metric_name, value)
                
            except Exception as e:
                logger.error(f"Error in alert checker: {e}")
    
    async def _send_alert(self, alert: Alert):
        """Send alert notification"""
        logger.warning(f"ALERT: {alert.message}")
        
        # Store alert in Redis
        if self.redis_client:
            key = f"alert:active:{alert.alert_id}"
            await self.redis_client.set(
                key,
                json.dumps({
                    'alert_id': alert.alert_id,
                    'metric_name': alert.metric_name,
                    'severity': alert.severity.value,
                    'message': alert.message,
                    'triggered_at': alert.triggered_at.isoformat(),
                    'metadata': alert.metadata
                })
            )
        
        # Here you would integrate with notification services
        # (email, Slack, PagerDuty, etc.)
    
    async def _send_alert_resolution(self, alert: Alert):
        """Send alert resolution notification"""
        duration = (alert.resolved_at - alert.triggered_at).total_seconds()
        logger.info(f"RESOLVED: {alert.alert_id} after {duration:.1f} seconds")
        
        # Remove from Redis
        if self.redis_client:
            key = f"alert:active:{alert.alert_id}"
            await self.redis_client.delete(key)
    
    # Querying
    async def get_metric_values(self, name: str, 
                               start_time: Optional[datetime] = None,
                               end_time: Optional[datetime] = None,
                               labels: Optional[Dict[str, str]] = None) -> List[MetricPoint]:
        """Get metric values within time range"""
        if name not in self.metric_buffers:
            return []
        
        points = list(self.metric_buffers[name])
        
        # Filter by time range
        if start_time:
            points = [p for p in points if p.timestamp >= start_time]
        if end_time:
            points = [p for p in points if p.timestamp <= end_time]
        
        # Filter by labels
        if labels:
            points = [
                p for p in points
                if all(p.labels.get(k) == v for k, v in labels.items())
            ]
        
        return points
    
    async def get_aggregated_metrics(self, name: Optional[str] = None) -> Dict:
        """Get aggregated metrics"""
        if name:
            return self.aggregated_metrics.get(name, {})
        return self.aggregated_metrics.copy()
    
    async def get_active_alerts(self) -> List[Alert]:
        """Get currently active alerts"""
        return list(self.active_alerts.values())
    
    # Export
    async def export_metrics(self, format: str = "prometheus") -> str:
        """Export metrics in specified format"""
        if format == "prometheus":
            return await self._export_prometheus()
        elif format == "json":
            return await self._export_json()
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    async def _export_prometheus(self) -> str:
        """Export metrics in Prometheus format"""
        lines = []
        
        for metric_name, definition in self.metrics.items():
            # Add metric help and type
            lines.append(f"# HELP {metric_name} {definition.description}")
            lines.append(f"# TYPE {metric_name} {definition.type.value}")
            
            # Get recent values
            if metric_name in self.metric_buffers:
                buffer = self.metric_buffers[metric_name]
                if buffer:
                    # Get most recent value for each label combination
                    label_values = {}
                    for point in buffer:
                        label_key = str(sorted(point.labels.items()))
                        label_values[label_key] = point
                    
                    for point in label_values.values():
                        # Format labels
                        if point.labels:
                            label_str = ",".join(
                                f'{k}="{v}"' for k, v in point.labels.items()
                            )
                            lines.append(f'{metric_name}{{{label_str}}} {point.value}')
                        else:
                            lines.append(f'{metric_name} {point.value}')
        
        return "\n".join(lines)
    
    async def _export_json(self) -> str:
        """Export metrics in JSON format"""
        export_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': {},
            'aggregations': self.aggregated_metrics,
            'alerts': [
                {
                    'alert_id': alert.alert_id,
                    'metric_name': alert.metric_name,
                    'severity': alert.severity.value,
                    'message': alert.message,
                    'triggered_at': alert.triggered_at.isoformat()
                }
                for alert in self.active_alerts.values()
            ]
        }
        
        # Add recent metric values
        for metric_name, buffer in self.metric_buffers.items():
            if buffer:
                recent_points = list(buffer)[-10:]  # Last 10 points
                export_data['metrics'][metric_name] = [
                    {
                        'timestamp': p.timestamp.isoformat(),
                        'value': p.value,
                        'labels': p.labels
                    }
                    for p in recent_points
                ]
        
        return json.dumps(export_data, indent=2)
    
    # Cleanup
    async def _cleanup_loop(self):
        """Clean up old metrics data"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run hourly
                
                # Clean up old metrics from Redis
                if self.redis_client:
                    # This would need to scan and delete expired keys
                    pass
                
                logger.debug("Metrics cleanup completed")
                
            except Exception as e:
                logger.error(f"Error in cleanup: {e}")
    
    async def shutdown(self):
        """Shutdown metrics collector"""
        logger.info("Shutting down metrics collector")
        
        # Close Redis connection
        if self.redis_client:
            await self.redis_client.close()
        
        # Clear buffers
        self.metric_buffers.clear()
        self.aggregated_metrics.clear()
        self.active_alerts.clear()