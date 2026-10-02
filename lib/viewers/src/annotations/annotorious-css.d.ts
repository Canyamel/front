/**
 * Стили Annotorious подключаются как side-effect импорт. TypeScript 6
 * (`noUncheckedSideEffectImports`) требует, чтобы такой модуль был известен,
 * а типов vite/client в этом пакете нет.
 */
declare module '@annotorious/openseadragon/annotorious-openseadragon.css'
