# 🚀 Vercel-like Deployment Platform 

This project is a **Vercel-like deployment platform** that allows users to deploy static frontend applications directly from a **GitHub repository URL**.

It uses **Docker, AWS ECS, AWS ECR, Amazon S3, Redis (Aiven/Valkey), Socket.IO**, and a **reverse proxy** to stream build logs and serve deployed static assets via subdomains.

---

## 🧠 Architecture Overview

```
GitHub Repo URL
      │
      ▼
API Server (9000)
      │
      ▼
AWS ECS (Fargate)
      │
      ▼
Build Server (Docker Image)
      │
      ├── Build frontend
      ├── Emit logs → Redis
      └── Upload dist/ → S3
                 │
                 ▼
         S3 Reverse Proxy (8000)
                 │
                 ▼
        https://<project>.localhost:8000
```

### Real-time logs flow

```
Build Server → Redis → Socket.IO (9002) → Frontend UI
```

---

## 📁 Project Structure

```
vercel-clone/
│
├── api-server/          # REST API + ECS task launcher
├── build-server/        # Dockerized build executor
├── s3-reverse-proxy/    # Serves S3 static files via subdomains
├── frontend/            # Next.js dashboard (UI)
└── README.md
```

---

## 🧩 Services & Ports

| Service          | Description                     | Port   |
| ---------------- | ------------------------------- | ------ |
| api-server       | REST API to trigger deployments | `9000` |
| socket-server    | Real-time logs (Socket.IO)      | `9002` |
| s3-reverse-proxy | Serves deployed apps            | `8000` |

---

## ⚙️ Prerequisites

* Node.js ≥ 18
* Docker
* AWS CLI (`aws configure`)
* AWS Account with:

  * ECS (Fargate)
  * ECR
  * S3
* Redis (Aiven / Valkey)
* Git

---

## 🔐 Environment Variables

Create `.env` files (DO NOT COMMIT THEM).

### `api-server/.env`

```env
REDIS_URL=rediss://<username>:<password>@<host>:<port>
AWS_REGION=ap-south-1
ECS_CLUSTER_ARN=arn:aws:ecs:...
ECS_TASK_DEFINITION_ARN=arn:aws:ecs:...
```

### `build-server/.env`

```env
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your-bucket-name
REDIS_URL=rediss://<username>:<password>@<host>:<port>
```

---

## 🧪 Local Setup

### 1️⃣ Install dependencies

```bash
cd api-server && npm install
cd ../build-server && npm install
cd ../s3-reverse-proxy && npm install
cd ../frontend && npm install
```

---

### 2️⃣ Build & Push Build Server to AWS ECR

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region ap-south-1 \
| docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# Build image
docker build -t build-server ./build-server

# Tag image
docker tag build-server:latest \
<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/build-server:latest

# Push image
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/build-server:latest
```

---

### 3️⃣ Configure AWS ECS

* Create **ECS Cluster (Fargate)**
* Create **Task Definition**

  * Container image → ECR image
  * CPU / Memory → as needed
  * Network mode → `awsvpc`
* Note:

  * **Cluster ARN**
  * **Task Definition ARN**

---

### 4️⃣ Start API & Proxy Servers

```bash
# API Server
cd api-server
node index.js
```

```bash
# Reverse Proxy
cd s3-reverse-proxy
node index.js
```

```bash
# Frontend
cd frontend
npm run dev
```

---

## 🚀 Deploying a Project

### API Request

```http
POST http://localhost:9000/project
Content-Type: application/json

{
  "gitURL": "https://github.com/username/repo-name"
}
```

### What happens?

1. API launches ECS task
2. Build server clones repo
3. Runs `npm install && npm run build`
4. Uploads `dist/` or `build/` to S3
5. Logs streamed via Redis → Socket.IO
6. App served at:

```
http://<project-slug>.localhost:8000
```

---

## 📡 Socket.IO Logs Subscription

```js
socket.emit("subscribe", `logs:${projectSlug}`)
```

Logs are streamed live from the build container.

---



## 🧑‍💻 Author

**Shriya Mohanty**
---

