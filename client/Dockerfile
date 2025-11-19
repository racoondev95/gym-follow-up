FROM node:18-alpine AS build

ARG MACBOOK_IP=localhost
ENV MACBOOK_IP=${MACBOOK_IP}

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Replace API URL in environment files
# For production, always use /api (nginx proxy)
# For development, use MACBOOK_IP if provided
RUN if [ -n "$MACBOOK_IP" ] && [ "$MACBOOK_IP" != "localhost" ]; then \
      sed -i "s|http://localhost:3000/api|http://${MACBOOK_IP}:3000/api|g" src/environments/environment.ts; \
    fi
# Ensure production always uses /api for nginx proxy
RUN sed -i "s|http://localhost:3000/api|/api|g" src/environments/environment.prod.ts && \
    sed -i "s|http://192.168.0.149:3000/api|/api|g" src/environments/environment.prod.ts

RUN npm run build -- --configuration production

FROM nginx:alpine

COPY --from=build /app/dist/gym-follow-up-client/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

