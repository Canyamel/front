'use client';

import * as React from 'react';
import { Avatar, Button, Card, Space, Table, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

import { PatientListHeader } from '../PatientListHeader';
import { PatientTableFooter } from '../PatientTableFooter';
import { DiagnosisTag, StatusTag } from '../tags';
import type { PatientListSort, PatientListSortOrder, PatientRow } from '../../types';
import { getAvatarText } from '../../utils';

export type PatientListPanelProps = {
  className?: string;
  title?: React.ReactNode;

  rows: PatientRow[];
  total: number;
  page: number;
  pageSize: number;

  isLoading?: boolean;
  searchValue?: string;

  sort?: PatientListSort;

  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  onAddPatient?: () => void;

  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  onSortChange?: (sort: PatientListSort) => void;

  onOpenPatientCard?: (id: PatientRow['id']) => void;

  emptyText?: React.ReactNode;
};

function toTableSortOrder(order: PatientListSortOrder | undefined): 'ascend' | 'descend' | undefined {
  if (order === 'ascend' || order === 'descend') return order;
  return undefined;
}

export function PatientListPanel({
  className,
  title,
  rows,
  total,
  page,
  pageSize,
  isLoading,
  searchValue,
  sort,
  onSearchChange,
  onSearchSubmit,
  onAddPatient,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onOpenPatientCard,
  emptyText = 'Пациенты не найдены',
}: PatientListPanelProps) {
  const columns = React.useMemo<ColumnsType<PatientRow>>(
    () => [
      {
        title: 'Пациент',
        dataIndex: 'fullName',
        key: 'fullName',
        sorter: true,
        sortOrder: sort?.key === 'fullName' ? toTableSortOrder(sort.order) : undefined,
        render: (_value, row) => (
          <Space size={10}>
            <Avatar size={28}>{row.avatarText ?? getAvatarText(row.fullName, ' ')}</Avatar>
            <div style={{ lineHeight: 1.2 }}>
              <Typography.Text strong>{row.fullName}</Typography.Text>
            </div>
          </Space>
        ),
      },
      {
        title: 'Полис пациента',
        dataIndex: 'policyNumber',
        key: 'policyNumber',
        sorter: true,
        sortOrder: sort?.key === 'policyNumber' ? toTableSortOrder(sort.order) : undefined,
        render: (v: string | undefined) => <Typography.Text>{v ?? '—'}</Typography.Text>,
      },
      {
        title: 'Эл. почта',
        dataIndex: 'email',
        key: 'email',
        sorter: true,
        sortOrder: sort?.key === 'email' ? toTableSortOrder(sort.order) : undefined,
        render: (v: string | undefined) => <Typography.Text>{v ?? '—'}</Typography.Text>,
      },
      {
        title: 'Дата приема',
        dataIndex: 'visitDate',
        key: 'visitDate',
        sorter: true,
        sortOrder: sort?.key === 'visitDate' ? toTableSortOrder(sort.order) : undefined,
        render: (v: string | undefined) => <Typography.Text>{v ?? '—'}</Typography.Text>,
      },
      {
        title: 'Диагноз',
        dataIndex: 'diagnosisLabel',
        key: 'diagnosisLabel',
        sorter: true,
        sortOrder: sort?.key === 'diagnosisLabel' ? toTableSortOrder(sort.order) : undefined,
        render: (v: string | undefined) => (v ? <DiagnosisTag>{v}</DiagnosisTag> : '—'),
      },
      {
        title: 'Статус',
        dataIndex: 'statusLabel',
        key: 'statusLabel',
        sorter: true,
        sortOrder: sort?.key === 'statusLabel' ? toTableSortOrder(sort.order) : undefined,
        render: (_v: string | undefined, row) =>
          row.statusLabel ? <StatusTag tone={row.statusTone}>{row.statusLabel}</StatusTag> : '—',
      },
      {
        title: '',
        key: 'actions',
        align: 'right',
        render: (_v, row) => (
          <Button type="default" onClick={() => onOpenPatientCard?.(row.id)}>
            Карта пациента
          </Button>
        ),
      },
    ],
    [onOpenPatientCard, sort?.key, sort?.order]
  );

  const handleTableChange = React.useCallback(
    (_pagination: TablePaginationConfig, _filters: unknown, sorter: unknown) => {
      if (!onSortChange) return;

      const s = sorter as { field?: string; order?: PatientListSortOrder };
      const nextKey = (s.field ?? null) as PatientListSort['key'];
      const nextOrder = (s.order ?? null) as PatientListSortOrder;
      onSortChange({ key: nextKey, order: nextOrder });
    },
    [onSortChange]
  );

  return (
    <Card className={className} style={{ borderRadius: 12 }}>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <PatientListHeader
          title={title}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
          onAddClick={onAddPatient}
        />

        <Table<PatientRow>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          pagination={false}
          onChange={handleTableChange}
          locale={{ emptyText }}
          size="middle"
        />

        <PatientTableFooter
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </Space>
    </Card>
  );
}

