# DataPulseV2 Application

## About The Project

DataPulseV2 is a comprehensive web application for managing, monitoring, and interacting with data models. It features a Node.js/Express backend with an SQLite database and a vanilla JavaScript frontend. The project is designed to be a full-stack solution for data scientists and developers, providing tools for everything from data generation and model training to prediction and results analysis.

## Built With

*   [Node.js](https://nodejs.org/)
*   [Express](https://expressjs.com/)
*   [SQLite](https://www.sqlite.org/index.html)
*   [Vite](https://vitejs.dev/)
*   [ESLint](https://eslint.org/)
*   [Prettier](https://prettier.io/)
*   [FastAPI](https://fastapi.tiangolo.com/)
*   [PostgreSQL](https://www.postgresql.org/)

## Table of Contents

*   [Architecture](#architecture)
*   [Built With](#built-with)
*   [Features](#features)
*   [File Structure](#file-structure)
*   [Requirements](#requirements)
*   [Database Schema (PostgreSQL)](#database-schema-postgresql)
*   [Getting Started](#getting-started)
*   [Contributing](#contributing)
*   [License](#license)
*   [Contact](#contact)
*   [Detailed Backend and System Design](#detailed-backend-and-system-design)
*   [Implementation Plan & To-Do List](#implementation-plan--to-do-list)
*   [UI/UX & Icon Style Enhancement Plan](#uiux--icon-style-enhancement-plan)
*   [Refactor & Cleanup Strategy](#-step-by-step-refactor--cleanup-strategy)

## Architecture

The application follows a client-server architecture:

*   **Backend:** A Node.js/Express server handles API requests, interacts with the SQLite database, and manages user authentication with JWT.
*   **Frontend:** A Single Page Application (SPA) built with vanilla HTML, CSS, and JavaScript. It dynamically loads components and interacts with the backend via API calls.
*   **Build Process:** Vite is used for a modern development workflow, providing a fast dev server and an optimized production build.
*   **Code Quality:** ESLint and Prettier are configured to ensure code consistency and quality.

## Features

DataPulseV2 includes a rich set of features organized into distinct, dynamically loaded components:

*   **Authentication:** A simulated user authentication system with sign-in and sign-up forms.
*   **Dashboard:** A central hub providing an overview of key metrics, model performance, notifications, and access to various model tabs (`All Models`, `In Progress`, `Active Models`).
*   **All Models Page:** A comprehensive view of all available models, including community and pre-trained models, with search and filter capabilities.
*   **Custom Model Creation:** An intuitive interface for users to define and create their own data models.
*   **Prediction Generation:** A page to utilize existing models to generate predictions on new data.
*   **Data Generator:** A tool to create synthetic datasets by specifying the number of rows and columns, with estimates for file size and token cost.
*   **Rules Engine:** An interface to create, manage, and apply custom rules to data processes, with dynamic cost estimation.
*   **User Profile & Settings:** Pages for users to manage their profile information and application settings, including a dark/light mode theme switcher.
*   **Token Management:** A dedicated tab to view and manage token balances and transaction history.
*   **Community & Contact:** Pages for community interaction and a contact form for user inquiries.

## File Structure

The project is organized into a modular structure that separates concerns, making it scalable and maintainable.

```
.
├── index.html                  # Main entry point of the application
├── README.md                   # Project documentation
└── src/
    ├── components/             # Reusable UI components and page-specific modules
    │   ├── ActiveModelsTabContent/
    │   ├── AllModelsPage/
    │   ├── AllModelsTabContent/
    │   ├── AuthPage/
    │   ├── CommunityPage/
    │   ├── ContactUsPage/
    │   ├── CustomModelCreationPage/
    │   ├── DashboardPage/
    │   ├── DashboardTabs/
    │   ├── DataGeneratorPage/
    │   ├── DataTaggingPage/
    │   ├── DownloadDataPage/
    │   ├── GeneratePredictionsPage/
    │   ├── Header/
    │   ├── InProgressTabContent/
    │   ├── ModelPerformance/
    │   ├── NotificationsAlerts/
    │   ├── PretrainedModelsPage/
    │   ├── RulesEnginePage/
    │   ├── SettingsPage/
    │   ├── Sidebar/
    │   ├── TokensTabContent/
    │   ├── UserDetailsPage/
    │   └── UserProfilePage/
    ├── data/                   # Stores local JSON data used by the application
    │   ├── activeModelsData.json
    │   ├── allModelsData.json
    │   ├── communityModelsData.json
    │   ├── inProgressData.json
    │   ├── modelPerformanceData.json
    │   ├── notificationsAlertsData.json
    │   ├── pretrainedModelsData.json
    │   └── tokensData.json
    ├── js/                     # Contains JavaScript files for application logic
    │   └── main.js             # Main script for routing, component loading, and event handling
    └── styles/                 # Contains global CSS styles
        └── global.css          # Global styles applied across the application
```

## Requirements

### Backend (Node.js)
- Node.js (v14 or higher recommended)
- npm
- Dependencies listed in `server/package.json`

### Python Services
- Python 3.x
- pip
- Dependencies listed in `backend/requirements.txt` (FastAPI, etc.)

### Database
- PostgreSQL

## Database Schema (PostgreSQL)

-- USERS & AUTH
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    token_balance INT DEFAULT 0,
    subscription_plan TEXT DEFAULT 'free',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    company TEXT,
    position TEXT,
    avatar_url TEXT
);

CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_type TEXT NOT NULL CHECK (key_type IN ('production', 'development')),
    hashed_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, key_type)
);

-- USER SETTINGS
CREATE TABLE user_settings (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dark_mode BOOLEAN DEFAULT FALSE,
    auto_save BOOLEAN DEFAULT TRUE,
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    email_notifications BOOLEAN DEFAULT TRUE,
    model_completion_alerts BOOLEAN DEFAULT TRUE,
    api_usage_warnings BOOLEAN DEFAULT TRUE,
    weekly_reports BOOLEAN DEFAULT FALSE,
    data_analytics BOOLEAN DEFAULT TRUE,
    session_timeout_minutes INT DEFAULT 30,
    data_retention_days INT DEFAULT 60,
    api_rate_limiting_enabled BOOLEAN DEFAULT TRUE,
    debug_mode BOOLEAN DEFAULT FALSE,
    cache_duration_minutes INT DEFAULT 5
);

-- MODELS
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    name TEXT,
    description TEXT,
    type TEXT CHECK (type IN ('pretrained', 'custom', 'community')),
    visibility TEXT CHECK (visibility IN ('private', 'public')) DEFAULT 'private',
    status TEXT CHECK (status IN ('idle', 'training', 'predicting', 'retraining', 'active')),
    performance JSONB,
    retrain_from INT REFERENCES models(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MODEL SETTINGS (Custom Models)
CREATE TABLE model_settings (
    id SERIAL PRIMARY KEY,
    model_id INT REFERENCES models(id),
    hidden_layers TEXT,
    batch_size INT,
    epochs INT,
    function_type TEXT,
    train_fields JSONB,
    predict_fields JSONB
);

-- FILE UPLOADS
CREATE TABLE uploads (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    model_id INT REFERENCES models(id),
    filename TEXT,
    path TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TAGGED DATA MAPPINGS
CREATE TABLE data_mappings (
    id SERIAL PRIMARY KEY,
    upload_id INT REFERENCES uploads(id),
    model_id INT REFERENCES models(id),
    column_name TEXT,
    mapped_field TEXT
);

-- JOB TRACKING (Train / Predict / Generate)
CREATE TABLE model_jobs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    model_id INT REFERENCES models(id),
    job_type TEXT CHECK (job_type IN ('training', 'prediction', 'generation', 'rules')),
    progress INT DEFAULT 0,
    status TEXT CHECK (status IN ('running', 'paused', 'cancelled', 'completed')),
    token_cost INT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- PREDICTION RESULTS
CREATE TABLE prediction_results (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    model_id INT REFERENCES models(id),
    result_file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GENERATED DATA (From Data Generator)
CREATE TABLE generated_data (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    instance_name TEXT,
    description TEXT,
    rows INT,
    columns INT,
    file_size TEXT,
    token_cost INT,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RULES ENGINE
CREATE TABLE rules (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    model_id INT REFERENCES models(id),
    rule_name TEXT,
    logic_json JSONB,
    token_cost INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- COMMUNITY VOTES
CREATE TABLE model_votes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    model_id INT REFERENCES models(id),
    vote_type TEXT CHECK (vote_type IN ('up', 'down'))
);

-- TOKEN TRANSACTIONS
CREATE TABLE token_transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    model_id INT,
    change INT,
    reason TEXT,
    balance_after INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title TEXT,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## Getting Started

To run this application locally, follow these steps:

1.  **Install backend dependencies:**
    ```bash
    cd server
    npm install
    ```
2.  **Start the backend server:**
    ```bash
    npm start
    ```
3.  **Install frontend dependencies (in a new terminal):**
    ```bash
    npm install
    ```
4.  **Start the frontend dev server:**
    ```bash
    npm run dev
    ```
5.  **Install Python dependencies for the backend services:**
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

### Test User Credentials

You can log in with the following test user:

*   **Username:** `testuser`
*   **Password:** `password123`

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/your_username/your_project](https://github.com/your_username/your_project)

---

## Detailed Backend and System Design

This section outlines the proposed architecture and implementation details for a robust, full-stack version of the DataPulseV2 application, focusing on a Python-based backend.

### 1. File Upload & Storage
**Goal:** Let users upload CSVs that will be tagged and sent to Python scripts.

- Save uploaded CSVs in a `/user_data/{user_id}/{filename}` folder.
- Store file metadata in DB: `user_id`, `filename`, `upload_time`, `linked_model_id`.

**Example Tech:**
- **Storage:** Local (initially), later move to S3/Supabase/Firebase.
- **Backend Route:** `POST /upload-data`
- **Store path in database:** `Uploads` table.

### 2. Tagging Columns
**Goal:** Once uploaded, parse columns and let user map tags to them.

- Read CSV header.
- Display dropdowns in UI based on selected model's required fields.
- When submitted, save the mappings (e.g. `{ "age": "feature_1", "income": "feature_2" }`).

**Backend:**
- Save tagged mapping in a `DataMappings` table: `upload_id`, `column_name`, `mapped_field`, `model_id`.

### 3. Model Definition & Execution Flow
**a) Pre-trained Models**
- Stored in `pretrained_models/` folder.
- Backend reads metadata + required fields.
- Predict using a Python script:
  - Script reads user data + mapping.
  - Returns result (CSV or JSON).

**b) Custom Models**
- User defines settings (e.g. model type, layers, batch size).
- You save those settings to DB.
- Trigger Python script with settings + uploaded CSV.
- Script saves trained model to `user_models/{user_id}/{model_name}.pkl`.
- Store metadata + performance in DB.

**Run Python Scripts:**
- Use `subprocess` in Node.js or Python Flask backend:
  ```python
  subprocess.run(["python", "train_model.py", "--settings=settings.json"])
  ```

### 4. In-Progress Tracking
**Goal:** Show status of model training/prediction.

- **`ModelJobs` table:** `job_id`, `user_id`, `model_id`, `type` (training, predicting), `progress`, `status`.
- Run Python scripts async (e.g. with a queue or job tracker).
- Update job progress every few seconds in DB.

### 5. Download Prediction Results
**Goal:** When job finishes, user clicks “Download”.

- Save predicted file at: `/user_predictions/{user_id}/{model_id}/{output.csv}`.
- **DB table:** `PredictionResults` (`user_id`, `model_id`, `file_path`, `created_at`).
- **Route:** `GET /download/:result_id`.

### 6. Data Generator & Rules Engine
- Frontend sends user inputs.
- Backend plugs inputs into `generate_data.py` or `rules_engine.py`.
- Output is saved in `/user_generated/{user_id}/...`.
- Result file linked in DB like a model.

### 7. Community & Visibility Logic
- **`Models` table should include:** `visibility` (private/public), `votes_up`, `votes_down`.
- Create `Votes` table to track who voted.
- **Users can:**
  - Add public model to library (create link to `user_id`).
  - Retrain model with their own data (clone + update link).

### 8. Token System
- Every action deducts tokens (training, prediction, generation).
- **`Tokens` table:** `user_id`, `change`, `reason`, `balance_after`, `timestamp`.
- **Logic:**
  - Check if user has enough tokens before job.
  - Deduct tokens on job start.
  - Revert if job fails.

### 🧠 DATABASE TABLES SUMMARY
| Table             | Purpose                        |
| ----------------- | ------------------------------ |
| Users             | Auth, token balance            |
| Models            | Pretrained & custom models     |
| ModelSettings     | All training config            |
| Uploads           | Uploaded CSVs                  |
| DataMappings      | Column mappings                |
| ModelJobs         | Job progress tracking          |
| PredictionResults | Downloadable outputs           |
| GeneratedData     | Data generator outputs         |
| Rules             | Rule configs                   |
| Votes             | Up/down votes                  |
| Tokens            | Token transactions             |

### ✅ 2. API ROUTES (Node.js or Python Flask/FastAPI Suggested)
You’ll want to break the routes into logical groups:

**📦 Model Management**
| Method | Route                  | Purpose                    |
| ------ | ---------------------- | -------------------------- |
| GET    | `/models/user`         | List user models           |
| GET    | `/models/community`    | Public models              |
| POST   | `/models`              | Create new model           |
| PUT    | `/models/:id/status`   | Update status              |
| PUT    | `/models/:id/visibility`| Change public/private      |
| DELETE | `/models/:id`          | Delete model               |

**🔄 Model Training & Prediction**
| Method | Route                      | Purpose                           |
| ------ | -------------------------- | --------------------------------- |
| POST   | `/train`                   | Train custom model (triggers Python) |
| POST   | `/predict`                 | Run prediction using selected model |
| GET    | `/prediction/:id/download` | Download prediction result        |

**📁 File Upload & Tagging**
| Method | Route                   | Purpose                        |
| ------ | ----------------------- | ------------------------------ |
| POST   | `/upload`               | Upload CSV                     |
| GET    | `/upload/:id/columns`   | Get column names from CSV      |
| POST   | `/upload/:id/tag`       | Submit column mappings         |

**⚙️ Data Generator**
| Method | Route                     | Purpose                         |
| ------ | ------------------------- | ------------------------------- |
| POST   | `/generate-data`          | Trigger data generator script   |
| GET    | `/generated/:id/download` | Download generated CSV file     |

**📜 Rules Engine**
| Method | Route                 | Purpose                             |
| ------ | --------------------- | ----------------------------------- |
| POST   | `/rules`              | Submit rules JSON                   |
| GET    | `/rules/:id`          | Retrieve saved rules                |
| POST   | `/rules/:id/execute`  | Run rules engine on uploaded data   |

**📈 Tokens & Progress**
| Method | Route                  | Purpose                           |
| ------ | ---------------------- | --------------------------------- |
| GET    | `/tokens`              | Get current balance               |
| POST   | `/tokens/charge`       | Deduct for job                    |
| POST   | `/tokens/add`          | Add on purchase                   |
| GET    | `/jobs/in-progress`    | Get all active jobs               |
| GET    | `/jobs/:id/progress`   | Poll for a job’s % completion     |

**👍 Voting & Community**
| Method | Route                | Purpose                    |
| ------ | -------------------- | -------------------------- |
| POST   | `/models/:id/vote`   | Upvote/downvote a model    |
| GET    | `/models/:id/votes`  | Get vote counts            |

### ✅ 3. File Handling Plan
You'll store and access files like this:
```
/user_data/{user_id}/uploads/...
/user_data/{user_id}/models/{model_name}.pkl
/user_data/{user_id}/predictions/{model_id}/{result.csv}
/user_data/{user_id}/generated/{instance_name}.csv
```
In Backend:
- Use `fs` in Node.js or `os.path` in Python to ensure folder structure.
- Create folders dynamically for each user.
```python
import os

def ensure_user_folder(user_id):
    base = f"./user_data/{user_id}"
    os.makedirs(base + "/uploads", exist_ok=True)
    os.makedirs(base + "/models", exist_ok=True)
    os.makedirs(base + "/predictions", exist_ok=True)
    os.makedirs(base + "/generated", exist_ok=True)
```

### ✅ Project Structure
```
backend/
├── main.py                # FastAPI entry point
├── models/                # Pydantic schemas
│   └── schemas.py
├── routes/                # Route groupings
│   ├── auth.py
│   ├── models.py
│   ├── upload.py
│   ├── jobs.py
│   ├── generator.py
│   ├── rules.py
│   ├── tokens.py
│   └── votes.py
├── services/              # Python script triggers / business logic
│   ├── train_model.py
│   ├── predict.py
│   ├── data_generator.py
│   └── rules_engine.py
├── database.py            # DB connection
├── utils.py               # File handling helpers
└── requirements.txt
```

### ✅ `main.py`
```python
from fastapi import FastAPI
from routes import auth, models, upload, jobs, generator, rules, tokens, votes

app = FastAPI()

# Register routes
app.include_router(auth.router)
app.include_router(models.router)
app.include_router(upload.router)
app.include_router(jobs.router)
app.include_router(generator.router)
app.include_router(rules.router)
app.include_router(tokens.router)
app.include_router(votes.router)

@app.get("/")
def root():
    return {"message": "DataPulse API running"}
```

### ✅ `routes/models.py` – Example: Model Management
```python
from fastapi import APIRouter, HTTPException
from models.schemas import ModelCreateRequest
from database import db

router = APIRouter(prefix="/models", tags=["Models"])

@router.post("/")
def create_model(data: ModelCreateRequest):
    query = """
        INSERT INTO models (user_id, name, description, type, visibility, status)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
    """
    new_id = db.execute(query, (
        data.user_id,
        data.name,
        data.description,
        data.type,
        data.visibility,
        'idle'
    )).fetchone()[0]
    return {"model_id": new_id}

@router.get("/user/{user_id}")
def get_user_models(user_id: int):
    query = "SELECT * FROM models WHERE user_id = %s"
    rows = db.fetch_all(query, (user_id,))
    return rows
```

### ✅ `routes/upload.py` – Uploading Files & Tagging
```python
from fastapi import APIRouter, UploadFile, File
import os
from utils import save_file, get_csv_columns

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("/")
async def upload_csv(user_id: int, model_id: int, file: UploadFile = File(...)):
    path = f"user_data/{user_id}/uploads/{file.filename}"
    save_file(path, await file.read())
    # Save metadata to DB...
    return {"file_path": path}

@router.get("/{upload_id}/columns")
def get_columns(upload_id: int):
    # Lookup file path from DB
    path = db.get_upload_path(upload_id)
    columns = get_csv_columns(path)
    return {"columns": columns}
```

### ✅ `routes/jobs.py` – Trigger Train / Predict / Track
```python
from fastapi import APIRouter
from services.train_model import train_model
from services.predict import predict_data

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/train")
def start_training(user_id: int, model_id: int):
    job_id = train_model(user_id, model_id)  # Async or subprocess
    return {"job_id": job_id}

@router.post("/predict")
def start_prediction(user_id: int, model_id: int):
    job_id = predict_data(user_id, model_id)
    return {"job_id": job_id}

@router.get("/in-progress")
def list_active_jobs(user_id: int):
    jobs = db.fetch_all("SELECT * FROM model_jobs WHERE user_id=%s AND status='running'", (user_id,))
    return jobs
```

### ✅ `routes/generator.py` – Generate Synthetic Data
```python
from fastapi import APIRouter
from services.data_generator import generate_data

router = APIRouter(prefix="/generate-data", tags=["Data Generator"])

@router.post("/")
def trigger_generator(user_id: int, instance_name: str, rows: int, columns: int):
    file_path = generate_data(user_id, instance_name, rows, columns)
    return {"file": file_path}
```

### ✅ `services/train_model.py` – Python Trigger Example
```python
import subprocess
import os

def train_model(user_id, model_id):
    cmd = ["python", "services/train_script.py", "--user", str(user_id), "--model", str(model_id)]
    subprocess.Popen(cmd)
    # Return job ID or tracker
    return model_id
```

### ✅ `utils.py` – File Utils
```python
import csv
import os

def save_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(content)

def get_csv_columns(path):
    with open(path, newline='') as csvfile:
        reader = csv.reader(csvfile)
        headers = next(reader)
        return headers
```

### ✅ Database Naming Structure
In your `models` table:
```sql
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    name TEXT,  -- not UNIQUE
    ...
);
```
**🔑 Key Principle:**
You do not make `name` UNIQUE. Instead, you ensure uniqueness on the combination of `user_id` + `name` if needed:
```sql
CREATE UNIQUE INDEX unique_model_name_per_user ON models(user_id, name);
```

### ✅ File Naming & Folder Structure (Local FS)
Since your scripts and results are running/stored locally, use this structure:
```bash
/user_data/
  └── {user_id}/
        ├── models/
        │     ├── {model_name}/
        │     │     ├── model.pkl
        │     │     └── settings.json
        ├── uploads/
        └── predictions/
```
**💡 Why this works:**
- Each user's models live in their own folder (`user_id` namespace).
- Even if two users have models called "propensity-to-pay", they don’t overwrite each other.

In your script, build paths dynamically like:
```python
model_path = f"user_data/{user_id}/models/{model_name}/model.pkl"
```

### ✅ Best Practice: Use Internal `model_id` as Truth
Even if multiple models are named "Churn Predictor" or "Propensity Model", your backend should always operate using the internal `model_id` as the identifier.
- Display `model.name` to the user.
- Store and retrieve using `model.id`.

**Optional Enhancement:**
Append a short hash if names must be file-unique:
```
model_path = f"{model_name}_{model_id}/model.pkl"
```

### ✅ Summary
| Layer       | Naming Rule                                                    |
| ----------- | -------------------------------------------------------------- |
| Database    | Allow duplicates of `name`, enforce uniqueness with `user_id` + `name` if desired |
| File System | Namespace by `user_id` folder or `model_id`                    |
| Scripts/API | Always use `model_id` internally, never rely on just the name  |
| UI          | Display `name` freely, optionally append timestamps for UX clarity |

---

## Implementation Plan & To-Do List

This section outlines the phased development plan to build out the full functionality of the DataPulseV2 application, transitioning from the current state to the full-featured Python backend.

### ✅ Implementation Checklist with Security

#### 🔹 Phase 1: Backend & Database Foundation
- **Task:** Initialise PostgreSQL and create the database. - [ ]
- **Task:** Run the schema to set up all tables. - [ ]
- **Task:** Set up the FastAPI backend structure (`main.py`, `routes`, `services`, `models`). - [x]
- **Task:** Create a DB connection module (`database.py`). - [x]
- **Task:** Add Pydantic schemas in `models/schemas.py`. - [x]
- **Security:** Use parameterised SQL queries or an ORM to prevent SQL injection. - [ ]
- **Security:** Validate all user inputs (sanitise forms and API payloads). - [ ]

#### 🔹 Phase 1.1: Bootstrap Admin/Test User
- **Task:** On startup, check if the `users` table exists and is seeded.
- **Task:** If not, create the `users` table and insert a test user:
  - **Username:** `testuser`
  - **Password (hashed):** `password123`
- **Task:** Add an `ensure_tables_and_admin()` call in `main.py` or a startup script.
- **Note:** This prevents broken authentication flows on the first run.

#### 🔹 Phase 2: Auth System
- **Task:** Implement `/register` and `/login` routes.
- **Task:** Hash passwords (e.g., using `bcrypt`).
- **Task:** Issue JWTs securely with expiration and signing.
- **Task:** Implement middleware to verify JWT on protected endpoints.
- **Security:** Rate-limit login attempts.

#### 🔹 Phase 3: Frontend Auth Integration
- **Task:** Wire up the `AuthPage` to the backend.
- **Task:** Store the JWT in `localStorage` or `sessionStorage`.
- **Task:** Implement frontend route guards.
- **Task:** Update the UI based on the authentication state.

#### 🔹 Phase 4: File Upload & Management
- **Task:** Implement the `POST /upload` route.
- **Task:** Save files in `/user_data/{user_id}/uploads/`.
- **Task:** Store file metadata in the `uploads` table.
- **Task:** Display uploaded files in the UI.
- **Security:** Check file type and size limits.
- **Security:** Sanitize file names before saving.

#### 🔹 Phase 5: Model Management System
- **Task:** Implement a CRUD API for models.
- **Task:** Add a public/private toggle.
- **Task:** Link models to `user_id`.
- **Task:** Prevent duplicate model names (optional constraint).
- **Task:** Build the UI for viewing and creating models.

#### 🔹 Phase 6: Custom Model Creation
- **Task:** Create a UI for inputting the model structure (layers, batch size, epochs).
- **Task:** Save settings to the `model_settings` table.
- **Security:** Validate numerical input ranges (e.g., epochs not > 1000).

#### 🔹 Phase 7: Data Tagging & Mapping
- **Task:** Get column names from an uploaded CSV (`GET /upload/:id/columns`).
- **Task:** Allow mapping tags in the frontend.
- **Task:** Save mappings to the `data_mappings` table.

#### 🔹 Phase 8: Model Training & Prediction
- **Task:** Start jobs with `/jobs/train` and `/jobs/predict`.
- **Task:** The Python script should save models and return results.
- **Task:** Track job status in the `model_jobs` table.
- **Task:** Display progress in the UI.
- **Security:** Escape all subprocess inputs if passing them via the command line.

#### 🔹 Phase 9: Prediction Results & Downloads
- **Task:** Save results to `/user_data/{user_id}/predictions/...`.
- **Task:** Allow downloads via `/prediction/:id/download`.
- **Security:** Check file path ownership before allowing a download.

#### 🔹 Phase 10: Data Generator
- **Task:** Implement a UI to define rows and columns.
- **Task:** Call the `generate_data.py` script.
- **Task:** Store the output in the `generated_data` table.

#### 🔹 Phase 11: Rules Engine
- **Task:** Create a UI to define IF/THEN rules.
- **Task:** Submit the logic JSON to the `/rules` endpoint.
- **Task:** Execute rules with `/rules/:id/execute`.

#### 🔹 Phase 12: Token System
- **Task:** Deduct tokens for each action.
- **Task:** Track transactions in the `token_transactions` table.
- **Task:** Display the token balance and history.
- **Security:** Prevent token race conditions (e.g., double deduction on refresh).

#### 🔹 Phase 13: Voting & Community
- **Task:** Add a `/models/:id/vote` endpoint.
- **Task:** Store upvotes and downvotes.
- **Task:** Prevent duplicate votes.

#### 🔹 Phase 14: Final Security Sweep
- **Task:** Run tests to simulate:
  - SQL injection attempts
  - Broken authentication headers
  - Invalid JWTs
  - File path tampering
- **Task:** Sanitize all inputs and route parameters.
- **Task:** Use a Content-Security-Policy (CSP), CORS, and secure headers in production.

#### 🔹 Phase 15: Testing & Deployment
- **Task:** Write unit and integration tests.
- **Task:** Refactor JavaScript and backend code for performance.
- **Task:** Polish the UI across all screen sizes.
- **Task:** Dockerize the application and database.
- **Task:** Deploy on a VPS or container host.

---

### 🔁 Step-by-Step Refactor & Cleanup Strategy

#### 🔹 1. Componentization Pass
- **Goal:** Modularize reusable UI chunks into their own folders.
- **Actions:**
  - Refactor UI into components like `ModelCard`, `UploadForm`, `ProgressBar`, `NotificationItem`, `IconButton`, `EmptyState`.
  - Place shared components in `src/components/common/`.
  - Create a `src/ui/` folder if UI-specific logic (transitions, modals) grows.

#### 🔹 2. Routing & State Cleanup
- **Actions:**
  - Remove inline route logic and centralize page transitions in a single router manager (`main.js`).
  - Ensure each tab/page loads only when needed (lazy loading).
  - Unify global state usage (e.g., auth token, theme, `selectedModel`) to avoid passing props down more than two levels.

#### 🔹 3. Dead Code & Legacy Cleanup
- **Actions:**
  - Run a full tree-shake to identify and remove unused code.
  - Delete unused folders (e.g., `DownloadDataPage/` if obsolete).
  - Remove all `console.log` statements except for errors/warnings.
  - Search for unused variables/functions using `eslint --report-unused-disable-directives`.
  - Delete any test stubs or hardcoded data files (e.g., `*_test.json`).
  - Replace any leftover `src/data/*.json` references with real API calls.
  - Run `vite build` or `npm run build` to identify tree-shaking warnings.

#### 🔹 4. Code Style Refactor
- **Actions:**
  - Use Prettier and ESLint auto-fix across all files.
  - Convert messy or duplicate `fetch` calls into a reusable utility:
    ```javascript
    async function apiFetch(path, options) {
      const res = await fetch(`/api/${path}`, options);
      return await res.json();
    }
    ```
  - Wrap all API calls into a `src/api/` folder and refactor to use a central error handler.

#### 🔹 5. Final Pass – Production Readiness
- **Actions (After Phase 14 - Security Testing):**
  - Clean up folders (delete unused routes, dead imports).
  - Perform a minification test to confirm the build output is lean.
  - Lint and format the codebase one last time.
  - Push to the `main` branch only after this is complete.

---

### 🎨 UI/UX & Icon Style Enhancement Plan

#### 🔹 1. Define a Universal Design Language
- **Goal:** Ensure consistency across all components.
- **Actions:**
  - Create a design system document or style guide with:
    - **Fonts:** e.g., Inter, Poppins, DM Sans.
    - **Button Styles:** Default, hover, active states.
    - **Card Layout:** Consistent structure and spacing.
    - **Spacing Rules:** Margins, paddings, grid system.
    - **Form Input Styling:** Standardized appearance.
    - **Visuals:** Shadows, borders, and corner radii.
    - **Indicators:** Loading and progress indicators.
  - Apply consistent `z-index`, modal, and tooltip patterns.
  - Add global spacing/typography tokens (via CSS variables or a JS config).

#### 🔹 2. Icon System Overhaul
- **Actions:**
  - Switch to a single icon library like **Lucide**, **Heroicons**, or **Tabler Icons**.
  - Replace inconsistent SVGs or emojis with icon components.
  - Ensure all icons:
    - Match in stroke width.
    - Use consistent sizing (e.g., 24x24 or 20x20).
    - Share the same color on inactive state (e.g., `#888`).
    - Use one accent color for hover/active states (e.g., purple: `#6c4efc`).
  - Add animation to active icons (e.g., a dashboard tab pulse on load).

#### 🔹 3. Component UI Consistency
- **Actions:** Audit and improve:
  - **Sidebar Navigation:** Icons, text alignment, hover effects.
  - **Tabs UI:** Consistent height, spacing, and animation for dashboard tabs.
  - **Model Cards:** Padding, corner radius, label hierarchy.
  - **Input Fields:** Consistent border, focus state, and validation colors.
  - **Buttons:** Standardized border-radius and hover transitions.
  - **Progress Bars:** Same height, rounded ends, and consistent labels.
  - **Text Layout:** Spacing and sizing for headings vs. descriptions.

#### 🔹 4. Theme & Colour Usage
- **Actions:**
  - Standardize the color palette:
    - **Primary:** `#6C4EFC` (purple)
    - **Secondary:** `#F0F2FA` (light grey backgrounds)
    - **Accent:** `#FFB822` (token highlights, callouts)
    - **Text Dark:** `#2C2C2C`
    - **Text Light:** `#888` or `#BBB`
  - Implement light/dark mode toggle logic based on `user_settings`.
  - Ensure accessible contrast for all components using a WCAG checker.

#### 🔹 5. Unify Empty States and Feedback
- **Actions:**
  - Create a reusable empty state component with an icon, message (e.g., “No models yet”), and an optional CTA button.
  - Standardize feedback elements:
    - Toasts
    - Error messages
    - Success messages
    - Confirmation modals

#### 🔹 6. Typography Rules
- **Actions:**
  - **Headings:** `font-weight: 600`, with a size gradient (e.g., 24px > 18px > 14px).
  - **Paragraph Text:** `font-size: 14px`, `line-height: 1.5`.
  - **Labels:** Use sentence case, not all-caps.

#### 🔹 7. Microinteractions & Transitions
- **Actions:**
  - Add consistent transitions for:
    - **Tab Switch:** Fade/slide effect.
    - **Card Hover:** Shadow lift effect.
    - **Button:** Background fade.
  - Add loading spinners or skeleton loaders for:
    - Uploads
    - Job status updates
    - Model cards while fetching data

#### 🔹 8. Final Pass – UI Consistency Audit
- **Actions:**
  - Run a full-screen UI pass and review:
    - Margin/padding alignment
    - Grid consistency
    - Font sizes and weights
    - Icon visual alignment
    - Component spacing on desktop, tablet, and mobile.

---

### 🧰 Tools & Libraries You Can Use
- **Icons:** Lucide, Heroicons
- **CSS Utils:** Tailwind (optional), or define global utility classes.
- **Design Tokens:** Style Dictionary (optional).
- **Mockups/Previews:** Use Figma to plan visual improvements.
