"use client";

import * as React from "react";
import { message } from "antd";
import { useRouter } from "next/navigation";

import { PatientsPage, type PatientListSort } from "@medml/patient_list";

import { useGetMedWorkerPatientsQuery } from "@/lib/patientsApi";
import { useDoctorId } from "@/lib/useDoctorId";

export default function PatientsRoutePage() {
  const router = useRouter();
  const { doctorId, status } = useDoctorId();

  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<PatientListSort>({ key: null, order: null });

  const { data, isFetching } = useGetMedWorkerPatientsQuery(
    {
      doctorId,
      search: search.trim() || undefined,
      sortKey: sort.key,
      sortOrder: sort.order,
    },
    { skip: !doctorId || status !== "authenticated" }
  );

  return (
    <PatientsPage
      title={data?.medWorkerName ? `${data.medWorkerName}: пациенты` : "Мои пациенты"}
      rows={data?.rows ?? []}
      total={data?.total ?? 0}
      isLoading={(status === "authenticated" && !doctorId) || isFetching}
      searchValue={search}
      onSearchChange={setSearch}
      onSearchSubmit={setSearch}
      sort={sort}
      onSortChange={setSort}
      onAddPatient={() => message.info("Добавление карты пациента будет подключено отдельно.")}
      onOpenPatientCard={(id) => router.push(`/patient_profile?id=${encodeURIComponent(String(id))}`)}
      onDeletePatient={(id) =>
        message.info(`Удаление карты ${String(id)} оставлено как placeholder для parity.`)
      }
    />
  );
}
