import * as React from "react";
import { message } from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import {
  PatientCreateModal,
  stripPolicyDigits,
  type PatientCreateValuesUzi,
} from "@medml/patient_create";
import { PatientsPage } from "@medml/patient_list";
import type { PatientListSort } from "@medml/patient_list";

import {
  useCreateUziPatientWithCardMutation,
  useGetDoctorPatientsQuery,
} from "@/lib/patientsApi";
import { useDoctorId } from "@/lib/useDoctorId";

export default function PatientsRoute() {
  const navigate = useNavigate();
  const { doctorId, status } = useDoctorId();
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createPatient, { isLoading: isCreatingPatient }] =
    useCreateUziPatientWithCardMutation();

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [sort, setSort] = React.useState<PatientListSort>({ key: null, order: null });

  const { data, isFetching } = useGetDoctorPatientsQuery(
    {
      doctorId,
      search: search.trim() || undefined,
      page,
      pageSize,
      sortKey: sort.key,
      sortOrder: sort.order,
    },
    { skip: !doctorId || status !== "authenticated" }
  );

  const listLoading =
    (status === "authenticated" && !doctorId) ||
    (status === "authenticated" && isFetching);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const handleCreateFinish = async (values: PatientCreateValuesUzi) => {
    if (!doctorId) {
      message.warning("Не удалось определить врача");
      return;
    }
    const birth_date = dayjs(values.birthDate).format("YYYY-MM-DD");
    const policy = stripPolicyDigits(values.policy);
    const created = await createPatient({
      doctorId,
      surname: values.surname.trim(),
      name: values.name.trim(),
      patronymic: values.patronymic.trim(),
      email: values.email.trim(),
      policy,
      active: values.active,
      malignancy: values.malignancy,
      birth_date,
      diagnosis: values.diagnosis.trim(),
    }).unwrap();
    if (!created.id) {
      message.error("Сервер не вернул идентификатор пациента");
      return;
    }
    message.success("Пациент создан");
    setCreateModalOpen(false);
  };

  return (
    <>
      <PatientsPage
        title="Мои пациенты"
        rows={rows}
        total={total}
        isLoading={listLoading}
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={setSearch}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        sort={sort}
        onSortChange={setSort}
        onAddPatient={() => setCreateModalOpen(true)}
        onOpenPatientCard={(id) => navigate(`/patient_profile?id=${id}`)}
        onDeletePatient={(id) => {
          console.log("Delete patient", id);
        }}
      />
      <PatientCreateModal
        open={createModalOpen}
        variant="uzi"
        onCancel={() => setCreateModalOpen(false)}
        onFinish={(vals) => void handleCreateFinish(vals as PatientCreateValuesUzi)}
        confirmLoading={isCreatingPatient}
      />
    </>
  );
}
