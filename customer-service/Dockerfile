# Build từ THƯ MỤC GỐC repo (context: .) để lấy được thư mục proto/ dùng chung.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/customer-service
COPY customer-service/package*.json ./
RUN npm ci --omit=dev
COPY customer-service/ ./
COPY proto/ /app/proto/
USER node
EXPOSE 3002 50052
CMD ["node", "src/app.js"]