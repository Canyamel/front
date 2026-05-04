FROM nginx:alpine

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
# Поменять на нужный путь
COPY ./dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
