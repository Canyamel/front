export type PatientRow = {
  id: string | number;

  fullName: string;
  avatarText?: string;

  policyNumber?: string;
  email?: string;

  visitDate?: string;
  diagnosisLabel?: string;

  statusLabel?: string;
  statusTone?: 'success' | 'warning' | 'default';
};

export type PatientListSortOrder = 'ascend' | 'descend' | null;

export type PatientListSort = {
  key: keyof PatientRow | null;
  order: PatientListSortOrder;
};

