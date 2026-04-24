FROM node:22-alpine AS deps
WORKDIR /app
ARG NODE_OPTIONS=--max-old-space-size=12288
ENV NODE_OPTIONS=${NODE_OPTIONS}

COPY package.json yarn.lock ./
COPY packages/auth-contract ./packages/auth-contract
COPY patches ./patches
COPY sources/team-config ./sources/team-config
RUN yarn config set registry https://registry.yarnpkg.com
RUN yarn install --frozen-lockfile --ignore-engines --network-timeout 600000

FROM deps AS builder
ARG APP_ENV=production
ARG EXPO_PUBLIC_POSTHOG_API_KEY=""
ARG EXPO_PUBLIC_REVENUE_CAT_STRIPE=""
ARG EXPO_PUBLIC_HAPPY_SERVER_URL=""
ARG EXPO_PUBLIC_AHA_CLI_SERVER_URL=""
ARG EXPO_PUBLIC_AHA_CLI_WEBAPP_URL=""
ARG EXPO_PUBLIC_GENOME_HUB_URL=""
ARG EXPO_PUBLIC_SUPABASE_URL=""
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY=""
ARG EXPO_PUBLIC_SUPABASE_EMAIL_OTP_ENABLED="true"
ARG EXPO_PUBLIC_INVITATION_GATE_ENABLED="false"
ARG BASE_PATH=""

ENV NODE_ENV=production \
    APP_ENV=${APP_ENV} \
    EXPO_NO_TELEMETRY=1 \
    EXPO_PUBLIC_POSTHOG_API_KEY=${EXPO_PUBLIC_POSTHOG_API_KEY} \
    EXPO_PUBLIC_REVENUE_CAT_STRIPE=${EXPO_PUBLIC_REVENUE_CAT_STRIPE} \
    EXPO_PUBLIC_HAPPY_SERVER_URL=${EXPO_PUBLIC_HAPPY_SERVER_URL} \
    EXPO_PUBLIC_AHA_CLI_SERVER_URL=${EXPO_PUBLIC_AHA_CLI_SERVER_URL} \
    EXPO_PUBLIC_AHA_CLI_WEBAPP_URL=${EXPO_PUBLIC_AHA_CLI_WEBAPP_URL} \
    EXPO_PUBLIC_GENOME_HUB_URL=${EXPO_PUBLIC_GENOME_HUB_URL} \
    EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL} \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY} \
    EXPO_PUBLIC_SUPABASE_EMAIL_OTP_ENABLED=${EXPO_PUBLIC_SUPABASE_EMAIL_OTP_ENABLED} \
    EXPO_PUBLIC_INVITATION_GATE_ENABLED=${EXPO_PUBLIC_INVITATION_GATE_ENABLED} \
    BASE_PATH=${BASE_PATH}

COPY . .
RUN yarn expo export --platform web --output-dir dist --clear

# Rewrite asset paths for sub-path deployment (e.g. /webappv3)
RUN if [ -n "$BASE_PATH" ]; then \
      echo "Rewriting asset paths with base path: $BASE_PATH" && \
      node scripts/rewrite-web-base-path.mjs dist "$BASE_PATH"; \
    fi

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner
ARG BASE_PATH=""
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Replace the default nginx config with a base-path-aware variant when BASE_PATH is set.
# nginx-unprivileged runs as non-root, so we need to switch to root temporarily.
USER root
RUN if [ -n "$BASE_PATH" ]; then \
      echo "server { \
        listen 8080; \
        location = / { return 200 'ok'; } \
        location ${BASE_PATH}/ { \
          alias /usr/share/nginx/html/; \
          index index.html; \
          try_files \$uri \$uri/ ${BASE_PATH}/index.html; \
        } \
        location = ${BASE_PATH} { return 301 ${BASE_PATH}/; } \
      }" > /etc/nginx/conf.d/default.conf; \
    fi
USER nginx

# Fall back to copied nginx.conf when no BASE_PATH
COPY nginx.conf /tmp/nginx-default.conf
RUN if [ -z "$(cat /etc/nginx/conf.d/default.conf 2>/dev/null)" ]; then \
      cp /tmp/nginx-default.conf /etc/nginx/conf.d/default.conf; \
    fi

EXPOSE 8080
