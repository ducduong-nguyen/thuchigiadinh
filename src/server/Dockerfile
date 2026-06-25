FROM node:20-bullseye-slim
WORKDIR /app
COPY package*.json ./
# Install temporary build dependencies to compile native modules, then remove them
RUN apt-get update \
	&& apt-get install -y --no-install-recommends build-essential python3 pkg-config libsqlite3-dev ca-certificates \
	&& npm install --production \
	&& apt-get purge -y --auto-remove build-essential python3 pkg-config \
	&& rm -rf /var/lib/apt/lists/*
COPY . .
EXPOSE 4000
CMD ["node", "index.js"]
