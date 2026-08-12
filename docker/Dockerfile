FROM nginx:stable-alpine

COPY dist/ /app/web/
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /app/web/_worker.js

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
