# PodCraft AI

An AI-powered Podcast Script Generation System built with FastAPI, LangChain, Groq (LLaMA), and Supabase. Deployable on AWS S3 (frontend) + EC2 (backend via Docker).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     PodCraft AI                         │
│                                                         │
│  ┌──────────────┐          ┌──────────────────────────┐ │
│  │   Frontend   │  HTTP    │       Backend (FastAPI)  │ │
│  │  (S3 Static) │ ──────►  │                          │ │
│  │  HTML/CSS/JS │          │  Agent Pipeline:         │ │
│  └──────────────┘          │  1. Document Analyzer    │ │
│                            │  2. Topic Extractor      │ │
│  AWS S3                    │  3. Topic Validator      │ │
│  Static Hosting            │  4. Prompt Builder       │ │
│                            │  5. Script Generator     │ │
│                            │  6. Script Refiner       │ │
│                            │                          │ │
│                            │  Groq API (LLaMA)        │ │
│                            │  Supabase (Storage)      │ │
│                            └──────────────────────────┘ │
│                                   AWS EC2 + Docker       │
└─────────────────────────────────────────────────────────┘
```

---

## Local Setup

### Prerequisites
- Python 3.13+
- [uv](https://docs.astral.sh/uv/) — fast Python package manager

```bash
# Install uv (if not already installed)
curl -Ls https://astral.sh/uv/install.sh | sh   # macOS/Linux
# or on Windows (PowerShell):
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Steps

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd PodCraft-AI

# 2. Create .env from example
cp .env.example .env
# Fill in GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY

# 3. Create venv and install backend dependencies with uv
cd backend
uv venv
uv pip install -r requirements.txt

# 4. Run the backend
uv run uvicorn main:app --reload --port 8000

# 5. Open frontend
# Open frontend/index.html in a browser (or use Live Server)
```

---

## Docker Setup

```bash
# From project root
cd docker
docker-compose up --build

# Backend runs at http://localhost:8000
```

---

## AWS Deployment

### A) Frontend → AWS S3

1. Go to AWS Console → S3 → Create Bucket
2. Uncheck "Block all public access"
3. Upload all files from `frontend/` folder
4. Go to Properties → Static Website Hosting → Enable
5. Set index document to `index.html`
6. Update `API_BASE_URL` in `frontend/script.js` to your EC2 public IP:
   ```js
   const API_BASE_URL = "http://<your-ec2-public-ip>:8000";
   ```
7. Note the S3 website URL (e.g. `http://your-bucket.s3-website-us-east-1.amazonaws.com`)
8. Add that URL to `ALLOWED_ORIGINS` in `backend/config/settings.py` and redeploy

### B) Backend → AWS EC2 (Docker)

```bash
# 1. Launch EC2 (Ubuntu 22.04, t2.micro or larger)
# 2. Open port 8000 in Security Group inbound rules

# 3. SSH into EC2
ssh -i your-key.pem ubuntu@<ec2-public-ip>

# 4. Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose
sudo systemctl start docker

# 5. Clone your repo
git clone <your-repo-url>
cd PodCraft-AI

# 6. Create .env file
cp .env.example .env
nano .env  # fill in your keys

# 7. Run the container
cd docker
sudo docker-compose up -d --build

# Backend is live at http://<ec2-public-ip>:8000
```

---

## Environment Variables

| Variable       | Description                        |
|----------------|------------------------------------|
| GROQ_API_KEY   | API key from console.groq.com      |
| SUPABASE_URL   | Your Supabase project URL          |
| SUPABASE_KEY   | Your Supabase anon/public key      |

---

## API Documentation

| Method | Endpoint          | Description                          |
|--------|-------------------|--------------------------------------|
| POST   | /upload-docs      | Upload PDF, DOCX, or TXT document    |
| GET    | /extract-topics   | Extract top 10 topics from document  |
| POST   | /validate-topics  | Validate user topics vs extracted    |
| POST   | /generate-script  | Generate full podcast script         |
| POST   | /modify-script    | Refine script with new instructions  |
| POST   | /reset            | Clear session data                   |

Interactive API docs available at: `http://localhost:8000/docs`

---

## Supabase Table Setup

Run this SQL in your Supabase SQL editor:

```sql
create table podcast_scripts (
  id uuid default gen_random_uuid() primary key,
  host_name text,
  guest_name text,
  topics text[],
  duration int,
  script text,
  created_at timestamptz
);
```
