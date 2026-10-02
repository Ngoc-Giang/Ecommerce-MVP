# Build từ THƯ MỤC GỐC repo (context: .) để lấy được thư mục proto/ dùng chung.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/shipment-service
COPY shipment-service/package*.json ./
RUN npm ci --omit=dev
COPY shipment-service/ ./
COPY proto/ /app/proto/
USER node
EXPOSE 3005 50055
CMD ["node", "src/app.js"]