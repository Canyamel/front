"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CtViewerConfig } from "../types";
import { Switch, message } from "antd";
import { CtViewerToolbar } from "./CtViewerToolbar";
import { CtLayoutSelector, type CtLayoutId } from "./CtLayoutSelector";
import { StudyListSidebar } from "./StudyListSidebar";
import {
  RenderingEngine,
  Enums,
  init as coreInit,
  volumeLoader,
  setVolumesForViewports,
  imageLoader,
  getRenderingEngine,
  cache,
  metaData,
} from "@cornerstonejs/core";
import * as polySeg from "@cornerstonejs/polymorphic-segmentation";
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";
import type { PublicViewportInput } from "@cornerstonejs/core/types";
import * as cornerstoneTools from "@cornerstonejs/tools";

const {
  init: toolsInit,
  addTool,
  StackScrollTool,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  ToolGroupManager,
  CrosshairsTool,
  LengthTool,
  EllipticalROITool,
  RectangleROITool,
  Enums: ToolsEnums,
} = cornerstoneTools;

const { MouseBindings } = ToolsEnums;

const VIEWPORT_SIZE = 640;
const RENDERING_ENGINE_ID = "pet-ct-viewer";
const volumeIdForSeries = (seriesId: string) => `ct-volume-${seriesId}`;
const toolGroupIdForSeries = (seriesId: string) => `ct-toolgroup-${seriesId}`;

const VIEWPORT_IDS = {
  CT_AXIAL: "CT_AXIAL",
  CT_SAGITTAL: "CT_SAGITTAL",
  CT_CORONAL: "CT_CORONAL",
} as const;

const ALL_VIEWPORT_IDS = [
  VIEWPORT_IDS.CT_AXIAL,
  VIEWPORT_IDS.CT_SAGITTAL,
  VIEWPORT_IDS.CT_CORONAL,
] as const;

/** Соответствие data-viewport атрибута и viewportId */
const DATA_VIEWPORT_TO_ID: Record<string, (typeof ALL_VIEWPORT_IDS)[number]> = {
  axial: VIEWPORT_IDS.CT_AXIAL,
  sagittal: VIEWPORT_IDS.CT_SAGITTAL,
  coronal: VIEWPORT_IDS.CT_CORONAL,
};

const TOOLS = ["WindowLevel", "Crosshairs", "Length", "RectangleROI", "EllipseROI"] as const;

/** Ориентации для MPR (0=AXIAL, 1=SAGITTAL, 2=CORONAL) */
const MPR_ORIENTATIONS = [
  { id: 0, label: "Аксиальная" },
  { id: 1, label: "Сагиттальная" },
  { id: 2, label: "Корональная" },
] as const;

const DEFAULT_WINDOW: Record<string, [number, number]> = {
  CT: [40, 400],
  MR: [400, 800],
};

function getWindowRange(config: CtViewerConfig): [number, number] {
  if (config.defaultWindow) {
    const [center, width] = config.defaultWindow;
    return [center - width / 2, center + width / 2];
  }
  const [center, width] = DEFAULT_WINDOW[config.modality === "MR" ? "MR" : "CT"];
  return [center - width / 2, center + width / 2];
}

/** Fallback metadata provider: извлекает метаданные из закэшированного изображения, если DICOM metadata недоступна */
function createCacheBasedMetadataProvider(config: CtViewerConfig) {
  const defaultRange = getWindowRange(config);
  const defaultWC = (defaultRange[0] + defaultRange[1]) / 2;
  const defaultWW = defaultRange[1] - defaultRange[0];
  const modality = config.modality === "MR" ? "MR" : "CT";

  const provider = (type: string, query: unknown) => {
    const imageId = typeof query === "string" ? query : "";
    if (!imageId) return undefined;
    const image = cache.getImage(imageId);
    if (!image) return undefined;
    const pixelData = image.getPixelData();
    const ctor = pixelData?.constructor?.name ?? "";
    const bitsAllocated = ctor.includes("16") ? 16 : ctor.includes("8") ? 8 : 16;
    const pixelRepresentation = ctor.includes("Int") ? 1 : 0;
    const bitsStored = bitsAllocated;
    const highBit = bitsStored - 1;

    if (type === Enums.MetadataModules.IMAGE_PIXEL) {
      return {
        pixelRepresentation,
        bitsAllocated,
        bitsStored,
        highBit,
        photometricInterpretation: "MONOCHROME2",
        samplesPerPixel: 1,
      };
    }
    if (type === Enums.MetadataModules.VOI_LUT) {
      const wc = Array.isArray(image.windowCenter) ? image.windowCenter[0] : (image.windowCenter ?? defaultWC);
      const ww = Array.isArray(image.windowWidth) ? image.windowWidth[0] : (image.windowWidth ?? defaultWW);
      return { windowWidth: ww, windowCenter: wc };
    }
    if (type === Enums.MetadataModules.GENERAL_SERIES) {
      const base = imageId.replace(/\/I\d+$/, "").replace(/\D/g, "").slice(-24) || "0";
      return { modality, seriesInstanceUID: `1.2.3.${base}` };
    }
    if (type === Enums.MetadataModules.IMAGE_PLANE) {
      const cols = image.width ?? 512;
      const rows = image.height ?? 512;
      const imageOrientationPatient: [number, number, number, number, number, number] = [1, 0, 0, 0, 1, 0];
      const pixelSpacing: [number, number] = [1, 1];
      const base = imageId.replace(/\/I\d+$/, "").replace(/\D/g, "").slice(-24) || "0";
      const sliceMatch = imageId.match(/\/I(\d+)$/);
      const sliceIndex = sliceMatch ? parseInt(sliceMatch[1], 10) : 0;
      const imagePositionPatient: [number, number, number] = [0, 0, sliceIndex];
      return {
        frameOfReferenceUID: `1.2.3.${base}`,
        columns: cols,
        rows,
        imageOrientationPatient,
        pixelSpacing,
        imagePositionPatient,
      };
    }
    return undefined;
  };
  metaData.addProvider(provider, -50);
  return () => metaData.removeProvider(provider);
}

function createVolumeImagePlaneFallbackProvider(volumeId: string) {
  const provider = (type: string, query: unknown) => {
    const imageId = typeof query === "string" ? query : "";
    if (type !== Enums.MetadataModules.IMAGE_PLANE) return undefined;
    const vol = cache.getVolume(volumeId) as { imageIds: string[]; dimensions: number[]; origin: number[]; direction: Float32Array | number[]; spacing: number[]; metadata?: { FrameOfReferenceUID?: string } } | undefined;
    if (!vol?.imageIds) return undefined;
    const idx = vol.imageIds.indexOf(imageId);
    if (idx < 0) return undefined;
    const [cols, rows] = vol.dimensions;
    const origin = vol.origin as [number, number, number];
    const dir = vol.direction;
    const spacing = vol.spacing as [number, number, number];
    const sliceDir = [dir[6], dir[7], dir[8]] as [number, number, number];
    const imagePositionPatient: [number, number, number] = [
      origin[0] + sliceDir[0] * idx * spacing[2],
      origin[1] + sliceDir[1] * idx * spacing[2],
      origin[2] + sliceDir[2] * idx * spacing[2],
    ];
    const rowCosines = [dir[0], dir[1], dir[2]] as [number, number, number];
    const columnCosines = [dir[3], dir[4], dir[5]] as [number, number, number];
    return {
      frameOfReferenceUID: vol.metadata?.FrameOfReferenceUID ?? "",
      columns: cols,
      rows,
      imagePositionPatient,
      rowCosines,
      columnCosines,
      imageOrientationPatient: [...rowCosines, ...columnCosines],
      rowPixelSpacing: spacing[1],
      columnPixelSpacing: spacing[0],
      pixelSpacing: [spacing[1], spacing[0]],
    };
  };
  metaData.addProvider(provider, -100);
  return () => metaData.removeProvider(provider);
}

function createTransferFunctionSetter(range: [number, number]) {
  return ({
    volumeActor,
  }: {
    volumeActor: { getProperty: () => { getRGBTransferFunction: (i: number) => { setMappingRange: (l: number, u: number) => void } } };
  }) => {
    // Keep this as a fallback; we also set VOI on the viewport level (more reliable for MR).
    volumeActor.getProperty().getRGBTransferFunction(0).setMappingRange(range[0], range[1]);
  };
}

const VIEWPORT_COLORS: Record<string, string> = {
  [VIEWPORT_IDS.CT_AXIAL]: "rgb(200, 0, 0)",
  [VIEWPORT_IDS.CT_SAGITTAL]: "rgb(200, 200, 0)",
  [VIEWPORT_IDS.CT_CORONAL]: "rgb(0, 200, 0)",
};

function createAndSetupToolGroup(seriesId: string, volId: string) {
  const id = toolGroupIdForSeries(seriesId);
  let tg = ToolGroupManager.getToolGroup(id);
  if (tg) return tg;
  tg = ToolGroupManager.createToolGroup(id)!;
  tg.addTool(PanTool.toolName);
  tg.addTool(ZoomTool.toolName);
  tg.addTool(StackScrollTool.toolName);
  tg.addTool(CrosshairsTool.toolName, {
    getReferenceLineColor: (vpId: string) => VIEWPORT_COLORS[vpId] ?? "rgb(0, 200, 0)",
    getReferenceLineControllable: () => true,
    getReferenceLineDraggableRotatable: () => true,
    getReferenceLineSlabThicknessControlsOn: () => true,
    filterActorUIDsToSetSlabThickness: [],
  });
  tg.addTool(LengthTool.toolName, { volumeId: volId });
  tg.addTool(RectangleROITool.toolName, { volumeId: volId });
  tg.addTool(EllipticalROITool.toolName);
  tg.addTool(WindowLevelTool.toolName);
  tg.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
  tg.setToolActive(PanTool.toolName, { bindings: [{ mouseButton: MouseBindings.Auxiliary }] });
  tg.setToolActive(ZoomTool.toolName, { bindings: [{ mouseButton: MouseBindings.Secondary }] });
  tg.setToolActive(StackScrollTool.toolName, { bindings: [{ mouseButton: MouseBindings.Wheel }] });
  // MVP: линии уровня всегда включены (при наличии серии во вьюпортах)
  tg.setToolEnabled(CrosshairsTool.toolName);
  return tg;
}

type CtViewerProps = {
  config: CtViewerConfig;
};

type SlotState = {
  viewportId: (typeof ALL_VIEWPORT_IDS)[number];
  seriesId: string | null;
  orientation: number | null;
  sliceIndex: number | null;
  sliceCount: number | null;
};

function DroppableViewportSlot({
  dataViewport,
  viewportId,
  slot,
  isSelected,
  onSelect,
  style,
  show,
}: {
  dataViewport: string;
  viewportId: (typeof ALL_VIEWPORT_IDS)[number];
  slot: SlotState | undefined;
  isSelected: boolean;
  onSelect: () => void;
  style?: React.CSSProperties;
  show: boolean;
}) {
  const isEmpty = !slot?.seriesId;
  return (
    <div
      style={{
        display: show ? "flex" : "none",
        width: "100%",
        height: "100%",
        minHeight: 256,
        flexDirection: "row",
        ...style,
      }}
    >
      <div
        data-viewport={dataViewport}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        style={{
          flex: 1,
          position: "relative",
          minWidth: 0,
          backgroundColor: "#000",
          border: isSelected
            ? "2px solid rgba(24, 144, 255, 0.9)"
            : "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: isSelected ? "0 0 0 1px rgba(24, 144, 255, 0.5)" : "none",
          boxSizing: "border-box",
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {slot?.seriesId && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(0,0,0,0.55)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 12,
              lineHeight: "16px",
              zIndex: 2,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {(() => {
              const total = slot.sliceCount ?? null;
              const current = slot.sliceIndex != null ? slot.sliceIndex + 1 : null;
              return total && current ? `${current} / ${total}` : total ? `— / ${total}` : "—";
            })()}
          </div>
        )}
        {isEmpty && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.7)",
              color: "#888",
              fontSize: 13,
              pointerEvents: "auto",
              zIndex: 1,
            }}
            onWheel={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            Нажмите на серию слева
          </div>
        )}
      </div>
    </div>
  );
}

export function CtViewer({ config }: CtViewerProps) {
  const { pacsBasePath, series } = config;
  if (!series.length) throw new Error("CtViewerConfig.series must not be empty");

  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const cacheMetadataCleanupRef = useRef<(() => void) | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [ready, setReady] = useState(false);
  const [cornerstoneReady, setCornerstoneReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(config.initialSeriesId ?? null);
  const [activeSeriesLabel, setActiveSeriesLabel] = useState<string | null>(null);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const loadTokenRef = useRef(0);
  const [activeTool, setActiveTool] = useState<(typeof TOOLS)[number]>("WindowLevel");
  const [layout, setLayout] = useState<CtLayoutId>("1");
  const cornerstoneReadyRef = useRef(false);
  const [slots, setSlots] = useState<SlotState[]>(() =>
    ALL_VIEWPORT_IDS.map((viewportId) => ({
      viewportId,
      seriesId: null,
      orientation: null,
      sliceIndex: null,
      sliceCount: null,
    }))
  );
  const [frameOfReferenceUID, setFrameOfReferenceUID] = useState<string | null>(null);
  type ToolGroupT = ReturnType<typeof ToolGroupManager.getToolGroup>;
  const toolGroupsBySeriesRef = useRef<Map<string, ToolGroupT>>(new Map());
  const seriesVolumeIdsRef = useRef<Map<string, string>>(new Map());
  const seriesWindowRef = useRef<Map<string, [number, number]>>(new Map());
  const seriesById = useRef(new Map<string, (typeof series)[number]>());
  useEffect(() => {
    seriesById.current = new Map(series.map((s) => [s.id, s]));
  }, [series]);

  const applyToolToAllGroups = useCallback(
    (fn: (tg: NonNullable<ToolGroupT>) => void) => {
      toolGroupsBySeriesRef.current.forEach((tg) => tg && fn(tg));
    },
    []
  );

  const setTool = useCallback(
    (tool: (typeof TOOLS)[number]) => {
      applyToolToAllGroups((tg) => {
        tg.setToolPassive(LengthTool.toolName);
        tg.setToolPassive(EllipticalROITool.toolName);
        tg.setToolPassive(RectangleROITool.toolName);
        tg.setToolPassive(WindowLevelTool.toolName);
        // MVP: crosshairs всегда включены (рисуются). Инструмент можно сделать активным,
        // но выключать/скрывать линии уровня нельзя.
        tg.setToolEnabled(CrosshairsTool.toolName);
        if (tool === "WindowLevel") {
          tg.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        } else if (tool === "Crosshairs") {
          tg.setToolActive(CrosshairsTool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        } else if (tool === "Length") {
          tg.setToolActive(LengthTool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        } else if (tool === "RectangleROI") {
          tg.setToolActive(RectangleROITool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        } else {
          tg.setToolActive(EllipticalROITool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        }
      });
      setActiveTool(tool);
    },
    [applyToolToAllGroups]
  );

  const resetWindowLevel = useCallback(() => {
    const re = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!re) return;
    const slotsWithVolume = slots.filter((s) => s.seriesId != null);
    for (const slot of slotsWithVolume) {
      const range = seriesWindowRef.current.get(slot.seriesId!);
      if (!range) continue;
      const vp = re.getViewport(slot.viewportId);
      const actorEntry = (vp as { getDefaultActor?: () => { actor?: unknown } })?.getDefaultActor?.();
      const actor = actorEntry?.actor as
        | {
            getProperty?: () => {
              getRGBTransferFunction?: (i: number) => {
                setMappingRange: (l: number, u: number) => void;
              };
            };
          }
        | undefined;

      // Cornerstone actor APIs are loosely typed; keep runtime guards in place
      // so TypeScript can prove these values are defined.
      const property = actor?.getProperty?.();
      const rgbTF = property?.getRGBTransferFunction?.(0);
      if (rgbTF) {
        rgbTF.setMappingRange(range[0], range[1]);
      }
    }
    re.renderViewports(slotsWithVolume.map((s) => s.viewportId));
  }, [slots]);

  useEffect(() => {
    cornerstoneReadyRef.current = cornerstoneReady;
  }, [cornerstoneReady]);

  const loadVolumeAndAssignToSlots = useCallback(
    async (
      seriesId: string,
      assignments: { viewportId: (typeof ALL_VIEWPORT_IDS)[number]; orientation: number }[],
      currentSlots: SlotState[]
    ) => {
      const s = series.find((x) => x.id === seriesId);
      if (!s) return;
      const re = getRenderingEngine(RENDERING_ENGINE_ID);
      if (!re) return;
      const volId = volumeIdForSeries(seriesId);
      const baseUrl = `${window.location.origin}${pacsBasePath}/${seriesId}`;
      const prefix = s.slicePrefix ?? "I";
      const postfix = s.slicePostfix ?? "";
      const imageIds = Array.from(
        { length: s.sliceCount },
        (_, i) => `wadouri:${baseUrl}/${prefix}${s.sliceStart + i}${postfix}`
      );
      const n = imageIds.length;
      const indices = new Set<number>();
      for (let i = 0; i < Math.min(30, n); i++) indices.add(i);
      for (let i = Math.floor(n / 2) - 15; i < Math.floor(n / 2) + 15 && i < n; i++) if (i >= 0) indices.add(i);
      for (let i = n - 1; i >= n - 30 && i >= 0; i--) indices.add(i);
      const toPreload = [...indices].map((i) => imageIds[i]);
      await Promise.allSettled(toPreload.map((id) => imageLoader.loadImage(id)));
      const firstImageId = imageIds[0];
      const firstImage = cache.getImage(firstImageId) as { windowCenter?: number | number[]; windowWidth?: number | number[] } | undefined;
      const configRange = getWindowRange(config);
      const wc = firstImage
        ? (Array.isArray(firstImage.windowCenter) ? firstImage.windowCenter[0] : (firstImage.windowCenter ?? (configRange[0] + configRange[1]) / 2))
        : (configRange[0] + configRange[1]) / 2;
      const ww = firstImage
        ? (Array.isArray(firstImage.windowWidth) ? firstImage.windowWidth[0] : (firstImage.windowWidth ?? configRange[1] - configRange[0]))
        : configRange[1] - configRange[0];
      const windowRange: [number, number] = [wc - ww / 2, wc + ww / 2];
      seriesWindowRef.current.set(seriesId, windowRange);

      const volume = await volumeLoader.createAndCacheVolumeFromImages(volId, imageIds);
      await volume.load();
      seriesVolumeIdsRef.current.set(seriesId, volId);
      const removeFallback = createVolumeImagePlaneFallbackProvider(volId);
      try {
        await setVolumesForViewports(
          re,
          [{ volumeId: volId, callback: createTransferFunctionSetter(windowRange) }],
          assignments.map((a) => a.viewportId),
          true,
          true
        );

        // Prefer viewport-level VOI range; this is generally more consistent across modalities (esp. MR).
        for (const { viewportId } of assignments) {
          const vp = re.getViewport(viewportId) as
            | {
                setProperties?: (props: unknown) => void;
                setVOI?: (voi: { lower: number; upper: number }) => void;
              }
            | undefined;
          if (!vp) continue;
          if (typeof vp.setVOI === "function") {
            vp.setVOI({ lower: windowRange[0], upper: windowRange[1] });
          } else if (typeof vp.setProperties === "function") {
            // Cornerstone accepts different shapes depending on viewport type/version; keep it guarded.
            vp.setProperties({ voiRange: { lower: windowRange[0], upper: windowRange[1] } });
          }
        }

        const reCheck = getRenderingEngine(RENDERING_ENGINE_ID);
        if (!reCheck) {
          throw new Error("RenderingEngine not ready. Please wait for the viewer to initialize.");
        }

        const tg = createAndSetupToolGroup(seriesId, volId);
        toolGroupsBySeriesRef.current.set(seriesId, tg);

        for (const { viewportId } of assignments) {
          // Важно: один viewport должен принадлежать только одному ToolGroup.
          // При быстрых переключениях/гонках снимаем viewport со ВСЕХ текущих групп.
          toolGroupsBySeriesRef.current.forEach((existing) => {
            try {
              existing?.removeViewports(RENDERING_ENGINE_ID, viewportId);
            } catch {
              // ignore
            }
          });
          tg.addViewport(viewportId, RENDERING_ENGINE_ID);
        }
        tg.setToolEnabled(CrosshairsTool.toolName);
        // После появления нового тулгрупа — гарантируем правильный активный инструмент.
        if (activeTool === "Crosshairs") {
          tg.setToolActive(CrosshairsTool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        }
        const firstVp = re.getViewport(assignments[0].viewportId);
        const forUID =
          firstVp?.getFrameOfReferenceUID?.() ??
          (volume as { metadata?: { FrameOfReferenceUID?: string } })?.metadata?.FrameOfReferenceUID;
        if (forUID) setFrameOfReferenceUID(forUID);

        for (const { viewportId, orientation } of assignments) {
          const vp = re.getViewport(viewportId);
          const vpAny = vp as {
            applyViewOrientation?: (orientation: Enums.OrientationAxis, resetCamera?: boolean) => void;
          };
          const orientationAxis: Enums.OrientationAxis =
            orientation === 0
              ? Enums.OrientationAxis.AXIAL
              : orientation === 1
                ? Enums.OrientationAxis.SAGITTAL
                : Enums.OrientationAxis.CORONAL;
          if (vpAny?.applyViewOrientation) vpAny.applyViewOrientation(orientationAxis, true);
        }
        setSlots((prev) =>
          prev.map((slot) => {
            const a = assignments.find((x) => x.viewportId === slot.viewportId);
            if (a) return { ...slot, seriesId, orientation: a.orientation, sliceIndex: 0, sliceCount: s.sliceCount };
            return slot;
          })
        );
        const viewportIdsToRender = assignments.map((a) => a.viewportId);
        re.renderViewports(viewportIdsToRender);
        // Повторный resize и рендер после раскладки (исправляет чёрный экран при 1x1 после выбора «заполнить пустые окна»)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            re.resize(true, true);
            re.renderViewports(viewportIdsToRender);
          });
        });
      } finally {
        removeFallback?.();
      }
    },
    [pacsBasePath, series, config]
  );

  const handleSeriesSelect = useCallback(
    async (seriesId: string, label: string) => {
      if (!cornerstoneReadyRef.current) return;
      if (isLoadingSeries) return;
      const myToken = ++loadTokenRef.current;
      setError(null);
      setActiveSeriesId(seriesId);
      setActiveSeriesLabel(label);
      setIsLoadingSeries(true);

      const assignments: { viewportId: (typeof ALL_VIEWPORT_IDS)[number]; orientation: number }[] = [
        { viewportId: VIEWPORT_IDS.CT_AXIAL, orientation: 0 },
        { viewportId: VIEWPORT_IDS.CT_SAGITTAL, orientation: 1 },
        { viewportId: VIEWPORT_IDS.CT_CORONAL, orientation: 2 },
      ];

      try {
        // Если во время загрузки уже началась следующая — ничего не делаем.
        if (myToken !== loadTokenRef.current) return;
        await loadVolumeAndAssignToSlots(seriesId, assignments, slots);
        if (myToken !== loadTokenRef.current) return;
        messageApi.success(`Загружено: ${label}`, 2);
      } catch (err) {
        console.error("Load volume error:", err);
        if (myToken === loadTokenRef.current) {
          setError(err instanceof Error ? err.message : String(err));
          messageApi.error("Не удалось загрузить серию", 2);
        }
      } finally {
        if (myToken === loadTokenRef.current) {
          setIsLoadingSeries(false);
        }
      }
    },
    [isLoadingSeries, loadVolumeAndAssignToSlots, messageApi, slots]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const checkReady = () => {
      const rect = container.getBoundingClientRect();
      return rect.width >= 400 && rect.height >= 400;
    };
    if (checkReady()) {
      setReady(true);
      return;
    }
    const ro = new ResizeObserver(() => {
      if (checkReady()) {
        setReady(true);
        ro.disconnect();
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const container = containerRef.current;
    let disposed = false;
    const el1 = container.querySelector("[data-viewport=axial]") as HTMLDivElement;
    const el2 = container.querySelector("[data-viewport=sagittal]") as HTMLDivElement;
    const el3 = container.querySelector("[data-viewport=coronal]") as HTMLDivElement;
    if (!el1 || !el2 || !el3) return;

    const run = async () => {
      try {
        setError(null);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        await coreInit({
          rendering: { renderingEngineMode: Enums.RenderingEngineModeEnum.ContextPool },
          debug: { statsOverlay: false },
        });
        dicomImageLoaderInit({ maxWebWorkers: navigator.hardwareConcurrency ?? 1 });
        cacheMetadataCleanupRef.current = createCacheBasedMetadataProvider(config);

        toolsInit({ addons: { polySeg } });
        addTool(StackScrollTool);
        addTool(WindowLevelTool);
        addTool(PanTool);
        addTool(ZoomTool);
        addTool(CrosshairsTool);
        addTool(LengthTool);
        addTool(RectangleROITool);
        addTool(EllipticalROITool);

        const renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
        const viewerInput: PublicViewportInput[] = [
          { viewportId: VIEWPORT_IDS.CT_AXIAL, element: el1, type: Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: Enums.OrientationAxis.AXIAL } },
          { viewportId: VIEWPORT_IDS.CT_SAGITTAL, element: el2, type: Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: Enums.OrientationAxis.SAGITTAL } },
          { viewportId: VIEWPORT_IDS.CT_CORONAL, element: el3, type: Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: Enums.OrientationAxis.CORONAL } },
        ];
        renderingEngine.setViewports(viewerInput);

        const viewports = [...ALL_VIEWPORT_IDS];
        viewports.forEach((id) => renderingEngine.getViewport(id)?.resetCamera?.());
        renderingEngine.resize(true, true);
        renderingEngine.renderViewports(viewports);

        setCornerstoneReady(true);

        const ro = new ResizeObserver(() => {
          if (!disposed) {
            const re = getRenderingEngine(RENDERING_ENGINE_ID);
            re?.resize(true, true);
            re?.renderViewports(viewports);
          }
        });
        ro.observe(container);

        cleanupRef.current = () => {
          disposed = true;
          setCornerstoneReady(false);
          cacheMetadataCleanupRef.current?.();
          cacheMetadataCleanupRef.current = null;
          toolGroupsBySeriesRef.current.forEach((_, seriesId) => {
            ToolGroupManager.destroyToolGroup(toolGroupIdForSeries(seriesId));
          });
          toolGroupsBySeriesRef.current.clear();
          ro.disconnect();
          renderingEngine.destroy();
        };
      } catch (err) {
        console.error("PET-CT Viewer error:", err);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    run();
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [ready, pacsBasePath]);

  useEffect(() => {
    if (!ready) return;
    const re = getRenderingEngine(RENDERING_ENGINE_ID);
    if (re) {
      requestAnimationFrame(() => {
        re.resize(true, true);
        re.renderViewports([...ALL_VIEWPORT_IDS]);
      });
    }
  }, [layout, ready]);

  useEffect(() => {
    if (!cornerstoneReady) return;
    if (!config.initialSeriesId) return;
    const s = series.find((x) => x.id === config.initialSeriesId);
    const label = s?.id ?? config.initialSeriesId;
    handleSeriesSelect(config.initialSeriesId, label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cornerstoneReady]);

  // Обновляем индекс текущего среза (для оверлея) из viewport’ов.
  useEffect(() => {
    if (!cornerstoneReady) return;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const re = getRenderingEngine(RENDERING_ENGINE_ID);
      if (re) {
        setSlots((prev) => {
          let changed = false;
          const next = prev.map((slot) => {
            if (!slot.seriesId) return slot;
            const vp = re.getViewport(slot.viewportId) as
              | {
                  getCurrentImageId?: () => string | undefined;
                  getImageIds?: () => string[] | undefined;
                  getCurrentImageIdIndex?: () => number | undefined;
                }
              | undefined;
            if (!vp) return slot;

            let idx: number | null = null;
            try {
              if (typeof vp.getCurrentImageIdIndex === "function") {
                const i = vp.getCurrentImageIdIndex();
                if (typeof i === "number" && Number.isFinite(i)) idx = i;
              }
              if (idx == null && typeof vp.getCurrentImageId === "function") {
                const imageId = vp.getCurrentImageId();
                const m = imageId?.match(/\/I(\d+)/);
                const seriesCfg = seriesById.current.get(slot.seriesId);
                if (m && seriesCfg) {
                  const num = parseInt(m[1], 10);
                  if (Number.isFinite(num)) idx = num - seriesCfg.sliceStart;
                }
              }
            } catch {
              // ignore
            }
            if (idx == null) return slot;
            if (idx !== slot.sliceIndex) {
              changed = true;
              return { ...slot, sliceIndex: idx };
            }
            return slot;
          });
          return changed ? next : prev;
        });
      }
      setTimeout(tick, 150);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [cornerstoneReady]);

  return (
    <>
      {messageContextHolder}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          minHeight: Math.max(VIEWPORT_SIZE + 120, 560),
          height: "calc(100vh - 120px)",
        }}
      >
        <StudyListSidebar
          pacsBasePath={pacsBasePath}
          series={series}
          cornerstoneReady={cornerstoneReady}
          onSeriesSelect={(id, label) => handleSeriesSelect(id, label)}
          selectedSeriesId={activeSeriesId}
          disabled={isLoadingSeries}
        />
        <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
          {isLoadingSeries && (
            <div style={{ padding: "6px 10px", border: "1px solid #ffe58f", borderRadius: 6, background: "#fffbe6" }}>
              <span style={{ color: "#614700", fontSize: 12 }}>
                Загрузка серии…
              </span>
            </div>
          )}
          {error && (
            <div style={{ color: "#c00", padding: 8, background: "#fee" }}>
              Ошибка: {error}
            </div>
          )}
          {/* MVP: синхронизация видов убрана */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <CtViewerToolbar
                activeTool={activeTool}
                onToolChange={setTool}
                onResetWindowLevel={resetWindowLevel}
                resetWindowLevelDisabled={!slots.some((s) => s.seriesId != null)}
              />
              <CtLayoutSelector layout={layout} onLayoutChange={setLayout} />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  layout === "1"
                    ? "minmax(256px, 1fr)"
                    : layout === "3H"
                    ? "minmax(256px, 1fr) minmax(256px, 1fr) minmax(256px, 1fr)"
                    : layout === "3V"
                      ? "minmax(256px, 1fr)"
                      : "minmax(256px, 1fr) minmax(256px, 1fr)",
                gridTemplateRows:
                  layout === "1"
                    ? "minmax(256px, 1fr)"
                    : layout === "3H"
                    ? "minmax(256px, 1fr)"
                    : layout === "3V"
                      ? "minmax(256px, 1fr) minmax(256px, 1fr) minmax(256px, 1fr)"
                      : "minmax(256px, 1fr) minmax(256px, 1fr)",
                gap: 8,
                flex: 1,
                minHeight: VIEWPORT_SIZE,
              }}
            >
              {(["axial", "sagittal", "coronal"] as const).map((dataViewport) => {
                const viewportId = DATA_VIEWPORT_TO_ID[dataViewport];
                const slot = slots.find((s) => s.viewportId === viewportId);
                const show =
                  layout === "1" ? dataViewport === "axial" : true;
                const layoutStyle: React.CSSProperties =
                  layout === "1"
                    ? { gridColumn: "1 / 2", gridRow: "1 / 2" }
                    : layout === "3H"
                    ? dataViewport === "axial"
                      ? { gridColumn: "1 / 2", gridRow: "1 / 2" }
                      : dataViewport === "sagittal"
                        ? { gridColumn: "2 / 3", gridRow: "1 / 2" }
                        : { gridColumn: "3 / 4", gridRow: "1 / 2" }
                    : layout === "3V"
                      ? dataViewport === "axial"
                        ? { gridColumn: "1 / 2", gridRow: "1 / 2" }
                        : dataViewport === "sagittal"
                          ? { gridColumn: "1 / 2", gridRow: "2 / 3" }
                          : { gridColumn: "1 / 2", gridRow: "3 / 4" }
                      : // 2L1R
                        dataViewport === "axial"
                        ? { gridColumn: "1 / 2", gridRow: "1 / 2" }
                        : dataViewport === "sagittal"
                          ? { gridColumn: "1 / 2", gridRow: "2 / 3" }
                          : { gridColumn: "2 / 3", gridRow: "1 / 3" };
                return (
                  <DroppableViewportSlot
                    key={dataViewport}
                    dataViewport={dataViewport}
                    viewportId={viewportId}
                    slot={slot}
                    isSelected={false}
                    onSelect={() => {}}
                    style={layoutStyle}
                    show={show}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
