import { getApiBaseUrl } from "./apiBaseUrl";
import { prepareHeaders } from "./headers";
import { refreshAccessToken } from "./reauth";
import type { INodesSegments } from "@/features/uzi-view/types/nodesSegments";
import type { INode } from "@/features/uzi-view/types/nodes";
import type { ISegment } from "@/features/uzi-view/types/segments";
import type { IUzi, IUziPage } from "@/features/uzi-view/types/uzi";
import type IPatient from "@/features/uzi-view/types/patient";

type ThyroidPoint = { x: number; y: number; z?: number };
type ThyroidContour = { id?: number; points?: ThyroidPoint[] };
type ThyroidSegmentGroup = {
  id: number;
  is_ai?: boolean;
  details?: {
    nodule_2_3?: number;
    nodule_4?: number;
    nodule_5?: number;
    nodule_2?: number;
    nodule_3?: number;
  };
  data?: ThyroidContour[];
};

type ThyroidUziBundle = {
  image: {
    id: number;
    delay_time?: number;
    image_count?: number;
  };
  segmentation: ThyroidSegmentGroup[];
  info: {
    id: number;
    image_count?: number;
    diagnos_date?: string;
    details?: { projection_type?: "long" | "cross" };
    patient?: {
      id: number;
      last_name?: string;
      first_name?: string;
      fathers_name?: string;
      email?: string;
      personal_policy?: string;
      birth_date?: string;
      is_active?: boolean;
    };
    uzi_device_id?: number;
    patient_card_id?: number;
    has_nodules?: string;
  };
};

const bundleCache = new Map<string, ThyroidUziBundle>();

async function fetchJson(
  path: string,
  token: string | undefined,
  init?: RequestInit
): Promise<{ data?: unknown; error?: string; status: number }> {
  const url = `${getApiBaseUrl()}${path.replace(/^\//, "")}`;
  let accessToken = token;

  const doFetch = async (t: string | undefined) =>
    fetch(url, {
      ...init,
      headers: prepareHeaders(new Headers(init?.headers as HeadersInit), {
        getState: () => ({ auth: { accessToken: t } }),
      }),
    });

  let res = await doFetch(accessToken);
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      accessToken = refreshed;
      res = await doFetch(accessToken);
    }
  }

  if (!res.ok) {
    return { error: await res.text(), status: res.status };
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return { error: "Ожидался JSON", status: res.status };
  }

  return { data: await res.json(), status: res.status };
}

export async function loadThyroidUziBundle(
  uziId: string,
  token: string | undefined
): Promise<ThyroidUziBundle> {
  const cached = bundleCache.get(uziId);
  if (cached) return cached;

  const res = await fetchJson(`uzi/${uziId}/?format=json`, token);
  if (res.error || !res.data) {
    throw new Error(res.error ?? `Не удалось загрузить УЗИ ${uziId}`);
  }

  const bundle = res.data as ThyroidUziBundle;
  bundleCache.set(uziId, bundle);
  return bundle;
}

export function clearThyroidUziBundle(uziId?: string): void {
  if (uziId) {
    bundleCache.delete(uziId);
    return;
  }
  bundleCache.clear();
}

function patientFullName(p: ThyroidUziBundle["info"]["patient"]): string {
  if (!p) return "—";
  return [p.last_name, p.first_name, p.fathers_name]
    .filter((x) => typeof x === "string" && x.trim())
    .join(" ")
    .trim();
}

function mapStatus(bundle: ThyroidUziBundle): IUzi["status"] {
  const delay = bundle.image?.delay_time;
  if (delay != null && delay < 0) return "pending";
  return "completed";
}

export function thyroidBundleToUzi(bundle: ThyroidUziBundle): IUzi {
  const projection = bundle.info?.details?.projection_type ?? "cross";
  const patientId = bundle.info?.patient?.id;
  return {
    id: String(bundle.info.id),
    projection,
    checked: false,
    external_id: patientId != null ? String(patientId) : "",
    author_id: "",
    device_id: bundle.info.uzi_device_id ?? 0,
    status: mapStatus(bundle),
    create_at: bundle.info.diagnos_date ?? new Date().toISOString(),
  };
}

export function thyroidBundleToPages(bundle: ThyroidUziBundle, uziId: string): IUziPage[] {
  const count = Math.max(
    1,
    bundle.info?.image_count ?? bundle.image?.image_count ?? 1
  );
  const originalImageId = String(bundle.image?.id ?? 1);
  return Array.from({ length: count }, (_, i) => ({
    id: originalImageId,
    uzi_id: uziId,
    page: i + 1,
  }));
}

export function thyroidBundleToPatient(bundle: ThyroidUziBundle): IPatient {
  const p = bundle.info?.patient;
  return {
    id: String(p?.id ?? ""),
    fullname: patientFullName(p),
    email: p?.email ?? "",
    policy: p?.personal_policy ?? "",
    active: Boolean(p?.is_active),
    malignancy: bundle.info?.has_nodules === "T",
    birth_date: p?.birth_date ?? "",
    last_uzi_date: bundle.info?.diagnos_date ?? "",
  };
}

function tiradsFromDetails(details: ThyroidSegmentGroup["details"]) {
  return {
    tirads_23: Number(details?.nodule_2_3 ?? details?.nodule_2 ?? 0),
    tirads_4: Number(details?.nodule_4 ?? 0),
    tirads_5: Number(details?.nodule_5 ?? 0),
  };
}

export function thyroidBundleToNodesSegments(
  bundle: ThyroidUziBundle,
  uziId: string
): INodesSegments {
  const originalImageId = String(bundle.image?.id ?? "");
  const nodes: INode[] = [];
  const segments: ISegment[] = [];

  for (const group of bundle.segmentation ?? []) {
    const tirads = tiradsFromDetails(group.details);
    nodes.push({
      id: String(group.id),
      uzi_id: uziId,
      ai: Boolean(group.is_ai),
      validation: "approved",
      description: "",
      ...tirads,
    });

    for (const contour of group.data ?? []) {
      if (!contour.id) continue;
      segments.push({
        id: String(contour.id),
        node_id: String(group.id),
        ai: Boolean(group.is_ai),
        contor: (contour.points ?? []).map((p) => ({ x: p.x, y: p.y })),
        image_id: originalImageId,
        ...tirads,
      });
    }
  }

  return { nodes, segments };
}

export function getThyroidOriginalImageId(bundle: ThyroidUziBundle): string {
  return String(bundle.image?.id ?? "");
}
