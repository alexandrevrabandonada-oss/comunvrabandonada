FROM node:22.19.0-bookworm-slim
WORKDIR /work
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
ARG COMUN_M6_BROWSER=0
RUN if [ "$COMUN_M6_BROWSER" = "1" ]; then npx playwright install --with-deps chromium; fi
ARG COMUN_SOURCE_SHA
LABEL comun.source.sha="$COMUN_SOURCE_SHA"
CMD ["sleep", "infinity"]
