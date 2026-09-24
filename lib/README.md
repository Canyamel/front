# lib

Технические библиотеки платформы.

## Инфраструктура

| Пакет | Назначение |
|-------|------------|
| `@medml/shared` | Типы, утилиты, upload-хелперы |
| `@medml/store` | Redux store, RTK Query, auth slice |
| `@medml/ui` | Ant Design, Loading/Message/Modal |
| `@medml/config` | Общий webpack для Next (КТ/МРТ) |

## Визуализация

| Пакет | Контур | Стек |
|-------|--------|------|
| `@medml/viewers` | 2D | OpenSeadragon (+ слой разметки от приложения) |
| `@medml/ct-mri-viewer` | DICOM | Cornerstone3D |
| `@medml/cytology-upload` | Интеграция | Chunked upload, Vite plugin |

### Что внутри `@medml/viewers`

| Модуль | Назначение |
|--------|------------|
| `uzi-viewer` | Движок: OpenSeadragon, zoom/pan/rotate, кадры, тулбар |
| `study-viewer` | Рабочее место врача: инструменты, легенда, состояния, `AnnotatedStudyViewer` |
| `measurement` | Линейка и задание масштаба по эталонному отрезку |
| `brush` | Кисть-заполнение: растровая маска → полигон |

Конкретная библиотека разметки живёт в приложении и подключается через
контракт `ViewerAnnotationLayer`.

Пакеты `lib` не зависят от `domains/*` и `apps/*`.
