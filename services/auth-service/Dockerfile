FROM node:22-alpine
ENV NODE_ENV=production
# Giữ cùng cấu trúc thư mục như trong repo: /app/auth-service và /app/proto
WORKDIR /app/auth-service
COPY services/auth-service/package*.json ./
RUN npm ci --omit=dev
COPY services/auth-service/ ./
COPY proto/ /app/proto/
USER node
EXPOSE 3001 50051
CMD ["node", "src/app.js"]