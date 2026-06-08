FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p auth_info

EXPOSE 3001

CMD ["node", "index.js"]
