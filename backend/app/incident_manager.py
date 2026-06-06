import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class CommandLog(BaseModel):
    command: str
    output: str
    timestamp: str
    success: bool

class Incident(BaseModel):
    id: str
    name: str
    status: str  # "Active" | "Resolved"
    severity: str  # "Critical" | "Warning"
    description: str
    created_at: str
    resolved_at: Optional[str] = None
    logs: List[str]
    proposed_commands: List[str]
    command_history: List[CommandLog] = []
    post_mortem: Optional[str] = None

class IncidentManager:
    def __init__(self):
        self._incidents: Dict[str, Incident] = {}
        self._initialize_default_incidents()

    def _initialize_default_incidents(self):
        # Create a few pre-loaded resolved incidents to give Hindsight some history in simulation mode
        pass

    def get_all_incidents(self) -> List[Incident]:
        return list(self._incidents.values())

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        return self._incidents.get(incident_id)

    def trigger_incident(self, scenario: str) -> Incident:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if scenario == "database_exhaustion":
            incident_id = f"inc-db-{int(datetime.datetime.now().timestamp())}"
            incident = Incident(
                id=incident_id,
                name="Database Connection Pool Exhausted",
                status="Active",
                severity="Critical",
                description="postgres-db connection limit reached 100/100. Stale handles blocking connections.",
                created_at=timestamp,
                logs=[
                    f"[{timestamp}] ALERT: postgres-db connection count reached 100/100 (100% capacity)",
                    f"[{timestamp}] ERROR: connection pool exhausted. Remote connection requests rejected.",
                    f"[{timestamp}] FATAL: remaining connection slots are reserved for non-replication superuser connections",
                    f"[{timestamp}] WARNING: billing-service [PID 4082] is holding 78 IDLE transactions on postgres-db",
                    f"[{timestamp}] PROCESS STATE: CPU usage=12%, RAM usage=42%"
                ],
                proposed_commands=[
                    "pg_ctl restart",
                    "python scripts/kill_idle_conns.py"
                ]
            )
        elif scenario == "api_timeout":
            incident_id = f"inc-api-{int(datetime.datetime.now().timestamp())}"
            incident = Incident(
                id=incident_id,
                name="API Gateway 504 Timeout",
                status="Active",
                severity="Critical",
                description="Nginx returning 504 on public /checkout endpoint. Upstream microservices failing.",
                created_at=timestamp,
                logs=[
                    f"[{timestamp}] ALERT: API-Gateway returning 504 Gateway Timeout on /checkout endpoint",
                    f"[{timestamp}] NGINX: upstream timed out (110: Connection timed out) while reading response headers",
                    f"[{timestamp}] ERROR: auth-service cache validation latency > 5000ms",
                    f"[{timestamp}] WARNING: redis token cache is containing 50,000 stale write-lock handles",
                    f"[{timestamp}] PROCESS STATE: CPU usage=24%, RAM usage=65%"
                ],
                proposed_commands=[
                    "redis-cli -h auth-cache.internal flushall"
                ]
            )
        elif scenario == "redis_oom":
            incident_id = f"inc-red-{int(datetime.datetime.now().timestamp())}"
            incident = Incident(
                id=incident_id,
                name="Redis Cache Out Of Memory (OOM)",
                status="Active",
                severity="Warning",
                description="Redis server memory exceeds maxmemory limit. Cache writes failing.",
                created_at=timestamp,
                logs=[
                    f"[{timestamp}] ALERT: redis-cache OOM (Out Of Memory). Write operations rejected.",
                    f"[{timestamp}] REDIS: Command OOM command not allowed when used memory > 'maxmemory'",
                    f"[{timestamp}] ERROR: Session cache writes failing for app servers",
                    f"[{timestamp}] WARNING: 8.2GB of temporary sessions with no TTL detected",
                    f"[{timestamp}] PROCESS STATE: CPU usage=8%, RAM usage=99%"
                ],
                proposed_commands=[
                    "sudo systemctl restart redis-server",
                    "python scripts/evict_sessions.py"
                ]
            )
        else:
            incident_id = f"inc-gen-{int(datetime.datetime.now().timestamp())}"
            incident = Incident(
                id=incident_id,
                name="Unknown Infrastructure Anomaly",
                status="Active",
                severity="Warning",
                description="Generic alert triggered by monitor.",
                created_at=timestamp,
                logs=[
                    f"[{timestamp}] ALERT: CPU usage spikes on web-node-3",
                    f"[{timestamp}] WARNING: High disk I/O wait detected",
                    f"[{timestamp}] PROCESS STATE: CPU usage=94%, RAM usage=56%"
                ],
                proposed_commands=[]
            )

        self._incidents[incident_id] = incident
        return incident

    def execute_command(self, incident_id: str, command: str) -> CommandLog:
        incident = self._incidents.get(incident_id)
        if not incident:
            raise ValueError("Incident not found")

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        output = ""
        success = False

        # Evaluate mock commands
        if command == "pg_ctl restart":
            output = (
                f"[{timestamp}] $ pg_ctl restart\n"
                f"[{timestamp}] Stopping PostgreSQL database server...\n"
                f"[{timestamp}] Database server stopped successfully.\n"
                f"[{timestamp}] Starting PostgreSQL database server on port 5432...\n"
                f"[{timestamp}] Database server started.\n"
                f"[{timestamp}] WARNING: billing-service immediately re-connected and saturated pool.\n"
                f"[{timestamp}] ALERT: postgres-db connection count reached 100/100 (100% capacity)"
            )
            success = False
            incident.logs.append(f"[{timestamp}] COMMAND RUN: pg_ctl restart -> FAILED (pool re-saturated)")
        
        elif command == "python scripts/kill_idle_conns.py":
            output = (
                f"[{timestamp}] $ python scripts/kill_idle_conns.py\n"
                f"[{timestamp}] Connected to database postgres-db.internal...\n"
                f"[{timestamp}] Scanning connection dictionary...\n"
                f"[{timestamp}] Found 78 IDLE connections held by billing-service (PID 4082).\n"
                f"[{timestamp}] Executing: pg_terminate_backend(pid) for 78 sessions...\n"
                f"[{timestamp}] Terminated 78 idle connections. Connections dropped to 22/100.\n"
                f"[{timestamp}] Connection Pool Status: HEALTHY."
            )
            success = True
            incident.logs.append(f"[{timestamp}] COMMAND RUN: python scripts/kill_idle_conns.py -> SUCCESS")
            
        elif command == "redis-cli -h auth-cache.internal flushall":
            output = (
                f"[{timestamp}] $ redis-cli -h auth-cache.internal flushall\n"
                f"[{timestamp}] Connecting to auth-cache.internal:6379...\n"
                f"[{timestamp}] Flushall status: OK. 50,000 keys deleted.\n"
                f"[{timestamp}] Auth validation latency dropped from 5400ms to 2ms.\n"
                f"[{timestamp}] API-Gateway Checkout responses: 200 OK. System status: HEALTHY."
            )
            success = True
            incident.logs.append(f"[{timestamp}] COMMAND RUN: redis-cli -h auth-cache.internal flushall -> SUCCESS")
            
        elif command == "sudo systemctl restart redis-server":
            output = (
                f"[{timestamp}] $ sudo systemctl restart redis-server\n"
                f"[{timestamp}] Restarting redis-server daemon...\n"
                f"[{timestamp}] redis-server started successfully.\n"
                f"[{timestamp}] Reloading Append-Only File (AOF)... 100% complete.\n"
                f"[{timestamp}] ERROR: AOF size 8.2GB exceeds available memory limits.\n"
                f"[{timestamp}] ALERT: redis-cache OOM (Out Of Memory). Write operations rejected."
            )
            success = False
            incident.logs.append(f"[{timestamp}] COMMAND RUN: sudo systemctl restart redis-server -> FAILED (OOM re-triggered)")
            
        elif command == "python scripts/evict_sessions.py":
            output = (
                f"[{timestamp}] $ python scripts/evict_sessions.py\n"
                f"[{timestamp}] Scanning keys matching prefix 'temp:session:*'...\n"
                f"[{timestamp}] Found 43,200 keys without TTL (Time-To-Live).\n"
                f"[{timestamp}] Evicting 43,200 orphaned keys...\n"
                f"[{timestamp}] Eviction completed. Freed 4.1GB of RAM.\n"
                f"[{timestamp}] Redis memory usage dropped from 8.2GB to 4.1GB.\n"
                f"[{timestamp}] Cache state: HEALTHY."
            )
            success = True
            incident.logs.append(f"[{timestamp}] COMMAND RUN: python scripts/evict_sessions.py -> SUCCESS")
            
        else:
            output = (
                f"[{timestamp}] $ {command}\n"
                f"[{timestamp}] Command executed, but no automatic triggers matched.\n"
                f"[{timestamp}] Output exit code: 0"
            )
            success = True
            incident.logs.append(f"[{timestamp}] COMMAND RUN: {command}")

        cmd_log = CommandLog(
            command=command,
            output=output,
            timestamp=timestamp,
            success=success
        )
        incident.command_history.append(cmd_log)
        return cmd_log

    def resolve_incident(self, incident_id: str, post_mortem: str) -> Incident:
        incident = self._incidents.get(incident_id)
        if not incident:
            raise ValueError("Incident not found")

        incident.status = "Resolved"
        incident.resolved_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        incident.post_mortem = post_mortem
        incident.logs.append(f"[{incident.resolved_at}] Incident RESOLVED. Post-mortem logged.")
        return incident

incident_manager = IncidentManager()
