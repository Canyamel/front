# medml-front

Монорепозиторий для медицинских приложений (УЗИ, КТ, МРТ, Цитология)

## Структура проекта

```
medml-front/
├── apps/                    # Приложения
│   ├── ultrasound/         # Приложение УЗИ
│   ├── ct/                 # Приложение КТ
│   ├── mri/                # Приложение МРТ
│   └── cytology/           # Приложение Цитология
│
├── domain/                # Доменные модули
│   ├── patients/          # Домен "Пациенты"
│   └── auth/              # Домен "Авторизация"
│
├── lib/                   # Технические библиотеки
│   ├── shared/            # Сквозные утилиты, типы, константы
│   ├── ui/                # UI компоненты (Ant Design обёртки)
│   └── viewers/           # Интерфейсы viewer'ов
│
├── configs/               # Конфигурационные файлы
└── build/                 # Инфраструктура (Docker и т.д.)
```

## Установка

```bash
npm install
```

## Разработка

Запуск отдельного приложения в режиме разработки:

```bash
npm run dev:ultrasound
npm run dev:ct
npm run dev:mri
npm run dev:cytology
```

## Сборка

Сборка отдельного приложения:

```bash
npm run build:ultrasound
npm run build:ct
npm run build:mri
npm run build:cytology
```

## Workspaces

Проект использует npm workspaces для управления зависимостями между пакетами.

Все модули доступны через алиасы:

**Домены:**
- `@medml/patients`
- `@medml/auth`

**Технические пакеты:**
- `@medml/shared`
- `@medml/ui`
- `@medml/viewers`

## Turborepo

Для управления задачами используется Turborepo с кэшированием сборок.


