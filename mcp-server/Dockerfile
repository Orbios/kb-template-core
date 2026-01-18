FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source code
COPY src/ ./src/

# Set environment
ENV NODE_ENV=production
ENV KB_ROOT=/kb

# Run server
CMD ["node", "src/server.js"]
