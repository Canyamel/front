/**
 * Обходной entry для Next.js (КТ, МРТ): провайдер с Next-шапкой.
 * Vite-приложения импортируют только `@medml/ui`, без этого файла — иначе в бандл попадёт `next`.
 */
export {
  RootProviderRedux,
  type RootProviderReduxProps,
} from "./providers/RootProviderRedux/RootProviderRedux";
