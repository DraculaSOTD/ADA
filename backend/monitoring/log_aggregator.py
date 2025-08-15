"""
Log Aggregator
Centralized log collection, parsing, and analysis
"""

import asyncio
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Pattern
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import hashlib
import logging
from pathlib import Path
import aiofiles
import aioredis

logger = logging.getLogger(__name__)


class LogLevel(Enum):
    """Log severity levels"""
    TRACE = 0
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50


class LogSource(Enum):
    """Log source types"""
    APPLICATION = "application"
    SYSTEM = "system"
    DATABASE = "database"
    WEBSERVER = "webserver"
    SECURITY = "security"
    AUDIT = "audit"
    PERFORMANCE = "performance"


@dataclass
class LogEntry:
    """Structured log entry"""
    timestamp: datetime
    level: LogLevel
    source: LogSource
    service: str
    message: str
    
    # Optional fields
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    ip_address: Optional[str] = None
    
    # Structured data
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    
    # Error information
    error_type: Optional[str] = None
    stack_trace: Optional[str] = None
    
    # Performance data
    duration_ms: Optional[float] = None
    
    # Unique identifier
    log_id: Optional[str] = None
    
    def __post_init__(self):
        if not self.log_id:
            # Generate unique ID
            content = f"{self.timestamp}{self.level}{self.source}{self.message}"
            self.log_id = hashlib.md5(content.encode()).hexdigest()


@dataclass
class LogPattern:
    """Pattern for log parsing"""
    name: str
    pattern: Pattern
    extractor: callable
    source: LogSource
    

@dataclass
class LogStatistics:
    """Log statistics over a time window"""
    start_time: datetime
    end_time: datetime
    total_count: int
    level_counts: Dict[LogLevel, int]
    source_counts: Dict[LogSource, int]
    service_counts: Dict[str, int]
    error_rate: float
    avg_response_time: Optional[float]
    top_errors: List[Tuple[str, int]]
    top_users: List[Tuple[str, int]]


class LogAggregator:
    """
    Centralized log aggregation and analysis system
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.redis_client: Optional[aioredis.Redis] = None
        
        # Log patterns for parsing
        self.patterns: List[LogPattern] = []
        self._initialize_patterns()
        
        # In-memory buffers
        self.log_buffer: deque = deque(maxlen=10000)
        self.error_buffer: deque = deque(maxlen=1000)
        
        # Statistics
        self.stats_cache: Dict[str, LogStatistics] = {}
        
        # Real-time analysis
        self.error_patterns: Dict[str, int] = defaultdict(int)
        self.slow_queries: List[LogEntry] = []
        self.security_events: List[LogEntry] = []
        
        # File watchers
        self.watched_files: Dict[str, int] = {}  # file_path -> last_position
        
    def _initialize_patterns(self):
        """Initialize log parsing patterns"""
        # Application log pattern
        self.patterns.append(LogPattern(
            name="application",
            pattern=re.compile(
                r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),(\d{3}) - (\w+) - \[([^\]]+)\] - (.+)'
            ),
            extractor=self._extract_application_log,
            source=LogSource.APPLICATION
        ))
        
        # Nginx access log pattern
        self.patterns.append(LogPattern(
            name="nginx_access",
            pattern=re.compile(
                r'(\S+) \S+ \S+ \[([^\]]+)\] "([^"]+)" (\d+) (\d+) "([^"]*)" "([^"]*)"'
            ),
            extractor=self._extract_nginx_log,
            source=LogSource.WEBSERVER
        ))
        
        # Database slow query log pattern
        self.patterns.append(LogPattern(
            name="slow_query",
            pattern=re.compile(
                r'# Time: (\S+ \S+).*?# Query_time: ([\d.]+).*?# Rows_examined: (\d+).*?\n(.+?)(?=\n#|\Z)',
                re.MULTILINE | re.DOTALL
            ),
            extractor=self._extract_slow_query_log,
            source=LogSource.DATABASE
        ))
        
        # Security audit log pattern
        self.patterns.append(LogPattern(
            name="security_audit",
            pattern=re.compile(
                r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z) \[(\w+)\] (\w+): (.+) \| user=(\S+) ip=(\S+)'
            ),
            extractor=self._extract_security_log,
            source=LogSource.SECURITY
        ))
        
        # JSON structured log pattern
        self.patterns.append(LogPattern(
            name="json_structured",
            pattern=re.compile(r'^\{.*\}$'),
            extractor=self._extract_json_log,
            source=LogSource.APPLICATION
        ))
    
    async def initialize(self):
        """Initialize log aggregator"""
        # Connect to Redis
        redis_url = self.config.get('redis_url', 'redis://localhost:6379')
        self.redis_client = await aioredis.from_url(redis_url)
        
        # Start background tasks
        asyncio.create_task(self._file_watcher_loop())
        asyncio.create_task(self._analysis_loop())
        asyncio.create_task(self._statistics_loop())
        asyncio.create_task(self._cleanup_loop())
        
        logger.info("Log aggregator initialized")
    
    # Log Ingestion
    async def ingest_log(self, log_line: str, source: Optional[LogSource] = None):
        """Ingest a single log line"""
        try:
            # Try to parse the log
            log_entry = await self._parse_log(log_line, source)
            
            if log_entry:
                # Add to buffer
                self.log_buffer.append(log_entry)
                
                # Special handling for errors
                if log_entry.level in [LogLevel.ERROR, LogLevel.CRITICAL]:
                    self.error_buffer.append(log_entry)
                    await self._analyze_error(log_entry)
                
                # Check for security events
                if log_entry.source == LogSource.SECURITY:
                    self.security_events.append(log_entry)
                    await self._analyze_security_event(log_entry)
                
                # Check for slow queries
                if log_entry.duration_ms and log_entry.duration_ms > 1000:
                    self.slow_queries.append(log_entry)
                
                # Store in Redis
                await self._store_log(log_entry)
                
                return log_entry
            
        except Exception as e:
            logger.error(f"Error ingesting log: {e}")
        
        return None
    
    async def ingest_batch(self, log_lines: List[str], 
                          source: Optional[LogSource] = None):
        """Ingest multiple log lines"""
        results = []
        for line in log_lines:
            result = await self.ingest_log(line, source)
            if result:
                results.append(result)
        return results
    
    async def _parse_log(self, log_line: str, 
                        source: Optional[LogSource] = None) -> Optional[LogEntry]:
        """Parse log line into structured entry"""
        log_line = log_line.strip()
        if not log_line:
            return None
        
        # Try each pattern
        for pattern_def in self.patterns:
            if source and pattern_def.source != source:
                continue
            
            match = pattern_def.pattern.match(log_line)
            if match:
                return pattern_def.extractor(match)
        
        # Fallback to unstructured log
        return LogEntry(
            timestamp=datetime.utcnow(),
            level=LogLevel.INFO,
            source=source or LogSource.APPLICATION,
            service="unknown",
            message=log_line
        )
    
    # Pattern Extractors
    def _extract_application_log(self, match) -> LogEntry:
        """Extract application log entry"""
        date_str = match.group(1)
        milliseconds = match.group(2)
        level_str = match.group(3)
        service = match.group(4)
        message = match.group(5)
        
        timestamp = datetime.strptime(
            f"{date_str}.{milliseconds}", 
            "%Y-%m-%d %H:%M:%S.%f"
        )
        
        level = LogLevel[level_str.upper()]
        
        # Extract additional metadata from message
        metadata = {}
        if "user_id=" in message:
            user_match = re.search(r'user_id=(\S+)', message)
            if user_match:
                metadata['user_id'] = user_match.group(1)
        
        return LogEntry(
            timestamp=timestamp,
            level=level,
            source=LogSource.APPLICATION,
            service=service,
            message=message,
            metadata=metadata
        )
    
    def _extract_nginx_log(self, match) -> LogEntry:
        """Extract Nginx access log entry"""
        ip_address = match.group(1)
        timestamp_str = match.group(2)
        request = match.group(3)
        status_code = int(match.group(4))
        response_size = int(match.group(5))
        referer = match.group(6)
        user_agent = match.group(7)
        
        # Parse timestamp
        timestamp = datetime.strptime(
            timestamp_str,
            "%d/%b/%Y:%H:%M:%S %z"
        ).replace(tzinfo=None)
        
        # Determine log level based on status code
        if status_code >= 500:
            level = LogLevel.ERROR
        elif status_code >= 400:
            level = LogLevel.WARNING
        else:
            level = LogLevel.INFO
        
        # Parse request
        request_parts = request.split()
        method = request_parts[0] if request_parts else ""
        path = request_parts[1] if len(request_parts) > 1 else ""
        
        return LogEntry(
            timestamp=timestamp,
            level=level,
            source=LogSource.WEBSERVER,
            service="nginx",
            message=request,
            ip_address=ip_address,
            metadata={
                'method': method,
                'path': path,
                'status_code': status_code,
                'response_size': response_size,
                'referer': referer,
                'user_agent': user_agent
            }
        )
    
    def _extract_slow_query_log(self, match) -> LogEntry:
        """Extract database slow query log"""
        timestamp_str = match.group(1)
        query_time = float(match.group(2))
        rows_examined = int(match.group(3))
        query = match.group(4).strip()
        
        timestamp = datetime.strptime(
            timestamp_str,
            "%y%m%d %H:%M:%S"
        )
        
        return LogEntry(
            timestamp=timestamp,
            level=LogLevel.WARNING,
            source=LogSource.DATABASE,
            service="mysql",
            message=f"Slow query: {query[:100]}...",
            duration_ms=query_time * 1000,
            metadata={
                'query': query,
                'query_time': query_time,
                'rows_examined': rows_examined
            }
        )
    
    def _extract_security_log(self, match) -> LogEntry:
        """Extract security audit log"""
        timestamp_str = match.group(1)
        level_str = match.group(2)
        event_type = match.group(3)
        message = match.group(4)
        user = match.group(5)
        ip = match.group(6)
        
        timestamp = datetime.fromisoformat(
            timestamp_str.replace('Z', '+00:00')
        ).replace(tzinfo=None)
        
        level = LogLevel[level_str.upper()]
        
        return LogEntry(
            timestamp=timestamp,
            level=level,
            source=LogSource.SECURITY,
            service="security",
            message=message,
            user_id=user,
            ip_address=ip,
            metadata={
                'event_type': event_type
            },
            tags=['security', event_type.lower()]
        )
    
    def _extract_json_log(self, match) -> LogEntry:
        """Extract JSON structured log"""
        try:
            data = json.loads(match.group(0))
            
            # Map JSON fields to LogEntry
            timestamp = datetime.fromisoformat(
                data.get('timestamp', datetime.utcnow().isoformat())
            )
            
            level = LogLevel[data.get('level', 'INFO').upper()]
            
            return LogEntry(
                timestamp=timestamp,
                level=level,
                source=LogSource(data.get('source', 'application')),
                service=data.get('service', 'unknown'),
                message=data.get('message', ''),
                user_id=data.get('user_id'),
                session_id=data.get('session_id'),
                request_id=data.get('request_id'),
                ip_address=data.get('ip_address'),
                metadata=data.get('metadata', {}),
                tags=data.get('tags', []),
                error_type=data.get('error_type'),
                stack_trace=data.get('stack_trace'),
                duration_ms=data.get('duration_ms')
            )
        except:
            return None
    
    # File Watching
    async def watch_file(self, file_path: str, source: LogSource):
        """Start watching a log file"""
        self.watched_files[file_path] = 0
        logger.info(f"Started watching file: {file_path}")
    
    async def _file_watcher_loop(self):
        """Watch log files for new entries"""
        while True:
            try:
                for file_path, last_position in list(self.watched_files.items()):
                    await self._check_file(file_path, last_position)
                
                await asyncio.sleep(
                    self.config.get('watch_interval', 5)
                )
                
            except Exception as e:
                logger.error(f"Error in file watcher: {e}")
                await asyncio.sleep(10)
    
    async def _check_file(self, file_path: str, last_position: int):
        """Check file for new log entries"""
        try:
            path = Path(file_path)
            if not path.exists():
                return
            
            current_size = path.stat().st_size
            
            if current_size < last_position:
                # File was rotated
                last_position = 0
            
            if current_size > last_position:
                # Read new content
                async with aiofiles.open(file_path, 'r') as f:
                    await f.seek(last_position)
                    new_content = await f.read()
                    
                    # Process new lines
                    for line in new_content.splitlines():
                        await self.ingest_log(line)
                    
                    # Update position
                    self.watched_files[file_path] = current_size
                    
        except Exception as e:
            logger.error(f"Error checking file {file_path}: {e}")
    
    # Analysis
    async def _analyze_error(self, log_entry: LogEntry):
        """Analyze error log entry"""
        # Extract error pattern
        error_pattern = log_entry.error_type or "unknown_error"
        self.error_patterns[error_pattern] += 1
        
        # Check for error surge
        recent_errors = [
            e for e in self.error_buffer
            if (datetime.utcnow() - e.timestamp).total_seconds() < 60
        ]
        
        if len(recent_errors) > self.config.get('error_surge_threshold', 10):
            await self._trigger_error_alert(len(recent_errors))
    
    async def _analyze_security_event(self, log_entry: LogEntry):
        """Analyze security event"""
        event_type = log_entry.metadata.get('event_type', 'unknown')
        
        # Check for suspicious patterns
        if event_type in ['failed_login', 'unauthorized_access']:
            # Check for brute force attempts
            recent_events = [
                e for e in self.security_events
                if e.ip_address == log_entry.ip_address and
                (datetime.utcnow() - e.timestamp).total_seconds() < 300
            ]
            
            if len(recent_events) > 5:
                await self._trigger_security_alert(
                    f"Possible brute force from {log_entry.ip_address}"
                )
    
    async def _analysis_loop(self):
        """Periodic log analysis"""
        while True:
            try:
                await asyncio.sleep(60)
                
                # Analyze patterns
                await self._analyze_patterns()
                
                # Detect anomalies
                await self._detect_anomalies()
                
            except Exception as e:
                logger.error(f"Error in analysis loop: {e}")
    
    async def _analyze_patterns(self):
        """Analyze log patterns"""
        # Find frequent error patterns
        if self.error_patterns:
            top_errors = sorted(
                self.error_patterns.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
            
            logger.info(f"Top error patterns: {top_errors}")
    
    async def _detect_anomalies(self):
        """Detect anomalies in logs"""
        # Simple anomaly detection based on volume
        current_minute = datetime.utcnow().replace(second=0, microsecond=0)
        
        recent_logs = [
            log for log in self.log_buffer
            if log.timestamp >= current_minute - timedelta(minutes=5)
        ]
        
        if recent_logs:
            # Calculate rate per minute
            rate = len(recent_logs) / 5
            
            # Compare with historical average (simplified)
            historical_avg = self.config.get('expected_log_rate', 100)
            
            if rate > historical_avg * 3:
                logger.warning(f"Anomaly detected: High log rate {rate:.1f}/min")
            elif rate < historical_avg * 0.1:
                logger.warning(f"Anomaly detected: Low log rate {rate:.1f}/min")
    
    # Statistics
    async def _statistics_loop(self):
        """Calculate log statistics"""
        while True:
            try:
                await asyncio.sleep(
                    self.config.get('stats_interval', 300)
                )
                
                # Calculate statistics for different time windows
                windows = [
                    ('5m', timedelta(minutes=5)),
                    ('1h', timedelta(hours=1)),
                    ('24h', timedelta(hours=24))
                ]
                
                for window_name, duration in windows:
                    stats = await self._calculate_statistics(duration)
                    self.stats_cache[window_name] = stats
                
            except Exception as e:
                logger.error(f"Error calculating statistics: {e}")
    
    async def _calculate_statistics(self, duration: timedelta) -> LogStatistics:
        """Calculate statistics for time window"""
        end_time = datetime.utcnow()
        start_time = end_time - duration
        
        # Filter logs in time window
        window_logs = [
            log for log in self.log_buffer
            if start_time <= log.timestamp <= end_time
        ]
        
        # Calculate counts
        level_counts = defaultdict(int)
        source_counts = defaultdict(int)
        service_counts = defaultdict(int)
        user_counts = defaultdict(int)
        error_types = defaultdict(int)
        response_times = []
        
        for log in window_logs:
            level_counts[log.level] += 1
            source_counts[log.source] += 1
            service_counts[log.service] += 1
            
            if log.user_id:
                user_counts[log.user_id] += 1
            
            if log.error_type:
                error_types[log.error_type] += 1
            
            if log.duration_ms:
                response_times.append(log.duration_ms)
        
        # Calculate error rate
        total_count = len(window_logs)
        error_count = level_counts[LogLevel.ERROR] + level_counts[LogLevel.CRITICAL]
        error_rate = error_count / total_count if total_count > 0 else 0
        
        # Calculate average response time
        avg_response_time = (
            sum(response_times) / len(response_times)
            if response_times else None
        )
        
        # Get top items
        top_errors = sorted(
            error_types.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        top_users = sorted(
            user_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        return LogStatistics(
            start_time=start_time,
            end_time=end_time,
            total_count=total_count,
            level_counts=dict(level_counts),
            source_counts=dict(source_counts),
            service_counts=dict(service_counts),
            error_rate=error_rate,
            avg_response_time=avg_response_time,
            top_errors=top_errors,
            top_users=top_users
        )
    
    # Storage
    async def _store_log(self, log_entry: LogEntry):
        """Store log entry in Redis"""
        if not self.redis_client:
            return
        
        # Store in time-series format
        key = f"logs:{log_entry.source.value}:{log_entry.timestamp.strftime('%Y%m%d')}"
        
        value = {
            'log_id': log_entry.log_id,
            'timestamp': log_entry.timestamp.isoformat(),
            'level': log_entry.level.value,
            'service': log_entry.service,
            'message': log_entry.message,
            'metadata': log_entry.metadata
        }
        
        # Add to sorted set with timestamp as score
        await self.redis_client.zadd(
            key,
            {json.dumps(value): log_entry.timestamp.timestamp()}
        )
        
        # Set expiration
        await self.redis_client.expire(
            key,
            self.config.get('retention_days', 30) * 86400
        )
    
    # Querying
    async def search_logs(self, 
                         query: Optional[str] = None,
                         start_time: Optional[datetime] = None,
                         end_time: Optional[datetime] = None,
                         level: Optional[LogLevel] = None,
                         source: Optional[LogSource] = None,
                         service: Optional[str] = None,
                         limit: int = 100) -> List[LogEntry]:
        """Search logs with filters"""
        results = []
        
        # Search in buffer first
        for log in reversed(self.log_buffer):
            # Apply filters
            if start_time and log.timestamp < start_time:
                continue
            if end_time and log.timestamp > end_time:
                continue
            if level and log.level != level:
                continue
            if source and log.source != source:
                continue
            if service and log.service != service:
                continue
            if query and query.lower() not in log.message.lower():
                continue
            
            results.append(log)
            
            if len(results) >= limit:
                break
        
        return results
    
    async def get_statistics(self, window: str = '1h') -> Optional[LogStatistics]:
        """Get cached statistics"""
        return self.stats_cache.get(window)
    
    # Alerts
    async def _trigger_error_alert(self, error_count: int):
        """Trigger error surge alert"""
        logger.error(f"ERROR SURGE: {error_count} errors in last minute")
        
        # Here you would send notifications
    
    async def _trigger_security_alert(self, message: str):
        """Trigger security alert"""
        logger.critical(f"SECURITY ALERT: {message}")
        
        # Here you would send security notifications
    
    # Cleanup
    async def _cleanup_loop(self):
        """Clean up old data"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run hourly
                
                # Clean up old security events
                cutoff = datetime.utcnow() - timedelta(hours=24)
                self.security_events = [
                    e for e in self.security_events
                    if e.timestamp > cutoff
                ]
                
                # Clean up slow queries
                self.slow_queries = self.slow_queries[-100:]  # Keep last 100
                
                logger.debug("Log cleanup completed")
                
            except Exception as e:
                logger.error(f"Error in cleanup: {e}")
    
    async def shutdown(self):
        """Shutdown log aggregator"""
        logger.info("Shutting down log aggregator")
        
        # Close Redis connection
        if self.redis_client:
            await self.redis_client.close()
        
        # Clear buffers
        self.log_buffer.clear()
        self.error_buffer.clear()