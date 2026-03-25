FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./
COPY patches ./patches
COPY sources/team-config ./sources/team-config
RUN yarn install --frozen-lockfile --ignore-engines

FROM deps AS builder
ARG APP_ENV=production
ARG EXPO_PUBLIC_POSTHOG_API_KEY=""
ARG EXPO_PUBLIC_REVENUE_CAT_STRIPE=""
ARG EXPO_PUBLIC_HAPPY_SERVER_URL="https://top1vibe.com/api/v3"
ARG EXPO_PUBLIC_GENOME_HUB_URL="https://top1vibe.com/genome/v3"
ARG BASE_PATH=""

ENV NODE_ENV=production \
    APP_ENV=${APP_ENV} \
    EXPO_NO_TELEMETRY=1 \
    EXPO_PUBLIC_POSTHOG_API_KEY=${EXPO_PUBLIC_POSTHOG_API_KEY} \
    EXPO_PUBLIC_REVENUE_CAT_STRIPE=${EXPO_PUBLIC_REVENUE_CAT_STRIPE} \
    EXPO_PUBLIC_HAPPY_SERVER_URL=${EXPO_PUBLIC_HAPPY_SERVER_URL} \
    EXPO_PUBLIC_GENOME_HUB_URL=${EXPO_PUBLIC_GENOME_HUB_URL}

COPY . .
RUN yarn expo export --platform web --output-dir dist --clear

RUN ASSET_PREFIX="${BASE_PATH}" && \
    echo "Normalizing exported web asset paths with prefix: ${ASSET_PREFIX:-/}" && \
    find dist -name '*.html' -exec sed -i \
      -e "s|href=\"\\./_expo/|href=\"${ASSET_PREFIX}/_expo/|g" \
      -e "s|href=\"_expo/|href=\"${ASSET_PREFIX}/_expo/|g" \
      -e "s|href=\"/_expo/|href=\"${ASSET_PREFIX}/_expo/|g" \
      -e "s|href=\"\\./assets/|href=\"${ASSET_PREFIX}/assets/|g" \
      -e "s|href=\"assets/|href=\"${ASSET_PREFIX}/assets/|g" \
      -e "s|href=\"/assets/|href=\"${ASSET_PREFIX}/assets/|g" \
      -e "s|href=\"\\./favicon|href=\"${ASSET_PREFIX}/favicon|g" \
      -e "s|href=\"favicon|href=\"${ASSET_PREFIX}/favicon|g" \
      -e "s|href=\"/favicon|href=\"${ASSET_PREFIX}/favicon|g" \
      -e "s|src=\"\\./_expo/|src=\"${ASSET_PREFIX}/_expo/|g" \
      -e "s|src=\"_expo/|src=\"${ASSET_PREFIX}/_expo/|g" \
      -e "s|src=\"/_expo/|src=\"${ASSET_PREFIX}/_expo/|g" \
      -e "s|src=\"\\./assets/|src=\"${ASSET_PREFIX}/assets/|g" \
      -e "s|src=\"assets/|src=\"${ASSET_PREFIX}/assets/|g" \
      -e "s|src=\"/assets/|src=\"${ASSET_PREFIX}/assets/|g" {} + && \
    find dist -name '*.js' -exec sed -i \
      -e "s|\"\\./_expo/|\"${ASSET_PREFIX}/_expo/|g" \
      -e "s|\"_expo/|\"${ASSET_PREFIX}/_expo/|g" \
      -e "s|\"/_expo/|\"${ASSET_PREFIX}/_expo/|g" \
      -e "s|\"\\./assets/|\"${ASSET_PREFIX}/assets/|g" \
      -e "s|\"assets/|\"${ASSET_PREFIX}/assets/|g" \
      -e "s|\"/assets/|\"${ASSET_PREFIX}/assets/|g" {} +

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner
ARG BASE_PATH=""
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Replace the default nginx config with a base-path-aware variant when BASE_PATH is set.
RUN if [ -n "$BASE_PATH" ]; then \
      echo "server { \
        listen 8080; \
        location ${BASE_PATH}/ { \
          alias /usr/share/nginx/html/; \
          index index.html; \
          try_files \$uri \$uri/ ${BASE_PATH}/index.html; \
        } \
        location = ${BASE_PATH} { return 301 ${BASE_PATH}/; } \
      }" > /etc/nginx/conf.d/default.conf; \
    fi

EXPOSE 8080
