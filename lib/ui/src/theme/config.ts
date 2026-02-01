import type { ThemeConfig } from 'antd';

export const baseThemeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      borderRadius: 22,
      borderRadiusLG: 22,
      borderRadiusSM: 22,
      borderRadiusXS: 22,
      colorBgContainerDisabled: '#E5E7EB',
      colorTextDisabled: '#8F8F8F',
      colorPrimary: '#0055BB',
      colorPrimaryBgHover: '#00377A'
    },
    Card: {
      borderRadiusLG: 22,
      borderRadius: 22,
      borderRadiusSM: 22,
      colorBorder: '#E5E7EB',
      colorBorderSecondary: '#E5E7EB',
      paddingLG: 20,
      paddingMD: 20,
      paddingSM: 20,
    },
    Input: {
      borderRadius: 22,
      borderRadiusSM: 22,
      borderRadiusLG: 22,
      paddingInline: 16,
      paddingBlock: 16,
      paddingInlineLG: 16,
      paddingBlockLG: 16,
      paddingInlineSM: 16,
      paddingBlockSM: 16,
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
};
