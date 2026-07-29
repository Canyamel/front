import type { ThemeConfig } from 'antd'

export const baseThemeConfig: ThemeConfig = {
	token: {
		colorPrimary: '#0055BB',
		colorPrimaryHover: '#3867df',
		colorPrimaryActive: '#0236a5',
		colorLink: '#0055BB',
		colorLinkHover: '#3867df',
		colorLinkActive: '#0236a5',

		colorError: '#FF6B35',
		colorErrorHover: '#ff8c5a',
		colorErrorActive: '#e55a2a',

		borderRadius: 8,
		controlHeight: 36,
		controlHeightSM: 30,
		controlHeightLG: 40,
		fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
	},
	components: {
		Button: {
			borderRadius: 999,
			borderRadiusLG: 999,
			borderRadiusSM: 999,
			borderRadiusXS: 999,

			colorPrimary: '#0F172A',
			colorPrimaryHover: '#475569',
			colorPrimaryActive: '#0F172A',

			colorLink: '#00bb06',
			colorLinkHover: '#df3838',
			colorLinkActive: '#a50202',
			colorTextDisabled: '#8F8F8F',
			fontSize: 14,
			fontSizeLG: 16,
			fontSizeSM: 12,
			padding: 8,
			paddingLG: 12,
			paddingSM: 4,
		},
		Card: {
			borderRadiusLG: 12,
			borderRadius: 12,
			borderRadiusSM: 10,
			colorBorder: '#E5E7EB',
			colorBorderSecondary: '#E5E7EB',
			paddingLG: 20,
			paddingMD: 20,
			paddingSM: 20,
		},
		Input: {
			borderRadius: 8,
			borderRadiusSM: 7,
			borderRadiusLG: 10,
			paddingInline: 12,
			paddingBlock: 6,
			paddingInlineLG: 14,
			paddingBlockLG: 8,
			paddingInlineSM: 10,
			paddingBlockSM: 4,
		},
		Table: {
			borderRadius: 8,
		},
		Modal: {
			borderRadius: 8,
		},
		Typography: {
			colorTextSecondary: '#9CA3AF',
			titleMarginBottom: 0,
		},
	},
}
