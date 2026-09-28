# domains

Доменные (предметные) пакеты платформы. Содержат сценарии, общие для нескольких приложений, **без** логики DICOM- или тайлового просмотра.

| Пакет | Сценарий |
|-------|----------|
| `@medml/auth` | Вход, refresh, обработка 401 |
| `@medml/layout` | Header, оболочка страниц |
| `@medml/patients` | Типы и API пациентов |
| `@medml/patient_list` | Таблица пациентов |
| `@medml/patient_create` | Создание карты |
| `@medml/patient_view` | Профиль пациента |
| `@medml/study_view` | Страница исследования: режим фокуса, раскладка со снимком |
| `@medml/cytology_upload` | Загрузка слайда (UI) |

Зависимости: только `@medml/shared`, `@medml/ui`, `@medml/store` (и peer `react`).

`@medml/study_view` держит страницу исследования, но **не** зависит от
`@medml/viewers`: сам просмотровщик приходит слотом из приложения.

Правила: [docs/architecture/dependency-rules.md](../docs/architecture/dependency-rules.md)
