# Документация миграции из OLD-PROJECTS

## Общая информация

В папке `OLD-PROJECTS` находятся два старых проекта:
- **CYTO** - проект цитологии (бэкенд: `http://109.73.201.164:8000/api/v3`)
- **UZI** - проект УЗИ (бэкенд: `http://194.226.121.145:8080/api/v1/`)

Оба проекта имеют идентичную структуру, но разную специфику и свой бэкенд. Код требует рефакторинга перед переносом.

## Ответы на вопросы по архитектуре

### 1. Общие домены и бэкенды
- **Ответ:** У каждого приложения свой бэкенд
- **Решение:** Общие домены (auth, patients) могут использовать разные бэкенды через env переменные на уровне приложения

### 2. Структура приложений
- **Ответ:** Хочется, чтобы были общие части (patients и т.п.), но с возможностью кастомизировать что-то
- **Решение:** Общие домены выносятся в `domains/`, специфичные части остаются в `apps/`

### 3. Роутинг
- **Ответ:** Общие роуты (`/auth-pages/login`, `/patients`) выносим в общие домены, не дублируем
- **Решение:** `cytology` и `uzi_view` - по факту одно и то же (отображение снимка и сегментов), просто разная реализация

### 4. API endpoints
- **Ответ:** Скорее разная структура, пусть это будет настраиваться в конфигурации приложения через env или конфиги
- **Решение:** baseUrl настраивается через env переменные на уровне приложения

### 5. Environment variables
- **Ответ:** Хочется выносить на уровень приложения (в apps)
- **Решение:** Каждое приложение имеет свои `.env.local` файлы

### 6. Заголовки авторизации
- **Ответ:** Одинаковые - Bearer, поэтому создаем пустой api через createApi, а потом просто inject
- **Решение:** Общий `baseApi` с `prepareHeaders`, который использует общий `authSlice`

### 7. NextAuth конфигурация
- **Ответ:** Посмотреть в проектах, если там одинаковая, то одна
- **Решение:** Одна конфигурация с возможностью кастомизации (credentials field, token expiry)

### 8. Хранение токенов
- **Ответ:** Также, как сейчас в проектах
- **Решение:** Токены хранятся в Redux store (`authSlice`) + NextAuth session

### 9. Refresh токен
- **Ответ:** Да, одинаковая логика для обоих бэкендов

### 10. Viewer компоненты
- **Ответ:** Разные компоненты лучше, там нужно только создать какой-то общий viewer, даже 2 - osd и image
- **Решение:** Общие `OSDViewer` и `ImageViewer` в `lib/viewers`, специфичные `CytologyViewer` и `UziViewer` в приложениях

### 11. Сегменты
- **Ответ:** Скорее всего будет разная структура, поэтому нужно как-то закладывать логику передачи извне обработчиков и т.п.
- **Решение:** Обработчики сегментов передаются извне через props

### 12. Изображения
- **Ответ:** Отдельные компоненты это решат же? Если нет, то закладывать просто логику, что можно отключить несколько изображений
- **Решение:** Отдельные компоненты решают проблему

### 13. Auth slice
- **Ответ:** Надо постараться сделать общий authSlice, дабы в createApi один раз только указывать prepareHeaders
- **Решение:** Общий `authSlice` в `lib/store/src/slices/authSlice.ts`

### 14. Общие slices
- **Ответ:** Выбери сам - как лучше, чтобы понятно было
- **Решение:** Общие slices (loading, error) в `lib/store/src/slices/`

### 15. Специфичные slices
- **Ответ:** Специфичные слайсы вообще хочется только внутри приложений хранить этих
- **Решение:** Специфичные slices в `apps/*/src/store/slices/`

### 16. Контексты
- **Ответ:** Контексты нужно общие сделать, т.к. есть middleware по работе с loading и error, то лучше в слайсах
- **Решение:** Loading и Error через Redux slices + middleware, не через контексты

### 17. Обработка ошибок
- **Ответ:** Тосты - вроде так сейчас сделано в проектах, нужно предусмотреть, если это есть, разные типы ошибок
- **Решение:** Toast уведомления через Ant Design `message`, функция передается в store через `showToastFn`

### 18. Стили
- **Ответ:** Я хочу SCSS использовать в целом, тут модули скорее
- **Решение:** SCSS Modules для стилей компонентов

### 19. Глобальные стили
- **Ответ:** В зависимости от стилей - если они только для этого приложения, то в самом приложении, иначе глобально где-нибудь
- **Решение:** Глобальные стили в `lib/ui/src/styles/`, стили приложений в `apps/*/src/styles/`

### 20. Upload API
- **Ответ:** Проверить в проектах сам, вроде одинаковое
- **Решение:** Chunk upload одинаковый для обоих проектов

### 21. Chunk upload
- **Ответ:** Пусть чанки будут на обоих проектах, так более правильно
- **Решение:** Chunk upload на обоих проектах

### 22. Общие страницы
- **Ответ:** Не дублировать точно, лучше вынести на слой общий, т.к. это общие части
- **Решение:** Общие страницы через домены, роуты в apps используют компоненты из доменов

### 23. Middleware
- **Ответ:** Если нужен везде, то общий
- **Решение:** Общий middleware для защиты роутов

### 24. Порядок миграции
- **Ответ:** Auth → Patients → Viewer → остальное
- **Решение:** Такой порядок миграции

### 25. Приоритеты
- **Ответ:** Нет особых требований, давай постепенно все
- **Решение:** Постепенная миграция всех компонентов

### 26. Различия между проектами
- **Ответ:** Различия только в отображении изображения/ний, сегментов
- **Решение:** Общие viewer компоненты с передачей обработчиков извне

### 27. Общие компоненты
- **Ответ:** Посмотреть сам в проекте, вроде бы все одинаковое/похожее, кроме viewer
- **Решение:** Все компоненты общие, кроме viewer (который имеет общие части)

## Архитектурные решения

### Менеджер пакетов
- **Выбрано:** npm (workspaces)
- **Конфигурация:** `package.json` с полем `workspaces`
- **Удалено:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`

### Структура проекта
```
medml-front/
├── apps/                    # Приложения
│   ├── cytology/           # Приложение цитологии
│   └── ultrasound/         # Приложение УЗИ
├── domains/                 # Доменные модули
│   ├── auth/               # Домен авторизации
│   └── patients/           # Домен пациентов
├── lib/                     # Технические библиотеки
│   ├── store/              # Redux store и API
│   ├── ui/                 # UI компоненты
│   ├── viewers/            # Viewer компоненты
│   └── shared/             # Общие утилиты
└── configs/                 # Конфигурации
```

### Store и API структура

#### Общий baseApi (`lib/store/src/api/baseApi.ts`)
- Пустой `createApi` для использования через `injectEndpoints`
- `prepareHeaders` использует общий `authSlice`
- TagTypes: `['MedWorker', 'Patient', 'Cytology', 'Auth', 'Segments']`

#### Общий authSlice (`lib/store/src/slices/authSlice.ts`)
- Хранит `accessToken`
- Используется в `prepareHeaders` для добавления Authorization заголовка

#### Store на уровне приложения
- Каждое приложение создает свой store с нужными API
- Подключает общие slices (auth, loading, error)
- Подключает специфичные slices и API через `injectEndpoints`

### Environment Variables

**На уровне приложения** (`apps/cytology/.env.local`):
```env
NEXT_PUBLIC_CYTO_API_BASE_URL=http://109.73.201.164:8000/api/v3
NEXT_PUBLIC_CYTO_DZI_API_BASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

**На уровне приложения** (`apps/ultrasound/.env.local`):
```env
NEXT_PUBLIC_UZI_API_BASE_URL=http://194.226.121.145:8080/api/v1/
NEXT_PUBLIC_UZI_DZI_API_BASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3001
```

## План миграции

### Фаза 1: Фундамент ✅ ЗАВЕРШЕНА

**Что сделано:**

1. **authSlice** (`lib/store/src/slices/authSlice.ts`)
   - Slice для хранения accessToken
   - Action `setToken` для установки токена

2. **loadingSlice** (`lib/store/src/slices/loadingSlice.ts`)
   - Slice для управления состояниями загрузки
   - Actions: `addLoading`, `removeLoading`

3. **errorSlice** (`lib/store/src/slices/errorSlice.ts`)
   - Slice для управления ошибками
   - Actions: `addError`, `deleteError`, `clearAllErrors`

4. **headers.ts** (`lib/store/src/api/headers.ts`)
   - Функция `prepareHeaders` для добавления Authorization заголовка
   - Использует `authSlice` для получения токена

5. **loadingHandler** (`lib/store/src/middleware/loadingHandler.ts`)
   - Middleware для автоматического управления loading состояниями
   - Отслеживает pending/fulfilled/rejected actions RTK Query

6. **errorHandler** (`lib/store/src/middleware/errorHandler.ts`)
   - Middleware для автоматической обработки ошибок
   - Добавляет ошибки в store и показывает toast уведомления через `showToastFn`

7. **baseApi** (`lib/store/src/api/baseApi.ts`)
   - Обновлен с `prepareHeaders`
   - Готов для использования через `injectEndpoints`

8. **store.ts** (`lib/store/src/store.ts`)
   - Добавлены все новые slices (auth, loading, error)
   - Добавлены middleware для loading и error
   - Поддержка опций при создании store (`showToastFn`)

9. **providers.tsx** (`apps/cytology/app/providers.tsx`)
   - Обновлен для передачи `showToastFn` с использованием Ant Design `message.error`

**Структура:**
```
lib/store/src/
├── api/
│   ├── baseApi.ts          ✅ Обновлен с prepareHeaders
│   └── headers.ts          ✅ Новый файл
├── slices/
│   ├── authSlice.ts        ✅ Новый файл
│   ├── loadingSlice.ts     ✅ Новый файл
│   └── errorSlice.ts       ✅ Новый файл
├── middleware/
│   ├── loadingHandler.ts   ✅ Новый файл
│   ├── errorHandler.ts      ✅ Новый файл
│   └── index.ts            ✅ Новый файл
├── store.ts                ✅ Обновлен
├── hooks.ts                ✅ Уже был
└── index.ts                ✅ Обновлен с экспортами
```

### Фаза 2: Auth Domain ✅ ЗАВЕРШЕНА

**Что сделано:**

1. **NextAuth конфигурация**
   - Route handler: `apps/cytology/app/api/auth/[...nextauth]/route.ts`
   - Логика login/refresh: `domains/auth/src/api/loginUserInBackend.ts`, `refreshUserToken.ts`
   - Types: `domains/auth/src/api/Types.ts`

2. **Страницы login/register**
   - `domains/auth/src/login/page.tsx` - переписана с использованием Ant Design компонентов
   - `domains/auth/src/register/page.tsx` - переписана с использованием Ant Design компонентов
   - Templates и Types перенесены

3. **API endpoints через `injectEndpoints`**
   - `domains/auth/src/api/authApi.ts` - регистрация пользователя

4. **Middleware для защиты роутов**
   - `apps/cytology/middleware.ts` - защита роутов через NextAuth

5. **Интеграция с Redux**
   - `lib/store/src/components/SyncAuthWrapper.tsx` - синхронизация токена из NextAuth session в Redux store
   - Подключен в `apps/cytology/app/providers.tsx`

6. **Обновлен baseApi**
   - Использует `NEXT_PUBLIC_CYTO_API_BASE_URL` из env переменных

7. **Роуты в приложении**
   - `apps/cytology/app/(auth)/login/page.tsx`
   - `apps/cytology/app/(auth)/register/page.tsx`

8. **Утилиты**
   - `lib/shared/src/utils/index.ts` - добавлена функция `isHaveEmailErrors`

**Структура:**
```
domains/auth/src/
├── api/
│   ├── authApi.ts              ✅ API endpoints для регистрации
│   ├── loginUserInBackend.ts   ✅ Логика входа
│   ├── refreshUserToken.ts      ✅ Обновление токена
│   └── Types.ts                ✅ Типы для NextAuth
├── login/
│   ├── page.tsx                ✅ Страница входа (Ant Design)
│   ├── Templates.ts            ✅ Шаблоны текстов
│   └── Types.ts                ✅ Типы формы
├── register/
│   ├── page.tsx                ✅ Страница регистрации (Ant Design)
│   ├── Templates.tsx           ✅ Шаблоны текстов
│   └── Types.ts                 ✅ Типы формы
├── layout.tsx                   ✅ Layout для auth страниц
├── auth.css                     ✅ Стили для auth страниц
└── index.ts                     ✅ Экспорты модуля

apps/cytology/
├── app/
│   ├── api/auth/[...nextauth]/
│   │   └── route.ts            ✅ NextAuth route handler
│   └── (auth)/
│       ├── login/page.tsx      ✅ Роут /login
│       └── register/page.tsx   ✅ Роут /register
└── middleware.ts                ✅ Защита роутов
```

### Фаза 3: Patients Domain

**Что нужно сделать:**

1. Перенести страницу списка пациентов
   - `domains/patients/src/pages/PatientsPage.tsx`
   - Таблица, поиск, модалки

2. Перенести страницу профиля пациента
   - `domains/patients/src/pages/PatientProfilePage.tsx`

3. Перенести модалки
   - Создание/редактирование карт пациентов
   - Редактирование врача

4. Настроить API endpoints через `injectEndpoints`
   - `domains/patients/src/api/patientApi.ts`

### Фаза 4: Viewer компоненты

**Что нужно сделать:**

1. Создать общие viewer компоненты
   - `lib/viewers/src/components/OSDViewer/` - OpenSeadragon viewer
   - `lib/viewers/src/components/ImageViewer/` - Image viewer

2. Создать CytologyViewer
   - `apps/cytology/src/components/CytologyViewer/`
   - Использует общие OSDViewer/ImageViewer
   - Передает обработчики сегментов извне

3. Создать UziViewer
   - `apps/ultrasound/src/components/UziViewer/`
   - Использует общие OSDViewer/ImageViewer
   - Передает обработчики сегментов извне

### Фаза 5: Специфичные приложения

**Что нужно сделать:**

1. Перенести страницу `/cytology/[id]`
   - `apps/cytology/app/cytology/[id]/page.tsx`
   - Панель диагноза, редактирование

2. Перенести страницу `/uzi_view/[id]`
   - `apps/ultrasound/app/uzi/[id]/page.tsx`
   - Панель диагноза УЗИ, модалки

3. Перенести специфичные API и slices
   - `apps/cytology/src/api/cytologyApi.ts`
   - `apps/ultrasound/src/api/uziApi.ts`, `echoApi.ts`, `nodesSegmentsApi.ts`

### Фаза 6: Остальное

**Что нужно сделать:**

1. Остальные страницы
   - `/upload_photo`
   - `/send_patient_card`
   - `/diagnosis_is_complete/[id]`
   - `/diagnostic_is_running/[id]`
   - `/export` (только для cytology)

2. Общие компоненты
   - Header, Footer
   - Общие модалки

3. Upload API
   - Chunk upload endpoints

## Страницы для переноса

### Общие страницы (есть в обоих старых проектах)

1. ✅ `/login` - реализовано в `apps/cytology/app/(auth)/login/`
2. ✅ `/register` - реализовано в `apps/cytology/app/(auth)/register/`
3. ⏳ `/patients` - есть заглушка в `apps/cytology/app/patients/`
4. ⏳ `/patient_profile` - нужно создать
5. ⏳ `/chat` - нужно создать (низкий приоритет)
6. ⏳ `/send_patient_card` - нужно создать
7. ⏳ `/upload_photo` - нужно создать
8. ⏳ `/diagnosis_is_complete/[id]` - нужно создать
9. ⏳ `/diagnostic_is_running/[id]` - нужно создать
10. ⏳ `/export` - нужно создать (только для cytology)
11. ⏳ `/dialogs` - нужно создать (низкий приоритет)
12. ⏳ `/error` - нужно создать

### Специфичные страницы

**CYTO:**
- ⏳ `/cytology/[id]` - главная страница просмотра цитологии

**UZI:**
- ⏳ `/uzi_view/[id]` - главная страница просмотра УЗИ

## UI компоненты - решение

**НЕ переносить обертки над Ant Design!**

Вместо этого:
- Использовать Ant Design компоненты **напрямую**
- Настроить глобальные стили через `ConfigProvider` theme
- Расширить `lib/ui/src/theme/config.ts` для кастомизации

**Обертки которые НЕ переносим:**
- ❌ `Button` - использовать `Button` из Ant Design напрямую
- ❌ `TextField` - использовать `Form.Item` + `Input` напрямую
- ❌ `Text` - использовать `Typography.Text` из Ant Design
- ❌ `Spacer` - использовать `Space` или стили напрямую
- ❌ `ConditionalRender` - использовать тернарный оператор

## Текущий статус

### ✅ Завершено

- Фаза 1: Фундамент (store, slices, middleware)
- Фаза 2: Auth Domain (NextAuth, страницы login/register, middleware)
- Переход на npm workspaces
- Настройка базовой структуры

### ⏳ В процессе

- Фаза 3: Patients Domain (следующая)

### 📋 Планируется

- Фаза 3: Patients Domain
- Фаза 4: Viewer компоненты
- Фаза 5: Специфичные приложения
- Фаза 6: Остальное

## Заметки

- Все комментарии убраны из файлов
- `errorHandler` использует функцию из приложения вместо прямого импорта antd
- `providers.tsx` настроен для показа toast уведомлений через `showToastFn`
- Используется SCSS Modules для стилей
- Общие стили в `lib/ui/src/styles/`, стили приложений в `apps/*/src/styles/`

## Проблемы и решения

### Проблема: Смешанное использование npm/pnpm
**Решение:** Переход на npm workspaces, удаление pnpm файлов

### Проблема: Ошибка сборки webpack
**Решение:** После переустановки зависимостей через npm должна решиться

## Команды для работы

```bash
# Установка зависимостей
npm install

# Запуск приложения cytology
npm run dev:cytology

# Сборка приложения cytology
npm run build:cytology

# Очистка кэша Next.js
Remove-Item -Recurse -Force apps/cytology/.next
```

## Зависимости

### Основные зависимости (корневой package.json)
- `react: ^18.0.0`
- `react-dom: ^18.0.0`
- `antd: ^5.12.0`
- `@reduxjs/toolkit: ^2.0.0`
- `react-redux: ^9.0.0`
- `turbo: ^1.13.2`

### Зависимости для переноса (будут добавлены)
- `next-auth: ^4.24.11`
- `@annotorious/openseadragon: ^3.0.20`
- `@annotorious/react: ^3.0.20`
- `openseadragon: ^5.0.1`
- `dayjs: ^1.11.13`
- `jwt-decode: ^4.0.0`
- `lodash-es: ^4.17.21`
- `formidable: ^3.5.4`

