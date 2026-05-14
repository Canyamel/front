import type { ThemeConfig } from 'antd';

export const baseThemeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    controlHeight: 36,
    controlHeightSM: 30,
    controlHeightLG: 40,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 7,
      borderRadiusXS: 6,
      colorTextDisabled: '#8F8F8F',
      colorPrimary: '#0055BB',
      colorPrimaryBgHover: '#00377A'
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
};
