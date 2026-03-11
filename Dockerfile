FROM node:lts-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src/ ./src/
COPY data/ ./data/
COPY public/ ./public/

EXPOSE 3000

CMD ["node", "src/server.js"]
