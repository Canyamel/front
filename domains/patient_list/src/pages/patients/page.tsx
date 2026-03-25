'use client';

import * as React from 'react';
import { Layout } from 'antd';

import { PatientListPanel, type PatientListPanelProps } from '../../components/PatientListPanel/PatientListPanel';
import { PatientListUiProvider, usePatientListUi } from '../../contexts/PatientListUiContext';
import type { PatientRow } from '../../types';

const mockRows: PatientRow[] = [
  {
    id: 1,
    fullName: 'Алексеев Алексей Алексеевич',
    avatarText: 'АА',
    policyNumber: '1111111111111111',
    email: '654123@mail.ru',
    visitDate: '04.02.2026',
    diagnosisLabel: 'не обслед.',
    statusLabel: 'Активен',
    statusTone: 'success',
  },
];

function PatientsPageInner() {
  const { search, setSearch, page, setPage, pageSize, setPageSize, sort, setSort } =
    usePatientListUi();

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mockRows;
    return mockRows.filter((r) => {
      const hay = `${r.fullName} ${r.policyNumber ?? ''} ${r.email ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search]);

  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [page, pageSize, filtered]);

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, setPage]);

  const panelProps: PatientListPanelProps = {
    title: 'Мои пациенты',
    rows: paged,
    total: filtered.length,
    page,
    pageSize,
    searchValue: search,
    onSearchChange: setSearch,
    onSearchSubmit: (v) => setSearch(v),
    onAddPatient: () => {},
    onOpenPatientCard: () => {},
    onPageChange: (p) => setPage(p),
    onPageSizeChange: (s) => setPageSize(s),
    sort,
    onSortChange: (next) => setSort(next),
  };

  return <PatientListPanel {...panelProps} />;
}

export default function PatientsPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Layout.Content style={{ padding: 24, maxWidth: 1120, margin: '0 auto', width: '100%' }}>
        <PatientListUiProvider initialPageSize={10}>
          <PatientsPageInner />
        </PatientListUiProvider>
      </Layout.Content>
    </Layout>
  );
}

