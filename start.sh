#!/bin/sh
# Roda a migração do banco de dados (Prisma) no startup do container
echo "Running Prisma DB Push..."
npx prisma db push --accept-data-loss

# Inicia a aplicação Next.js
echo "Starting Next.js..."
exec node server.js
