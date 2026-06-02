# Use the official Dev Container image for Node.js 22
FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Set working directory inside container
WORKDIR /workspace

# Install Zsh, Oh My Zsh, and fonts
RUN apt-get update && apt-get install -y \
    curl \
    fonts-jetbrains-mono \
    fonts-firacode

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies (without copying all files first)
RUN npm install

# Copy the entire project
COPY . .

SHELL ["/usr/bin/zsh", "-c"]

# Set default command
CMD ["npm", "run", "dev"]
