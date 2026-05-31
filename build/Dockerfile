FROM nginx:alpine

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY ./dist /usr/share/nginx/html

ENV API_BACKEND_URL=http://localhost:8080
ENV DZI_BACKEND_URL=http://localhost:8005

CMD ["nginx", "-g", "daemon off;"]
