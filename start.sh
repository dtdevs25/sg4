#!/bin/sh
# Roda a migração do banco de dados (Prisma) no startup do container
echo "Running Prisma DB Push..."
/app/node_modules/.bin/prisma db push --accept-data-loss || node_modules/.bin/prisma db push --accept-data-loss || echo "WARNING: prisma db push failed, continuing anyway..."

# Inicia a aplicação Next.js
echo "Starting Next.js..."
exec node server.js
