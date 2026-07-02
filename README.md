<div align="center">
  <img src="assets/banner.png" alt="PGVault Banner" width="100%" />

  <br />
  <br />

  **A sleek, ultra-secure, and automated backup solution for PostgreSQL databases.**

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Amazon_S3-569A31?style=for-the-badge&logo=amazon-s3&logoColor=white" alt="Amazon S3" />
    <img src="https://img.shields.io/badge/Google_Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Google Drive" />
  </p>
</div>

---

## 🌟 Overview

**PGVault** is a modern, web-based database management tool designed to take the headache out of database backups. Whether you are running a single database or managing a fleet of applications, PGVault provides a beautiful, unified interface to automate, encrypt, and securely store your PostgreSQL backups across multiple cloud providers.

Gone are the days of writing custom bash scripts, setting up brittle crontabs, or manually downloading SQL dumps. With PGVault, you configure it once through our beautiful UI, and let the system handle the rest.

---

## 🚀 Key Features

### 🛡️ Uncompromising Security
- **Magic Login:** Passwordless authentication using one-time passcodes (OTP) delivered securely via Email or SMS.
- **Military-Grade Encryption:** Backups can be compressed and encrypted using 7zip AES-256 encryption before they ever leave your server.
- **Secure Architecture:** Designed with isolated internal components to prevent unauthorized access.

### ☁️ Multi-Cloud Destinations
- **Local Storage:** Keep a copy directly on the server's hard drive.
- **Amazon S3:** Stream backups to AWS S3, Wasabi, DigitalOcean Spaces, or any S3-compatible object storage.
- **Google Drive:** Seamlessly authorize PGVault to automatically organize your backups into Google Drive folders.

### ⏱️ True Automation
- **Cron Scheduling:** Set precise backup schedules using standard cron syntax directly from the UI.
- **Automated Retention:** PGVault automatically prunes old, expired backups across all of your cloud destinations.

### 🎨 Beautiful, Responsive UI
- Built with **Next.js**, **Tailwind CSS**, and **Lucide Icons** for a premium dark mode experience.
- Interactive charts and visual logs keep you informed about the health of your backups at a glance.

---

## 🏗️ Architecture

PGVault consists of three containerized services orchestrated by Docker:

| Service | Port | Description |
|---|---|---|
| **Frontend** | `3000` | Next.js UI — the dashboard you interact with |
| **Backend** | `3001` | Node.js Express API — handles `pg_dump`, encryption, and cloud uploads |
| **MySQL** | internal | Stores PGVault's own user accounts, settings, and backup logs |

> **Note:** The MySQL container is **only** for PGVault's internal data. Your PostgreSQL databases that you want to back up run separately on your server.

---

## ⚡ Quickstart Deployment Guide

### Prerequisites
- A Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose installed
- A domain name pointed to your server (for HTTPS via nginx)

### Step 1 — Install Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
```

### Step 2 — Download the Compose File

```bash
mkdir ~/pgvault
cd ~/pgvault
wget https://raw.githubusercontent.com/Haris-khan-Durrani/PGVault-Core/main/docker-compose.yml
```

### Step 3 — Start PGVault

```bash
sudo docker-compose up -d
```

Docker will pull the pre-built images from Docker Hub and start all three containers automatically.

### Step 4 — Set Up a Reverse Proxy (Recommended)

For HTTPS access with your domain, set up nginx to proxy to the frontend:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Disable caching for the app (important!)
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }
}
```

> ⚠️ **Important:** If your nginx panel (e.g., aaPanel/BT Panel) has proxy caching enabled, make sure to disable it for your PGVault domain. Cached JavaScript files will cause the app to malfunction.

### Step 5 — Register and Log In

Navigate to `https://yourdomain.com` (or `http://your-server-ip:3000`) and click **Register** to create your account.

---

## 🐘 Connecting to Your PostgreSQL Database

After logging in, go to **Settings → Database** to configure your PostgreSQL connection.

### Scenario A: PostgreSQL installed directly on the same server (most common)

If your PostgreSQL is installed on the host server (e.g., via aaPanel, apt, or a control panel), PGVault runs inside Docker and **cannot use `127.0.0.1`** to reach it — Docker containers have their own isolated network.

**You must follow these two steps:**

#### Step 1 — Allow Docker containers in pg_hba.conf

Edit the PostgreSQL host-based authentication file:

```bash
# Find your pg_hba.conf location (usually one of these):
find /www/server/pgsql -name "pg_hba.conf" 2>/dev/null
find /etc/postgresql -name "pg_hba.conf" 2>/dev/null
```

Open the file and add this line **before** the existing `host` entries:

```
# Allow Docker containers to connect
host    all    all    172.16.0.0/12    md5
```

> This covers the entire Docker network range (`172.16.x.x` to `172.31.x.x`), so it works regardless of which IP Docker assigns.

Then reload PostgreSQL:

```bash
# aaPanel / BT Panel:
/www/server/pgsql/bin/pg_ctl reload -D /www/server/pgsql/data/

# System PostgreSQL:
systemctl reload postgresql
```

#### Step 2 — Allow PostgreSQL to listen on all interfaces

Edit `postgresql.conf` (in the same directory as `pg_hba.conf`) and ensure:

```
listen_addresses = '*'
```

Restart PostgreSQL after this change:

```bash
/www/server/pgsql/bin/pg_ctl restart -D /www/server/pgsql/data/
# OR
systemctl restart postgresql
```

#### Step 3 — Add host.docker.internal to docker-compose.yml

Edit your `~/pgvault/docker-compose.yml` and add `extra_hosts` under the `backend` service:

```yaml
  backend:
    image: hariskhandurrani/pgvault-backend:latest
    container_name: pgvault-backend
    restart: always
    extra_hosts:
      - "host.docker.internal:host-gateway"   # ← Required for host DB access
    ports:
      - "3001:3001"
    # ... rest of config
```

Restart the backend:

```bash
cd ~/pgvault
sudo docker-compose up -d --force-recreate backend
```

#### Step 4 — Use host.docker.internal as the host

In PGVault → Settings → Database, enter:

| Field | Value |
|---|---|
| Host | `host.docker.internal` |
| Port | `5432` |
| Database | your database name |
| Username | your PostgreSQL username |
| Password | your PostgreSQL password |

Click **"Test Connection & Fetch Tables"** — it should connect successfully! ✅

---

### Scenario B: PostgreSQL on a separate remote server

Simply enter the remote server's IP address and credentials directly in the Settings → Database form. No extra configuration needed.

---

## 🔄 Updating PGVault

When new versions are released, update your live server:

```bash
cd ~/pgvault
sudo docker-compose pull
sudo docker-compose up -d
```

---

## ☁️ Setting Up Cloud Backups

### Amazon S3 / S3-Compatible Storage

In **Settings → Cloud Providers**:
- **Access Key ID** and **Secret Access Key**: From your AWS IAM user
- **Bucket Name**: Your S3 bucket name
- **Region**: e.g., `us-east-1`
- **Endpoint** (optional): For non-AWS providers like Wasabi (`s3.wasabisys.com`) or DigitalOcean Spaces

### Google Drive

In **Settings → Cloud Providers → Google Drive**:
1. Click **"Connect Google Drive"**
2. You will be redirected to Google to authorize PGVault
3. After authorization, PGVault will create a dedicated `PGVault Backups` folder in your Drive

> **For self-hosted instances:** You must create your own Google OAuth credentials and set the redirect URI to `https://yourdomain.com/dashboard/settings/google-callback` in Google Cloud Console.

---

## 🔒 Google OAuth Setup (Self-Hosted)

If you are running PGVault on your own domain, you need your own Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
5. Choose **Web Application**
6. Add your domain to **Authorized JavaScript Origins**: `https://yourdomain.com`
7. Add the callback URL to **Authorized Redirect URIs**: `https://yourdomain.com/dashboard/settings/google-callback`
8. Copy the **Client ID** and **Client Secret** into PGVault's Settings → Cloud Providers → Google Drive

---

## 🔧 Troubleshooting

### ❌ "Failed to connect to PostgreSQL: ECONNREFUSED 127.0.0.1:5432"
Your PostgreSQL is on the host machine but PGVault is in Docker. Follow **Scenario A** above — you need `host.docker.internal` as the host.

### ❌ "no pg_hba.conf entry for host 172.x.x.x"
The Docker container IP is not in PostgreSQL's allowed hosts list. Add `host all all 172.16.0.0/12 md5` to `pg_hba.conf` and reload PostgreSQL.

### ❌ Backup status shows "failed"
- Make sure your database credentials in **Settings → Database** are correct
- Click **"Test Connection"** to verify the connection works before triggering a backup
- Check that `pg_dump` is available in the backend container: `docker exec pgvault-backend which pg_dump`

### ❌ Google Drive redirect goes to localhost
Make sure you have added `https://yourdomain.com/dashboard/settings/google-callback` (not localhost) as an **Authorized Redirect URI** in Google Cloud Console.

### ❌ App loads but API calls fail (500 errors)
If using an nginx reverse proxy with caching enabled, clear the proxy cache and disable caching for your PGVault domain. Old JavaScript files cached by nginx cause API routing failures.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
