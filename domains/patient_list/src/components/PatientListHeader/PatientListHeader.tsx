'use client';

import * as React from 'react';
import { Button, Input, Space, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';

export type PatientListHeaderProps = {
  title?: React.ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  onAddClick?: () => void;
};

export function PatientListHeader({
  title = 'Мои пациенты',
  searchPlaceholder = 'Поиск по имени / номеру полиса',
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onAddClick,
}: PatientListHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Space size={10} align="center">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          aria-label="Добавить пациента"
          onClick={onAddClick}
        />
      </Space>

      <Input
        value={searchValue}
        onChange={(e) => onSearchChange?.(e.target.value)}
        onPressEnter={() => onSearchSubmit?.(searchValue ?? '')}
        placeholder={searchPlaceholder}
        prefix={<SearchOutlined />}
        style={{ maxWidth: 360 }}
        allowClear
      />
    </div>
  );
}

