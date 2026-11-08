
import pytest
from fastapi.testclient import TestClient
from main import app, initialize_database

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    initialize_database()

def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_dashboard_metrics_endpoint():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "total_incidents" in data
    assert "active_sos" in data

def test_allocation_does_not_alter_facility_occupancy():
    payload = {
        "item_id": 1,
        "facility_id": 1,
        "quantity": 10,
        "notes": "Automated test allocation"
    }
    facility_before = client.get("/api/facilities").json()[0]
    
    response = client.post("/api/allocations", json=payload)
    assert response.status_code == 201
    
    facility_after = client.get("/api/facilities").json()[0]
    # Ensure physical supply transfers do NOT inflate human shelter occupancy
    assert facility_before["occupied"] == facility_after["occupied"]

def test_proximity_alerts_with_dynamic_radius():
    response = client.get("/api/alerts?latitude=26.8467&longitude=80.9462&radius_km=10.0")
    assert response.status_code == 200
    data = response.json()
    assert data["radius_km"] == 10.0
    assert "alerts" in data
    assert isinstance(data["alerts"], list)
