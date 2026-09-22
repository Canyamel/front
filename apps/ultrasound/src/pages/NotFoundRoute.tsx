import { NotFoundPage } from '@medml/layout'

/** Страница 404 — для неизвестных адресов (маршрут `*`). */
export default function NotFoundRoute() {
	return <NotFoundPage homePath='/patients' />
}
