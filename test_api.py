import sys
import os
from fastapi.testclient import TestClient

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from main import app

client = TestClient(app)

# Test 1: shichen = 早子时
payload_early = {
    "birth_year": 2026,
    "month": 2,
    "day": 15,
    "hour": 0,
    "minute": 0,
    "gender": "女",
    "time_mode": "shichen",
    "shichen": "早子时",
    "language": "zh"
}

response = client.post("/api/chart", json=payload_early)
print("Early Zi Status:", response.status_code)
if response.status_code == 200:
    data = response.json()
    print("Early Zi Four Pillars:", 
          data['year_pillar']['gan'] + data['year_pillar']['zhi'], 
          data['month_pillar']['gan'] + data['month_pillar']['zhi'], 
          data['day_pillar']['gan'] + data['day_pillar']['zhi'], 
          data['hour_pillar']['gan'] + data['hour_pillar']['zhi'])
else:
    print("Early Zi Error:", response.text)

# Test 2: shichen = 晚子时
payload_late = {
    "birth_year": 2026,
    "month": 2,
    "day": 15,
    "hour": 0,
    "minute": 0,
    "gender": "女",
    "time_mode": "shichen",
    "shichen": "晚子时",
    "language": "zh"
}

response = client.post("/api/chart", json=payload_late)
print("Late Zi Status:", response.status_code)
if response.status_code == 200:
    data = response.json()
    print("Late Zi Four Pillars:", 
          data['year_pillar']['gan'] + data['year_pillar']['zhi'], 
          data['month_pillar']['gan'] + data['month_pillar']['zhi'], 
          data['day_pillar']['gan'] + data['day_pillar']['zhi'], 
          data['hour_pillar']['gan'] + data['hour_pillar']['zhi'])
else:
    print("Late Zi Error:", response.text)
