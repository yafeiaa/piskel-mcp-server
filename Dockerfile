FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev 2>/dev/null; exit 0
RUN npm install 2>/dev/null; exit 0

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Set HTTP transport mode
ENV TRANSPORT=http
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
