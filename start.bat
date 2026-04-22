@echo off
echo Starting Benam Fish Disease Detection System...

echo 1. Starting FastAPI Backend on http://localhost:8000
start /b uvicorn main:app --host 0.0.0.0 --port 8000

echo 2. Starting Streamlit Dashboard
streamlit run app.py

pause
