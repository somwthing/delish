# File: Dockerfile
FROM node:20-alpine

WORKDIR /app

# copy only package files first for caching
COPY package.json package-lock.json ./

RUN npm install --production

# copy the rest of the app
COPY . .

# ensure data dir
RUN mkdir -p /app/data \
    && chown -R node:node /app/data \
    && chmod -R 775 /app/data

# expose the port the app listens on
EXPOSE 3000

# healthcheck uses wget (install it)
RUN apk add --no-cache wget

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# start node directly (don't run nginx here)
CMD ["sh", "-c", "node server.js"]
