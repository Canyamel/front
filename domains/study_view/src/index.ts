// Рабочее место врача на странице исследования: режим фокуса и раскладка.
//
// Пакет доменный и по правилам зависимостей не знает про `@medml/viewers`:
// сам просмотровщик приходит слотом из приложения.

export { useStudyFocusMode } from './useStudyFocusMode'
export type { StudyFocusMode } from './useStudyFocusMode'

export * from './components'
