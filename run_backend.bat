set PYTHONPATH=%cd%
cd backend
uvicorn main:app --reload
