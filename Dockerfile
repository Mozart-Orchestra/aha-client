FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./
COPY patches ./patches
RUN yarn install --frozen-lockfile --ignore-engines

FROM deps AS builder
ARG APP_ENV=production
ARG EXPO_PUBLIC_POSTHOG_API_KEY=""
ARG EXPO_PUBLIC_REVENUE_CAT_STRIPE=""
ARG EXPO_PUBLIC_HAPPY_SERVER_URL="https://top1vibe.com/api/v3"
ARG EXPO_PUBLIC_GENOME_HUB_URL="https://top1vibe.com/genome/v3"

ENV NODE_ENV=production \
    APP_ENV=${APP_ENV} \
    EXPO_NO_TELEMETRY=1 \
    EXPO_PUBLIC_POSTHOG_API_KEY=${EXPO_PUBLIC_POSTHOG_API_KEY} \
    EXPO_PUBLIC_REVENUE_CAT_STRIPE=${EXPO_PUBLIC_REVENUE_CAT_STRIPE} \
    EXPO_PUBLIC_HAPPY_SERVER_URL=${EXPO_PUBLIC_HAPPY_SERVER_URL} \
    EXPO_PUBLIC_GENOME_HUB_URL=${EXPO_PUBLIC_GENOME_HUB_URL}

COPY . .
RUN yarn expo export --platform web --output-dir dist --clear

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
