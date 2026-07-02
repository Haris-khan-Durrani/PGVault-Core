# PGVault

A beautiful and powerful database backup solution.

## Quickstart Deployment Guide

Because PGVault is fully containerized and published to Docker Hub, deploying to a brand new Ubuntu server is incredibly simple. You do not need to install Node.js, PM2, or manually build any code.

### 1. Install Docker & Docker Compose
Connect to your new server via SSH and run this command to install Docker:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
```

### 2. Download the Compose File
You don't even need to clone the entire repository if you don't want to! You strictly just need the `docker-compose.yml` file. Create a directory and download it:
```bash
mkdir pgvault
cd pgvault
wget https://raw.githubusercontent.com/Haris-khan-Durrani/PGVault-Core/main/docker-compose.yml
```

*(Alternatively, you can just `git clone https://github.com/Haris-khan-Durrani/PGVault-Core.git` and `cd PGVault-Core`)*

### 3. Start the Application
Run the following command to pull the images from Docker Hub and start the application:
```bash
sudo docker-compose up -d
```

### 4. Done!
That's it! Docker will pull your pre-compiled frontend and backend images, set up the MySQL database, and link them all together automatically.

You can now visit your server's IP address on port `3000` (e.g., `http://your-server-ip:3000`) and use the Magic Login to access your vault!

## Updating the App in the Future
When you push new code to GitHub, the GitHub Action will automatically build and publish new images to Docker Hub. To update your live server, simply run:
```bash
cd pgvault
sudo docker-compose pull
sudo docker-compose up -d
```
