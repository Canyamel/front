# Docker / nginx (УЗИ, Цитология и др. SPA)

Статика + прокси API: фронт ходит на относительные `/api/...`, nginx пересылает на бэкенды.

## Сборка УЗИ

```bash
npm run build:ultrasound

cp -r apps/ultrasound/dist build/dist

docker build -t medml-ultrasound ./build
```

При сборке фронта задайте относительную базу API (см. `apps/ultrasound/.env.production`):

```bash
VITE_API_BASE_URL=/api/v1 npm run build:ultrasound
```

Запросы уйдут на `/api/v1/...`; nginx `location /api` проксирует их на `API_BACKEND_URL` с тем же путём.

## Сборка цитологии

```bash
npm run build:cytology

cp -r apps/cytology/dist build/dist

docker build -t medml-cytology ./build
```

При сборке фронта задайте относительные базы API (см. `apps/cytology/.env.production`):

```bash
VITE_API_BASE_URL=/api/v3 VITE_DZI_API_BASE_URL=/api/bid/v1/dzi npm run build:cytology
```

Запросы уйдут на:
- `/api/v3/...` -> `API_BACKEND_URL`
- `/api/bid/v1/dzi/...` -> `DZI_BACKEND_URL`

## Запуск (для любого SPA из `build/dist`)

```bash
docker run -p 8080:80 \
  -e API_BACKEND_URL=http://10.164.2.11:8080 \
  -e DZI_BACKEND_URL=http://10.164.2.11:8005 \
  medml-cytology
```

Шаблон `nginx.conf.template` обрабатывается entrypoint образа `nginx:alpine` (`envsubst` → `/etc/nginx/conf.d/default.conf`).
