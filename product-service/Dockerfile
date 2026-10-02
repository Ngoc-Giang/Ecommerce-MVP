# Build từ THƯ MỤC GỐC repo (context: .) để lấy được thư mục proto/ dùng chung.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/product-service
COPY product-service/package*.json ./
RUN npm ci --omit=dev
COPY product-service/ ./
COPY proto/ /app/proto/
USER node
EXPOSE 3004 50053
CMD ["node", "src/app.js"]