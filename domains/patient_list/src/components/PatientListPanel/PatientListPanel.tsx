'use client';

import * as React from 'react';
import { EllipsisOutlined } from '@ant-design/icons';
import { Card, Dropdown, Space, Typography, type MenuProps, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { TableCurrentDataSource } from 'antd/es/table/interface';

import { PatientListHeader } from '../PatientListHeader';
import { DiagnosisTag, StatusTag } from '../tags';
import type { PatientListSort, PatientListSortOrder, PatientRow } from '../../types';

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
  onDeletePatient?: (id: PatientRow['id']) => void;

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
  onDeletePatient,
  emptyText = 'Пациенты не найдены',
}: PatientListPanelProps) {
  const diagnosisFilters = React.useMemo(
    () =>
      Array.from(
        new Map(
          rows
            .filter((r) => r.diagnosisLabel)
            .map((r) => [r.diagnosisLabel, { text: r.diagnosisLabel as string, value: r.diagnosisLabel as string }])
        ).values()
      ),
    [rows]
  );

  const statusFilters = React.useMemo(
    () =>
      Array.from(
        new Map(
          rows
            .filter((r) => r.statusLabel)
            .map((r) => [r.statusLabel, { text: r.statusLabel as string, value: r.statusLabel as string }])
        ).values()
      ),
    [rows]
  );

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
            {/* <Avatar size={28}>{row.avatarText ?? getAvatarText(row.fullName, ' ')}</Avatar> */}
            <div style={{ lineHeight: 1.2 }}>
              <Typography.Link strong onClick={() => onOpenPatientCard?.(row.id)}>
                {row.fullName}
              </Typography.Link>
            </div>
          </Space>
        ),
      },
      {
        title: 'Полис пациента',
        dataIndex: 'policyNumber',
        key: 'policyNumber',
        render: (v: string | undefined) => <Typography.Text>{v ?? '—'}</Typography.Text>,
      },
      {
        title: 'Эл. почта',
        dataIndex: 'email',
        key: 'email',
        render: (v: string | undefined) => <Typography.Text>{v ?? '—'}</Typography.Text>,
      },
      {
        title: 'Дата рождения',
        dataIndex: 'birthDate',
        key: 'birthDate',
        sorter: true,
        sortOrder: sort?.key === 'birthDate' ? toTableSortOrder(sort.order) : undefined,
        render: (v: string | undefined) => <Typography.Text>{v ?? '—'}</Typography.Text>,
      },
      {
        title: 'Диагноз',
        dataIndex: 'diagnosisLabel',
        key: 'diagnosisLabel',
        filters: diagnosisFilters,
        onFilter: (value, record) => record.diagnosisLabel === value,
        render: (v: string | undefined) => (v ? <DiagnosisTag>{v}</DiagnosisTag> : '—'),
      },
      {
        title: 'Статус',
        dataIndex: 'statusLabel',
        key: 'statusLabel',
        filters: statusFilters,
        onFilter: (value, record) => record.statusLabel === value,
        render: (_v: string | undefined, row) =>
          row.statusLabel ? <StatusTag tone={row.statusTone}>{row.statusLabel}</StatusTag> : '—',
      },
      {
        title: '',
        key: 'actions',
        align: 'right',
        render: (_v, row) => {
          const items: MenuProps['items'] = [
            {
              key: 'open',
              label: 'Открыть',
              onClick: () => onOpenPatientCard?.(row.id),
            },
            {
              key: 'delete',
              label: 'Удалить',
              onClick: () => onDeletePatient?.(row.id),
            },
          ];

          return (
            <Dropdown menu={{ items }} trigger={['click']}>
              <Typography.Link>
                <EllipsisOutlined />
              </Typography.Link>
            </Dropdown>
          );
        },
      },
    ],
    [diagnosisFilters, onDeletePatient, onOpenPatientCard, sort?.key, sort?.order, statusFilters]
  );

  const handleTableChange = React.useCallback(
    (
      pagination: TablePaginationConfig,
      _filters: unknown,
      sorter: unknown,
      extra: TableCurrentDataSource<PatientRow>
    ) => {
      if (extra.action === 'paginate') {
        if (pagination.current != null) {
          onPageChange?.(pagination.current);
        }
        if (pagination.pageSize != null && pagination.pageSize !== pageSize) {
          onPageSizeChange?.(pagination.pageSize);
        }
      }
      if (extra.action === 'sort' && onSortChange) {
        const s = (Array.isArray(sorter) ? sorter[0] : sorter) as {
          field?: string;
          order?: PatientListSortOrder;
        };
        const nextKey = (s.field ?? null) as PatientListSort['key'];
        const nextOrder = (s.order ?? null) as PatientListSortOrder;
        onSortChange({ key: nextKey, order: nextOrder });
      }
    },
    [onPageChange, onPageSizeChange, onSortChange, pageSize]
  );

  const tablePagination = React.useMemo(
    () => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      pageSizeOptions: [10, 20, 50],
      showTotal: (totalCount: number, range: [number, number]) =>
        totalCount <= 0
          ? '0 из 0 пациентов'
          : `${range[0]}–${range[1]} из ${totalCount} пациентов`,
    }),
    [page, pageSize, total]
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
          pagination={tablePagination}
          onChange={handleTableChange}
          locale={{ emptyText }}
          showSorterTooltip={{ title: 'Сортировать' }}
          size="middle"
        />
      </Space>
    </Card>
  );
}

