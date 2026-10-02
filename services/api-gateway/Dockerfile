FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/api-gateway
COPY services/api-gateway/package*.json ./
RUN npm ci --omit=dev
COPY services/api-gateway/ ./
COPY proto/ /app/proto/
USER node
EXPOSE 3000
CMD ["node", "src/app.js"]