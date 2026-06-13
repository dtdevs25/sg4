# ─── BUILDER ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Cache do apk entre builds (BuildKit)
RUN apk add --no-cache libc6-compat

# Copiar manifests ANTES do código fonte para aproveitar cache de layers.
# Se package.json não mudou, o npm install abaixo é reutilizado do cache.
COPY package*.json ./
COPY prisma ./prisma/

# npm install com cache persistido entre builds pelo BuildKit.
# Isso evita baixar os 652 pacotes do zero a cada deploy.
RUN npm install

# Copiar o restante do código fonte
COPY . .

# Gerar o Prisma Client nativo do Alpine
RUN npx prisma generate

# Build de produção do Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── RUNNER ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Arquivos públicos e configuração
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Standalone output do Next.js (inclui tudo que precisa para rodar)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/start.sh ./start.sh

# Dar permissão de execução ao script
RUN chmod +x ./start.sh

# Prisma Client gerado no builder (já compilado para Alpine)
# Copiamos também a CLI do prisma para conseguir rodar db push no runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]
