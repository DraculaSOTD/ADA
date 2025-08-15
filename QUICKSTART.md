# 🚀 ADA Platform - Quick Start Guide

## ⚡ Fastest Setup (2 commands)

### Step 1: Start the Backend API
```bash
./run-backend.sh
```

### Step 2: Start the Frontend (in a new terminal)
```bash
npm run dev
```

That's it! Visit http://localhost:5173 to access the application.

---

## 📋 Prerequisites

### Minimal Requirements (for SQLite setup)
- Python 3.9+
- Node.js 16+
- npm or yarn

### Full Requirements (for PostgreSQL setup)
- All of the above plus:
- Docker & Docker Compose (recommended)
- OR PostgreSQL 13+ and Redis 6+

---

## 🛠️ Setup Options

### Option 1: Simple Setup (SQLite - No Docker Required)

1. **Start the backend:**
   ```bash
   ./run-backend.sh
   ```
   This script will:
   - Create a Python virtual environment
   - Install all dependencies
   - Use SQLite (no external database needed)
   - Start the API server on http://localhost:8000

2. **Start the frontend (new terminal):**
   ```bash
   npm install  # First time only
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - API Docs: http://localhost:8000/docs

### Option 2: Full Setup with Docker (PostgreSQL + Redis)

1. **Start all services:**
   ```bash
   ./start-dev.sh
   # Choose option 1 for Docker
   ```

2. **Start the frontend (new terminal):**
   ```bash
   npm install  # First time only
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - API Docs: http://localhost:8000/docs

---

## 🔧 Troubleshooting

### API Connection Issues (500 errors)

If you see 500 errors in the browser console:

1. **Check if the backend is running:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **If not running, start it:**
   ```bash
   ./run-backend.sh
   ```

3. **Check the backend logs for errors**

### Database Issues

- For SQLite: The database file `ada.db` will be created automatically
- For PostgreSQL: Ensure Docker containers are running:
  ```bash
  docker ps
  ```

### Port Conflicts

If ports are already in use:
- Backend: Edit `run-backend.sh` and change `--port 8000` to another port
- Frontend: Edit `vite.config.js` and change the port
- Update the proxy target in `vite.config.js` if you change the backend port

---

## 📝 Default Credentials

For development, you can register a new account or use:
- Email: admin@ada.com
- Password: admin123

---

## 🛑 Stopping the Services

### SQLite Setup:
- Backend: Press `Ctrl+C` in the terminal running the backend
- Frontend: Press `Ctrl+C` in the terminal running npm

### Docker Setup:
```bash
docker-compose -f docker-compose.dev.yml down
```

---

## 📚 Next Steps

1. **Register an account** or login with default credentials
2. **Explore the features:**
   - Generate synthetic data
   - Create and train models
   - Build automation rules
   - Analyze data patterns

3. **Check the API documentation:**
   - Visit http://localhost:8000/docs for interactive API docs
   - Test endpoints directly from the browser

---

## 💡 Tips

- The SQLite setup is perfect for development and testing
- Use Docker setup for production-like environment
- Frontend hot-reloads automatically when you make changes
- Backend auto-reloads with the `--reload` flag

## 🆘 Need Help?

- Check the full README.md for detailed documentation
- Review logs in the terminal for error messages
- Backend logs show detailed error information
- Frontend console (F12 in browser) shows API communication issues