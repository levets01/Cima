FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:migrate && npm start"]
