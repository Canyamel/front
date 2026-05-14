'use client';

import * as React from 'react';
import { Layout } from 'antd';

import { PatientListPanel, type PatientListPanelProps } from '../../components/PatientListPanel/PatientListPanel';
import type { PatientListSort, PatientListSortOrder, PatientRow } from '../../types';

export type PatientsPageProps = {
  title?: React.ReactNode;
  className?: string;

  rows?: PatientRow[];
  total?: number;
  isLoading?: boolean;
  emptyText?: React.ReactNode;

  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;

  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  sort?: PatientListSort;
  onSortChange?: (sort: PatientListSort) => void;

  onAddPatient?: () => void;
  onOpenPatientCard?: (id: PatientRow['id']) => void;
  onDeletePatient?: (id: PatientRow['id']) => void;
};

export default function PatientsPage({
  title = 'Мои пациенты',
  className,
  rows = [],
  total,
  isLoading,
  emptyText,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortChange,
  onAddPatient,
  onOpenPatientCard,
  onDeletePatient,
}: PatientsPageProps) {
  const [internalSearch, setInternalSearch] = React.useState('');
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(10);
  const [internalSort, setInternalSort] = React.useState<PatientListSort>({
    key: null,
    order: null as PatientListSortOrder,
  });

  const resolvedSearch = searchValue ?? internalSearch;
  const resolvedPage = page ?? internalPage;
  const resolvedPageSize = pageSize ?? internalPageSize;
  const resolvedSort = sort ?? internalSort;

  const panelProps: PatientListPanelProps = {
    className,
    title,
    rows,
    total: total ?? rows.length,
    isLoading,
    emptyText,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    searchValue: resolvedSearch,
    onSearchChange: onSearchChange ?? setInternalSearch,
    onSearchSubmit: onSearchSubmit ?? (onSearchChange ?? setInternalSearch),
    onPageChange: onPageChange ?? setInternalPage,
    onPageSizeChange: onPageSizeChange ?? setInternalPageSize,
    sort: resolvedSort,
    onSortChange: onSortChange ?? setInternalSort,
    onAddPatient,
    onOpenPatientCard,
    onDeletePatient,
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Layout.Content style={{ padding: 24, maxWidth: 1120, margin: '0 auto', width: '100%' }}>
        <PatientListPanel {...panelProps} />
      </Layout.Content>
    </Layout>
  );
}

