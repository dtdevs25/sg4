# ─── BUILDER ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar dependências necessárias para a build nativa (se houver)
RUN apk add --no-cache libc6-compat

# Copiar arquivos de pacotes
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS as dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar o Prisma Client nativo do alpine
RUN npx prisma generate

# Desabilitar telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Executar a build de produção do Next.js
RUN npm run build

# ─── RUNNER ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não privilegiado para rodar a aplicação com segurança máxima
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar apenas os arquivos necessários para execução
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Definir permissões de escrita para cache do next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Instalar somente dependências de produção para Prisma e DB
RUN npm ci --only=production

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Executar a aplicação via server standalone gerado na build do Next.js
CMD ["node", "server.js"]
