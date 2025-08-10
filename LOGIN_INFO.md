# DataPulse AI - Login Information

## Test Credentials

You can use the following test account to login:

- **Email**: `testuser@example.com`
- **Password**: `password123`

## Running the Application

### Backend (FastAPI)
The backend should be running on port 8000. If it's not running:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Frontend (Vite)
The frontend should be running on port 5173:

```bash
npm run dev
```

## Troubleshooting

1. **401 Error**: Make sure the backend is running on port 8000
2. **Network Error**: Check that both frontend and backend are running
3. **Database Error**: Run `python init_db.py` in the backend directory to initialize the database

## Creating a New Account

You can also create a new account using the Sign Up tab on the login page.

## API Endpoints

- Login: `POST http://localhost:8000/api/login`
- Register: `POST http://localhost:8000/api/register`
- Health Check: `GET http://localhost:8000/health`