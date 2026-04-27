"""Shared fixtures for FitFlow AI backend tests."""
import os
import uuid
import base64
import pytest
import requests
from pathlib import Path

# Load backend .env for EXPO_BACKEND_URL-equivalent usage
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Prefer the public preview URL as required in env / problem statement.
# The frontend .env exposes EXPO_PUBLIC_BACKEND_URL; use it for realistic e2e tests.
_frontend_env = Path(__file__).resolve().parents[2] / "frontend" / ".env"
BASE_URL = None
if _frontend_env.exists():
    for line in _frontend_env.read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"')
            break
if not BASE_URL:
    BASE_URL = os.environ.get("EXPO_BACKEND_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL")

assert BASE_URL, "Public base URL not configured"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@fitflow.ai"
DEMO_PASSWORD = "Demo1234"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    return API


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(api_client):
    r = api_client.post(f"{API}/auth/login",
                        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
                        timeout=30)
    assert r.status_code == 200, f"Demo login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="session")
def demo_auth(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture(scope="session")
def new_user(api_client):
    """Create a brand-new user for isolation / profile tests."""
    email = f"test_{uuid.uuid4().hex[:10]}@fitflowtest.co"
    password = "Passw0rd!"
    r = api_client.post(f"{API}/auth/register",
                        json={"email": email, "password": password, "name": "Test User"},
                        timeout=30)
    assert r.status_code in (200, 201), f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "email": email,
        "password": password,
        "token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "user": data["user"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
    }


def _b64_data_url(path: str, mime: str = "image/jpeg") -> str:
    raw = Path(path).read_bytes()
    return f"data:{mime};base64,{base64.b64encode(raw).decode()}"


@pytest.fixture(scope="session")
def meal_image_b64():
    return _b64_data_url("/tmp/meal.jpg")


@pytest.fixture(scope="session")
def fridge_image_b64():
    return _b64_data_url("/tmp/fridge.jpg")
