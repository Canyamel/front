import type { CSSProperties } from 'react'
import { radius, semantic, shadow, spacing } from '@medml/ui'

/**
 * Повторяющиеся визуальные паттерны страниц УЗИ.
 *
 * Значения берутся из токенов `@medml/ui` — раньше здесь жил захардкоженный
 * `#194964`, который был четвёртым по счёту «основным» цветом в проекте и не
 * совпадал ни с макетом, ни с темой antd.
 *
 * Если паттерн выражается через тему antd — предпочитайте тему: эти хелперы
 * нужны только там, где antd не даёт нужного токена напрямую.
 */

type TokenLike = {
	colorBgContainer?: string
	colorBgLayout: string
}

/** Карточка-поверхность: белый фон, крупный радиус, мягкая тень. */
export const getSurfaceCardStyle = (token: TokenLike): CSSProperties => ({
	background: token.colorBgContainer || semantic.bgContainer,
	borderRadius: radius.xl,
	boxShadow: shadow.card,
	border: `1px solid ${semantic.border}`,
})

/** Фон страницы под карточками. */
export const getPageSurfaceStyle = (token: TokenLike): CSSProperties => ({
	backgroundColor: token.colorBgLayout || semantic.bgLayout,
	padding: spacing.lg,
	borderRadius: radius.xl,
})

/**
 * Вторичная кнопка-контур. В макете это `border: 1px solid slate-300`
 * с текстом navy и pill-скруглением.
 */
export const getAccentOutlineButtonStyle = (): CSSProperties => ({
	color: semantic.textPrimary,
	borderColor: semantic.borderStrong,
	borderRadius: radius.full,
})
