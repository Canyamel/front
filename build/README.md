# Docker / nginx — цитология и УЗИ в одном образе

Один nginx отдаёт оба SPA на одном порту, каждое под своим префиксом, и
проксирует их API:

| Префикс      | Приложение | API приложения    | Куда уходит                         |
| ------------ | ---------- | ----------------- | ----------------------------------- |
| `/cytology/` | Цитология  | `/cytology/api/…` | `/api/…` на бэкенд цитологии        |
| `/uzi/`      | УЗИ        | `/uzi/api/…`      | `/api/…` на бэкенд УЗИ              |
| `/`          | —          | —                 | 302 на `/cytology/`                 |

Контейнер слушает порт 80, compose пробрасывает его на `3001`.

## Сборка

Образ статику **не** собирает — её нужно подготовить заранее. Приложения
собираются с префиксом из `.env.production` (`VITE_BASE_PATH`), папки в
`build/dist` называются так же, как префиксы:

```bash
npm run build:cytology
npm run build:ultrasound

# Windows
rmdir /S /Q build\dist\cytology build\dist\uzi
xcopy /E /I /Y apps\cytology\dist   build\dist\cytology
xcopy /E /I /Y apps\ultrasound\dist build\dist\uzi

# Linux / macOS
rm -rf build/dist/cytology build/dist/uzi
mkdir -p build/dist
cp -r apps/cytology/dist   build/dist/cytology
cp -r apps/ultrasound/dist build/dist/uzi
```

Перед сборкой проверьте, на какой бэкенд собирается каждое приложение:

- `apps/cytology/.env.production` — для Go-шлюза нужно
  `VITE_CYTOLOGY_BACKEND=go` и `VITE_API_BASE_URL=/api/v1`;
- `apps/ultrasound/.env.production` — `VITE_API_BACKEND=thyroid` для Django
  либо `med` для Go.

`VITE_API_BASE_URL` пишется без префикса: префикс приложения добавляется в
коде (`withBasePath` из `@medml/shared`).

## Запуск

Проще всего через `docker-compose.yml` в корне монорепозитория — он поднимает
фронт вместе с сервисом загрузки и подключается к сети Go-стека:

```bash
docker compose up -d --build
```

Вручную:

```bash
docker build -t medml-front ./build
docker run --rm -p 3001:80 \
  -e API_BACKEND_URL=http://host.docker.internal:8080 \
  -e UZI_API_BACKEND_URL=http://host.docker.internal:8000 \
  -e UZI_BILLING_BACKEND_URL=http://host.docker.internal:8080 \
  -e UPLOAD_BACKEND_URL=http://host.docker.internal:8090 \
  medml-front
```

Цитология — `http://localhost:3001/cytology/`, УЗИ — `http://localhost:3001/uzi/`.

## Переменные

| Переменная                | Куда идёт                          |
| ------------------------- | ---------------------------------- |
| `API_BACKEND_URL`         | API цитологии                      |
| `DZI_BACKEND_URL`         | тайлер (DZI), только python-режим  |
| `UPLOAD_BACKEND_URL`      | сервис чанковой загрузки           |
| `UZI_API_BACKEND_URL`     | основной API УЗИ (Django или шлюз) |
| `UZI_BILLING_BACKEND_URL` | биллинг УЗИ                        |

## Загрузка снимков цитологии

Пути `/api/upload/start`, `/chunk`, `/complete` и `/create-cytology` в разработке
поднимает плагин dev-сервера Vite. В собранном образе Node рядом нет, поэтому их
обслуживает отдельный сервис — `services/cytology-upload`, собранный на тех же
обработчиках (`lib/cytology-upload/src/server/handlers.ts`). Браузер ходит на
`/cytology/api/upload/...`, сервис получает `/api/upload/...`.

Без него загрузка `.svs` вернёт 404.

## Тонкости конфига

**Префикс срезается через `map $request_uri`, а не `rewrite`.** После `rewrite`
nginx отдаёт бэкенду декодированный URI, и `%2F` в пути DZI превратился бы в `/`.
`map` берёт исходный `$request_uri` и отдаёт путь в той кодировке, в какой его
прислал браузер.

**Адреса в `proxy_pass` подставляются через переменные** (`set $api_backend ...`),
а не литералами. С литеральным именем nginx резолвит апстрим при старте и падает
с `host not found in upstream`, если контейнер бэкенда ещё не поднят — фронт
тогда не запускается вовсе. С переменной и `resolver 127.0.0.11` резолв
откладывается до запроса: статика отдаётся всегда, а недоступный бэкенд даёт 502.

**Редиректы относительные** (`absolute_redirect off`). Абсолютный адрес nginx
собирает со своим портом 80, и за пробросом `3001:80` браузер ушёл бы с
`/` на `http://host/cytology/` — мимо фронта.

**Ассеты и `index.html` кэшируются по-разному.** Файлы в `/assets/` с хэшем в
имени кэшируются на год, а отсутствующий ассет — 404, не `index.html`.
Сам `index.html` отдаётся с `no-cache`: после деплоя браузер сразу видит новые
хэши, а не просит удалённые файлы.

**`NGINX_ENVSUBST_FILTER`** ограничивает подстановку только нашими переменными.
Иначе `envsubst` из образа nginx заменит все переменные окружения, какие найдёт,
включая совпадающие по имени с переменными самого nginx (`$host`, `$uri`).

## Не покрыто

`/uzi-images/` (снимки УЗИ из MinIO) этот nginx не проксирует — как и раньше.
В разработке их проксирует dev-сервер Vite.
