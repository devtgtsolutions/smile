FROM node:18-alpine AS build

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build


# Final stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

# Application
COPY --from=build /app/dist ./dist

# Prisma schema/migrations
COPY --from=build /app/prisma ./prisma

# IMPORTANT: new prisma-client generator output
COPY --from=build /app/generated ./generated

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/src/main.js"]