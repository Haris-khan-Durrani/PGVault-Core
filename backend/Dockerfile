# backend/Dockerfile
FROM node:20-bookworm-slim

# Install postgresql-client for pg_dump and p7zip-full for compression
RUN apt-get update && \
    apt-get install -y postgresql-client p7zip-full && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && npm start"]
