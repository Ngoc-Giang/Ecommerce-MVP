# Build từ THƯ MỤC GỐC repo (context: .) để lấy được thư mục proto/ dùng chung.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/order-service
COPY order-service/package*.json ./
RUN npm ci --omit=dev
COPY order-service/ ./
COPY proto/ /app/proto/
USER node
EXPOSE 3003 50054
CMD ["node", "src/app.js"]