# Use an official Node.js runtime as a parent image (slim variant for better security)
# Patched LTS line: Node 24.x >= 24.22.1 (CVE-2026-111497 "Node2Shell" fix, 2026-10-21 release line).
# Node 23 is EOL non-LTS and does not receive these fixes.
# Digest pin per fleet rule security#86 (pin + date, re-pin on trigger): pinned 2026-10-24.
FROM node:24-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205


# Install Python, pip, and other dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Install uv via pip
RUN pip3 install uv --break-system-packages 

# Set the working directory in the container
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml first to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod

# Copy the rest of the application source code
COPY . .

# Set the default port the app will run on
ENV PORT=50880

# Make port 50880 available to the world outside this container
EXPOSE 50880

# Define the command to run the app
CMD ["node", "bin/index.js"]
