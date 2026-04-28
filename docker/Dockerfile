FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (including dev deps for build)
FROM base AS deps
COPY package*.json pnpm-workspace.yaml ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/
COPY packages/shared-types/package*.json packages/shared-types/
RUN npm ci

# Build shared types and API
FROM deps AS build
COPY . .
RUN npm run build --workspace=@retail-ims/shared-types \
  && npm run build --workspace=api

# Production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/.env.example ./apps/api/.env.example
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
