# ─── BUILDER ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Cache do apk entre builds (BuildKit)
RUN apk add --no-cache libc6-compat

# --- CACHE BUSTER ---
# Mudando esse valor forçamos o Docker a ignorar o cache corrompido da layer "unknown parent image ID"
ENV DOCKER_CACHE_BUSTER=3
# --------------------

# Copiar manifests ANTES do código fonte para aproveitar cache de layers.
# Se package.json não mudou, o npm install abaixo é reutilizado do cache.
COPY package*.json ./
COPY prisma ./prisma/

# Evitar que o Prisma tente gerar o client automaticamente durante o npm install (o que pode travar em alguns ambientes)
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

# Limitar o uso de memória do Node.js durante o build para evitar que a VPS do Caprover comece a fazer swap agressivo (o que causa demoras de 20+ minutos)
ENV NODE_OPTIONS="--max-old-space-size=1536"

# npm install otimizado
RUN npm install --no-audit --no-fund && npm cache clean --force

# Copiar o restante do código fonte
COPY . .

# Gerar o Prisma Client nativo do Alpine
RUN npx prisma generate

# Build de produção do Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Remove dependências de desenvolvimento para deixar a imagem leve e evitar problemas de ENOSPC
RUN npm prune --production

# ─── RUNNER ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV DOCKER_CACHE_BUSTER=3
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Arquivos públicos e configuração
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Standalone output do Next.js (inclui tudo que precisa para rodar)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/start.sh ./start.sh

# Dar permissão de execução ao script
RUN chmod +x ./start.sh

# Copia todos os módulos de produção otimizados do builder, garantindo que
# a CLI do Prisma e todos os seus sub-módulos (como 'effect') estejam presentes.
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]
