# --- Build frontend (Vite) ---
FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Embutidas no bundle (Coolify: passar como Build Arguments)
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SCHOOL_SLUG
ARG VITE_PAINEL_YOUTUBE_PLAYLIST_ID
ARG VITE_PAINEL_OVERLAY_SECONDS

ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SCHOOL_SLUG=$VITE_SCHOOL_SLUG
ENV VITE_PAINEL_YOUTUBE_PLAYLIST_ID=$VITE_PAINEL_YOUTUBE_PLAYLIST_ID
ENV VITE_PAINEL_OVERLAY_SECONDS=$VITE_PAINEL_OVERLAY_SECONDS

RUN npm run build

# --- Runtime: API + static ---
FROM node:20-bookworm-slim

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

COPY server ./server
COPY --from=frontend-build /app/dist ./dist

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "index.js"]
