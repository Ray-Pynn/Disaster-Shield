
import math
import sqlite3
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict

# =========================================================
# CONFIGURATION
# =========================================================
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "disaster_shield.db"
DISASTER_TYPES = {"flood", "earthquake", "fire", "volcano", "cyclone", "landslide"}
SEVERITY_LEVELS = {"low", "medium", "high", "critical"}
INCIDENT_STATUSES = {"reported", "verified", "responding", "resolved"}
PRIORITY_LEVELS = {"low", "medium", "high", "critical"}

# =========================================================
# DATABASE CONNECTION LIFECYCLE MANAGEMENT
# =========================================================
@contextmanager
def get_connection():
    """
    Managed SQLite connection context manager.
    Guarantees transaction commits, rollbacks, and automatic handle closure.
    """
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def now():
    return datetime.now(timezone.utc).isoformat()

def initialize_database():
    with get_connection() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                disaster_type TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                location TEXT NOT NULL,
                affected_people INTEGER DEFAULT 0,
                status TEXT DEFAULT 'reported',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sos_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_name TEXT NOT NULL,
                description TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                location TEXT NOT NULL,
                people_count INTEGER DEFAULT 1,
                priority TEXT DEFAULT 'high',
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS volunteers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                skills TEXT NOT NULL,
                phone TEXT NOT NULL,
                location TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                availability TEXT DEFAULT 'available',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS facilities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                facility_type TEXT NOT NULL,
                location TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                capacity INTEGER DEFAULT 0,
                occupied INTEGER DEFAULT 0,
                contact TEXT DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_name TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                unit TEXT NOT NULL,
                location TEXT NOT NULL,
                minimum_quantity INTEGER DEFAULT 10
            );
            CREATE TABLE IF NOT EXISTS allocations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                facility_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY(item_id) REFERENCES inventory(id),
                FOREIGN KEY(facility_id) REFERENCES facilities(id)
            );
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        seed_database(db)

def seed_database(db):
    existing = db.execute("SELECT COUNT(*) AS count FROM incidents").fetchone()["count"]
    if existing > 0:
        return
    timestamp = now()
    incidents = [
        ("River overflow demonstration", "flood", "Simulated flooding near a residential settlement.", "high", 26.8467, 80.9462, "Lucknow demonstration zone", 120, "verified", timestamp),
        ("Industrial fire demonstration", "fire", "Simulated industrial fire requiring evacuation.", "critical", 26.8500, 80.9500, "Industrial demonstration zone", 45, "responding", timestamp),
        ("Earthquake simulation", "earthquake", "Demonstration earthquake incident.", "medium", 26.8600, 80.9300, "Central demonstration zone", 30, "reported", timestamp),
        ("Landslide demonstration", "landslide", "Simulated landslide affecting a road.", "low", 26.8300, 80.9200, "Road demonstration zone", 12, "reported", timestamp),
    ]
    db.executemany("""
        INSERT INTO incidents (title, disaster_type, description, severity, latitude, longitude, location, affected_people, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, incidents)

    facilities = [
        ("Central Relief Hospital", "hospital", "Central demonstration zone", 26.8470, 80.9450, 100, 35, "Demo contact"),
        ("Community Safe Shelter", "shelter", "North demonstration zone", 26.8700, 80.9400, 200, 60, "Demo contact"),
        ("Emergency Medical Centre", "hospital", "South demonstration zone", 26.8200, 80.9300, 75, 20, "Demo contact"),
        ("Temporary Relief Camp", "shelter", "East demonstration zone", 26.8500, 80.9800, 150, 40, "Demo contact"),
    ]
    db.executemany("""
        INSERT INTO facilities (name, facility_type, location, latitude, longitude, capacity, occupied, contact)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, facilities)

    volunteers = [
        ("Demo Volunteer 01", "First Aid", "0000000001", "Central zone", 26.8460, 80.9440, "available", timestamp),
        ("Demo Volunteer 02", "Rescue Operations", "0000000002", "North zone", 26.8680, 80.9410, "available", timestamp),
        ("Demo Volunteer 03", "Medical Support", "0000000003", "East zone", 26.8510, 80.9760, "busy", timestamp),
    ]
    db.executemany("""
        INSERT INTO volunteers (name, skills, phone, location, latitude, longitude, availability, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, volunteers)

    items = [
        ("Drinking Water", "Food and Water", 500, "litres", "Central Warehouse", 100),
        ("Food Packets", "Food and Water", 300, "packets", "Central Warehouse", 50),
        ("First Aid Kits", "Medical", 80, "kits", "Medical Store", 20),
        ("Blankets", "Shelter", 150, "pieces", "Relief Store", 30),
        ("Rescue Kits", "Rescue", 40, "kits", "Rescue Store", 10),
    ]
    db.executemany("""
        INSERT INTO inventory (item_name, category, quantity, unit, location, minimum_quantity)
        VALUES (?, ?, ?, ?, ?, ?)
    """, items)

    db.execute("""
        INSERT INTO activity_log (action, details, created_at)
        VALUES (?, ?, ?)
    """, ("SYSTEM_INITIALIZED", "Local demonstration data created.", timestamp))

def log_activity(action, details):
    with get_connection() as db:
        db.execute("""
            INSERT INTO activity_log (action, details, created_at)
            VALUES (?, ?, ?)
        """, (action, details, now()))

# =========================================================
# VALIDATION SCHEMAS
# =========================================================
class IncidentCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=3, max_length=100)
    disaster_type: str
    description: str = Field(min_length=5, max_length=1000)
    severity: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location: str = Field(min_length=2, max_length=150)
    affected_people: int = Field(default=0, ge=0, le=1000000)

class IncidentUpdate(BaseModel):
    status: str

class SOSCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    person_name: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=5, max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location: str = Field(min_length=2, max_length=150)
    people_count: int = Field(default=1, ge=1, le=10000)

class SOSUpdate(BaseModel):
    status: str
    priority: Optional[str] = None

class VolunteerCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=80)
    skills: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=3, max_length=20)
    location: str = Field(min_length=2, max_length=150)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

class VolunteerUpdate(BaseModel):
    availability: str

class InventoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    item_name: str = Field(min_length=2, max_length=80)
    category: str = Field(min_length=2, max_length=80)
    quantity: int = Field(ge=0, le=10000000)
    unit: str = Field(min_length=1, max_length=30)
    location: str = Field(min_length=2, max_length=150)
    minimum_quantity: int = Field(default=10, ge=0, le=10000000)

class InventoryUpdate(BaseModel):
    quantity: int = Field(ge=0, le=10000000)

class AllocationCreate(BaseModel):
    item_id: int = Field(gt=0)
    facility_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=1000000)
    notes: str = Field(default="", max_length=300)

# =========================================================
# SPATIAL UTILITIES
# =========================================================
def calculate_distance(lat1, lon1, lat2, lon2):
    earth_radius = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return earth_radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def validate_disaster_type(value):
    value = value.lower().strip()
    if value not in DISASTER_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported disaster type.")
    return value

def validate_severity(value):
    value = value.lower().strip()
    if value not in SEVERITY_LEVELS:
        raise HTTPException(status_code=400, detail="Invalid severity level.")
    return value

# =========================================================
# APPLICATION LIFECYCLE
# =========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield

app = FastAPI(
    title="Disaster Shield API",
    description="Offline disaster management demonstration backend.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)

# =========================================================
# ROUTE ENDPOINTS
# =========================================================
@app.get("/")
def home():
    return {
        "application": "Disaster Shield",
        "version": "1.0.0",
        "mode": "offline_demo",
        "message": "Local disaster management API is running.",
    }

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "database": "local_sqlite",
        "mode": "offline",
    }

@app.get("/api/dashboard")
def dashboard():
    with get_connection() as db:
        incidents = db.execute("SELECT COUNT(*) AS total FROM incidents").fetchone()["total"]
        active_incidents = db.execute("SELECT COUNT(*) AS total FROM incidents WHERE status != 'resolved'").fetchone()["total"]
        sos = db.execute("SELECT COUNT(*) AS total FROM sos_requests WHERE status != 'resolved'").fetchone()["total"]
        volunteers = db.execute("SELECT COUNT(*) AS total FROM volunteers WHERE availability = 'available'").fetchone()["total"]
        hospitals = db.execute("SELECT COUNT(*) AS total FROM facilities WHERE facility_type = 'hospital'").fetchone()["total"]
        shelters = db.execute("SELECT COUNT(*) AS total FROM facilities WHERE facility_type = 'shelter'").fetchone()["total"]
        resources = db.execute("SELECT COALESCE(SUM(quantity), 0) AS total FROM inventory").fetchone()["total"]
        critical = db.execute("SELECT COUNT(*) AS total FROM incidents WHERE severity = 'critical' AND status != 'resolved'").fetchone()["total"]
        return {
            "total_incidents": incidents,
            "active_incidents": active_incidents,
            "active_sos": sos,
            "available_volunteers": volunteers,
            "hospitals": hospitals,
            "shelters": shelters,
            "total_inventory_units": resources,
            "critical_incidents": critical,
        }

@app.get("/api/incidents")
def get_incidents(status: Optional[str] = None, disaster_type: Optional[str] = None):
    query = "SELECT * FROM incidents WHERE 1=1"
    params = []
    if status:
        if status not in INCIDENT_STATUSES:
            raise HTTPException(400, "Invalid incident status.")
        query += " AND status = ?"
        params.append(status)
    if disaster_type:
        query += " AND disaster_type = ?"
        params.append(validate_disaster_type(disaster_type))
    query += " ORDER BY created_at DESC"
    with get_connection() as db:
        rows = db.execute(query, params).fetchall()
        return [dict(row) for row in rows]

@app.post("/api/incidents", status_code=201)
def create_incident(data: IncidentCreate):
    disaster_type = validate_disaster_type(data.disaster_type)
    severity = validate_severity(data.severity)
    with get_connection() as db:
        cursor = db.execute("""
            INSERT INTO incidents (title, disaster_type, description, severity, latitude, longitude, location, affected_people, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (data.title, disaster_type, data.description, severity, data.latitude, data.longitude, data.location, data.affected_people, "reported", now()))
        incident_id = cursor.lastrowid
        log_activity("INCIDENT_CREATED", f"Incident #{incident_id}: {data.title}")
        return {"message": "Incident reported successfully.", "incident_id": incident_id}

@app.patch("/api/incidents/{incident_id}")
def update_incident(incident_id: int, data: IncidentUpdate):
    if data.status not in INCIDENT_STATUSES:
        raise HTTPException(400, "Invalid incident status.")
    with get_connection() as db:
        cursor = db.execute("UPDATE incidents SET status = ? WHERE id = ?", (data.status, incident_id))
        if cursor.rowcount == 0:
            raise HTTPException(404, "Incident not found.")
        log_activity("INCIDENT_UPDATED", f"Incident #{incident_id} status changed to {data.status}")
        return {"message": "Incident status updated."}

@app.get("/api/sos")
def get_sos():
    with get_connection() as db:
        rows = db.execute("SELECT * FROM sos_requests ORDER BY created_at DESC").fetchall()
        return [dict(row) for row in rows]

@app.post("/api/sos", status_code=201)
def create_sos(data: SOSCreate):
    with get_connection() as db:
        cursor = db.execute("""
            INSERT INTO sos_requests (person_name, description, latitude, longitude, location, people_count, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (data.person_name, data.description, data.latitude, data.longitude, data.location, data.people_count, "high", "pending", now()))
        request_id = cursor.lastrowid
        log_activity("SOS_CREATED", f"Demonstration SOS request #{request_id}")
        return {"message": "Demonstration SOS request created.", "request_id": request_id, "real_emergency_service": False}

@app.patch("/api/sos/{request_id}")
def update_sos(request_id: int, data: SOSUpdate):
    valid_statuses = {"pending", "assigned", "responding", "resolved"}
    if data.status not in valid_statuses:
        raise HTTPException(400, "Invalid SOS status.")
    priority = data.priority or "high"
    if priority not in PRIORITY_LEVELS:
        raise HTTPException(400, "Invalid priority.")
    with get_connection() as db:
        cursor = db.execute("UPDATE sos_requests SET status = ?, priority = ? WHERE id = ?", (data.status, priority, request_id))
        if cursor.rowcount == 0:
            raise HTTPException(404, "SOS request not found.")
        log_activity("SOS_UPDATED", f"SOS #{request_id} updated to {data.status}")
        return {"message": "SOS request updated."}

@app.get("/api/volunteers")
def get_volunteers():
    with get_connection() as db:
        rows = db.execute("SELECT * FROM volunteers ORDER BY id DESC").fetchall()
        return [dict(row) for row in rows]

@app.post("/api/volunteers", status_code=201)
def create_volunteer(data: VolunteerCreate):
    with get_connection() as db:
        cursor = db.execute("""
            INSERT INTO volunteers (name, skills, phone, location, latitude, longitude, availability, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (data.name, data.skills, data.phone, data.location, data.latitude, data.longitude, "available", now()))
        volunteer_id = cursor.lastrowid
        log_activity("VOLUNTEER_REGISTERED", f"Volunteer #{volunteer_id} added.")
        return {"message": "Demonstration volunteer registered.", "volunteer_id": volunteer_id}

@app.patch("/api/volunteers/{volunteer_id}")
def update_volunteer(volunteer_id: int, data: VolunteerUpdate):
    if data.availability not in {"available", "busy", "unavailable"}:
        raise HTTPException(400, "Invalid availability.")
    with get_connection() as db:
        cursor = db.execute("UPDATE volunteers SET availability = ? WHERE id = ?", (data.availability, volunteer_id))
        if cursor.rowcount == 0:
            raise HTTPException(404, "Volunteer not found.")
        return {"message": "Volunteer availability updated."}

@app.get("/api/facilities")
def get_facilities(facility_type: Optional[str] = None):
    if facility_type and facility_type not in {"hospital", "shelter"}:
        raise HTTPException(400, "Invalid facility type.")
    with get_connection() as db:
        if facility_type:
            rows = db.execute("SELECT * FROM facilities WHERE facility_type = ? ORDER BY name", (facility_type,)).fetchall()
        else:
            rows = db.execute("SELECT * FROM facilities ORDER BY name").fetchall()
        return [dict(row) for row in rows]

@app.get("/api/inventory")
def get_inventory():
    with get_connection() as db:
        rows = db.execute("SELECT * FROM inventory ORDER BY item_name").fetchall()
        return [dict(row) for row in rows]

@app.post("/api/inventory", status_code=201)
def create_inventory(data: InventoryCreate):
    try:
        with get_connection() as db:
            cursor = db.execute("""
                INSERT INTO inventory (item_name, category, quantity, unit, location, minimum_quantity)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (data.item_name, data.category, data.quantity, data.unit, data.location, data.minimum_quantity))
            item_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "An inventory item with this name already exists.")
    log_activity("INVENTORY_CREATED", f"Inventory item #{item_id} added.")
    return {"message": "Inventory item created.", "item_id": item_id}

@app.patch("/api/inventory/{item_id}")
def update_inventory(item_id: int, data: InventoryUpdate):
    with get_connection() as db:
        cursor = db.execute("UPDATE inventory SET quantity = ? WHERE id = ?", (data.quantity, item_id))
        if cursor.rowcount == 0:
            raise HTTPException(404, "Inventory item not found.")
        log_activity("INVENTORY_UPDATED", f"Inventory item #{item_id} quantity updated.")
        return {"message": "Inventory updated."}

@app.get("/api/allocations")
def get_allocations():
    with get_connection() as db:
        rows = db.execute("""
            SELECT allocations.id, allocations.item_id, allocations.facility_id, allocations.quantity,
                   allocations.notes, allocations.created_at, inventory.item_name, inventory.unit,
                   facilities.name AS facility_name
            FROM allocations
            JOIN inventory ON inventory.id = allocations.item_id
            JOIN facilities ON facilities.id = allocations.facility_id
            ORDER BY allocations.created_at DESC
        """).fetchall()
        return [dict(row) for row in rows]

@app.post("/api/allocations", status_code=201)
def create_allocation(data: AllocationCreate):
    """
    Executes an inventory supply allocation transaction.
    Decrements item stock level without inflating facility human bed occupancy.
    """
    with get_connection() as db:
        item = db.execute("SELECT * FROM inventory WHERE id = ?", (data.item_id,)).fetchone()
        facility = db.execute("SELECT * FROM facilities WHERE id = ?", (data.facility_id,)).fetchone()
        
        if item is None:
            raise HTTPException(404, "Inventory item not found.")
        if facility is None:
            raise HTTPException(404, "Facility not found.")
        if item["quantity"] < data.quantity:
            raise HTTPException(400, "Insufficient inventory quantity available.")

        # Decrement item quantity in inventory (Leaves facility bed occupancy unaffected)
        db.execute("UPDATE inventory SET quantity = quantity - ? WHERE id = ?", (data.quantity, data.item_id))
        
        cursor = db.execute("""
            INSERT INTO allocations (item_id, facility_id, quantity, notes, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (data.item_id, data.facility_id, data.quantity, data.notes, now()))
        allocation_id = cursor.lastrowid
        
        log_activity("RESOURCE_ALLOCATED", f"Allocation #{allocation_id} created.")
        return {
            "message": "Resource allocated successfully.",
            "allocation_id": allocation_id,
        }

@app.get("/api/alerts")
def get_alerts(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    radius_km: float = Query(default=5.0, gt=0, le=100),
):
    with get_connection() as db:
        rows = db.execute("SELECT * FROM incidents WHERE status != 'resolved'").fetchall()
        alerts = []
        for row in rows:
            distance = calculate_distance(latitude, longitude, row["latitude"], row["longitude"])
            if distance <= radius_km:
                alert = dict(row)
                alert["distance_km"] = round(distance, 2)
                alert["alert"] = True
                alerts.append(alert)
        alerts.sort(key=lambda item: item["distance_km"])
        return {
            "radius_km": radius_km,
            "location": {"latitude": latitude, "longitude": longitude},
            "alert_count": len(alerts),
            "alerts": alerts,
            "simulation": True,
        }

@app.get("/api/safe-facilities")
def get_safe_facilities(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    with get_connection() as db:
        rows = db.execute("SELECT * FROM facilities WHERE facility_type = 'shelter' AND occupied < capacity").fetchall()
        facilities = []
        for row in rows:
            distance = calculate_distance(latitude, longitude, row["latitude"], row["longitude"])
            facility = dict(row)
            facility["distance_km"] = round(distance, 2)
            facility["available_capacity"] = row["capacity"] - row["occupied"]
            facilities.append(facility)
        facilities.sort(key=lambda item: item["distance_km"])
        return {
            "facilities": facilities,
            "simulation": True,
            "notice": "These are fictional demonstration shelters.",
        }

@app.get("/api/activity")
def get_activity(limit: int = Query(default=20, ge=1, le=100)):
    with get_connection() as db:
        rows = db.execute("SELECT * FROM activity_log ORDER BY id DESC LIMIT PI() LIMIT ?" if False else "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(row) for row in rows]

@app.get("/api/inventory/low-stock")
def get_low_stock():
    with get_connection() as db:
        rows = db.execute("SELECT * FROM inventory WHERE quantity <= minimum_quantity ORDER BY quantity ASC").fetchall()
        return [dict(row) for row in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
