"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CtViewerConfig } from "../types";
import { Popover, Button, Switch } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CtViewerToolbar } from "./CtViewerToolbar";
import { CtLayoutSelector, type CtLayoutId } from "./CtLayoutSelector";
import { StudyListSidebar } from "./StudyListSidebar";
import { DropProjectionModal } from "./DropProjectionModal";
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
const { createCameraPositionSynchronizer } = cornerstoneTools.synchronizers;

const VIEWPORT_SIZE = 640;
const RENDERING_ENGINE_ID = "pet-ct-viewer";
const CT_VOLUME_ID = "ct-volume";
const volumeIdForSeries = (seriesId: string) => `ct-volume-${seriesId}`;
const toolGroupIdForSeries = (seriesId: string) => `ct-toolgroup-${seriesId}`;

const VIEWPORT_IDS = {
  CT_AXIAL: "CT_AXIAL",
  CT_SAGITTAL: "CT_SAGITTAL",
  CT_CORONAL: "CT_CORONAL",
  CT_AXIAL_2: "CT_AXIAL_2",
} as const;

const ALL_VIEWPORT_IDS = [
  VIEWPORT_IDS.CT_AXIAL,
  VIEWPORT_IDS.CT_SAGITTAL,
  VIEWPORT_IDS.CT_CORONAL,
  VIEWPORT_IDS.CT_AXIAL_2,
] as const;

/** Соответствие data-viewport атрибута и viewportId */
const DATA_VIEWPORT_TO_ID: Record<string, (typeof ALL_VIEWPORT_IDS)[number]> = {
  axial: VIEWPORT_IDS.CT_AXIAL,
  sagittal: VIEWPORT_IDS.CT_SAGITTAL,
  coronal: VIEWPORT_IDS.CT_CORONAL,
  axial2: VIEWPORT_IDS.CT_AXIAL_2,
};

const TOOLS = ["WindowLevel", "Crosshairs", "Length", "RectangleROI", "EllipseROI"] as const;

/** Ориентации для MPR (0=AXIAL, 1=SAGITTAL, 2=CORONAL) */
const MPR_ORIENTATIONS = [
  { id: 0, label: "Аксиальная" },
  { id: 1, label: "Сагиттальная" },
  { id: 2, label: "Корональная" },
] as const;

const CT_WINDOW_LOWER = 40 - 400 / 2;
const CT_WINDOW_UPPER = 40 + 400 / 2;

/** Fallback metadata provider: извлекает метаданные из закэшированного изображения, если DICOM metadata недоступна */
function createCacheBasedMetadataProvider() {
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
      const wc = Array.isArray(image.windowCenter) ? image.windowCenter[0] : (image.windowCenter ?? 40);
      const ww = Array.isArray(image.windowWidth) ? image.windowWidth[0] : (image.windowWidth ?? 400);
      return { windowWidth: ww, windowCenter: wc };
    }
    if (type === Enums.MetadataModules.GENERAL_SERIES) {
      const base = imageId.replace(/\/I\d+$/, "").replace(/\D/g, "").slice(-24) || "0";
      return { modality: "CT", seriesInstanceUID: `1.2.3.${base}` };
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

function setCtTransferFunction({
  volumeActor,
}: {
  volumeActor: { getProperty: () => { getRGBTransferFunction: (i: number) => { setMappingRange: (l: number, u: number) => void } } };
}) {
  volumeActor.getProperty().getRGBTransferFunction(0).setMappingRange(CT_WINDOW_LOWER, CT_WINDOW_UPPER);
}

const VIEWPORT_COLORS: Record<string, string> = {
  [VIEWPORT_IDS.CT_AXIAL]: "rgb(200, 0, 0)",
  [VIEWPORT_IDS.CT_SAGITTAL]: "rgb(200, 200, 0)",
  [VIEWPORT_IDS.CT_CORONAL]: "rgb(0, 200, 0)",
  [VIEWPORT_IDS.CT_AXIAL_2]: "rgb(0, 150, 200)",
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
  tg.setToolPassive(CrosshairsTool.toolName);
  return tg;
}

type CtViewerProps = {
  config: CtViewerConfig;
};

type SlotState = {
  viewportId: (typeof ALL_VIEWPORT_IDS)[number];
  seriesId: string | null;
  orientation: number | null;
};

function DroppableViewportSlot({
  dataViewport,
  viewportId,
  slot,
  isSelected,
  show,
  onSelect,
}: {
  dataViewport: string;
  viewportId: (typeof ALL_VIEWPORT_IDS)[number];
  slot: SlotState | undefined;
  isSelected: boolean;
  show: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: viewportId });
  const isEmpty = !slot?.seriesId;
  return (
    <div
      style={{
        display: show ? "flex" : "none",
        width: "100%",
        height: "100%",
        minHeight: 256,
        flexDirection: "row",
      }}
    >
      <div
        ref={setNodeRef}
        data-viewport={dataViewport}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        style={{
          flex: 1,
          position: "relative",
          minWidth: 0,
          backgroundColor: isOver ? "#1a2a1a" : "#000",
          border: isSelected
            ? "2px solid rgba(24, 144, 255, 0.9)"
            : "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: isSelected ? "0 0 0 1px rgba(24, 144, 255, 0.5)" : "none",
          boxSizing: "border-box",
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
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
            Перетащите серию сюда
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
  const [ready, setReady] = useState(false);
  const [cornerstoneReady, setCornerstoneReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<(typeof TOOLS)[number]>("WindowLevel");
  const [layout, setLayout] = useState<CtLayoutId>("1x1");
  const [crosshairsVisible, setCrosshairsVisible] = useState(false);
  const [syncScrollEnabled, setSyncScrollEnabled] = useState(true);
  const syncScrollEnabledRef = useRef(true);
  const [selectedViewportId, setSelectedViewportId] = useState<(typeof ALL_VIEWPORT_IDS)[number] | null>(null);
  const [viewportOrientations, setViewportOrientations] = useState<Record<string, number>>({
    [VIEWPORT_IDS.CT_AXIAL]: 0,
    [VIEWPORT_IDS.CT_SAGITTAL]: 1,
    [VIEWPORT_IDS.CT_CORONAL]: 2,
    [VIEWPORT_IDS.CT_AXIAL_2]: 0,
  });
  const [mprPopoverOpen, setMprPopoverOpen] = useState(false);
  const [slots, setSlots] = useState<SlotState[]>(() =>
    ALL_VIEWPORT_IDS.map((viewportId) => ({ viewportId, seriesId: null, orientation: null }))
  );
  const [dropModal, setDropModal] = useState<{
    open: true;
    targetSlotId: (typeof ALL_VIEWPORT_IDS)[number];
    seriesId: string;
    seriesLabel?: string;
  } | { open: false }>({ open: false });
  const [frameOfReferenceUID, setFrameOfReferenceUID] = useState<string | null>(null);
  type ToolGroupT = ReturnType<typeof ToolGroupManager.getToolGroup>;
  const toolGroupsBySeriesRef = useRef<Map<string, ToolGroupT>>(new Map());
  const seriesVolumeIdsRef = useRef<Map<string, string>>(new Map());
  type CameraSync = ReturnType<typeof createCameraPositionSynchronizer>;
  const cameraSyncsRef = useRef<{ axial: CameraSync; sagittal: CameraSync; coronal: CameraSync } | null>(null);

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
        if (crosshairsVisible) tg.setToolPassive(CrosshairsTool.toolName);
        else tg.setToolDisabled(CrosshairsTool.toolName);
        if (tool === "WindowLevel") {
          tg.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        } else if (tool === "Crosshairs") {
          if (crosshairsVisible) tg.setToolActive(CrosshairsTool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        } else if (tool === "Length") {
          tg.setToolActive(LengthTool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        } else if (tool === "RectangleROI") {
          tg.setToolActive(RectangleROITool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        } else {
          tg.setToolActive(EllipticalROITool.toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
        }
      });
      setActiveTool(tool);
      const re = getRenderingEngine(RENDERING_ENGINE_ID);
      if (re) {
        requestAnimationFrame(() => {
          re.resize(true, true);
          re.renderViewports([...ALL_VIEWPORT_IDS]);
        });
      }
    },
    [crosshairsVisible, applyToolToAllGroups]
  );

  const toggleCrosshairs = useCallback(() => {
    setCrosshairsVisible((v) => {
      const next = !v;
      applyToolToAllGroups((tg) => {
        if (next) tg.setToolPassive(CrosshairsTool.toolName);
        else tg.setToolDisabled(CrosshairsTool.toolName);
      });
      return next;
    });
  }, [applyToolToAllGroups]);

  useEffect(() => {
    syncScrollEnabledRef.current = syncScrollEnabled;
  }, [syncScrollEnabled]);

  const toggleSyncScroll = useCallback(() => {
    setSyncScrollEnabled((v) => {
      const next = !v;
      const syncs = cameraSyncsRef.current;
      if (!syncs) return next;
      const syncByAxis: Record<number, CameraSync> = {
        0: syncs.axial,
        1: syncs.sagittal,
        2: syncs.coronal,
      };
      slots.forEach((slot) => {
        if (!slot.seriesId || slot.orientation == null) return;
        const sync = syncByAxis[slot.orientation];
        const info = { renderingEngineId: RENDERING_ENGINE_ID, viewportId: slot.viewportId };
        if (next) sync.add(info);
        else sync.remove(info);
      });
      return next;
    });
  }, [slots]);

  const loadVolumeAndAssignToSlots = useCallback(
    async (
      seriesId: string,
      assignments: { viewportId: (typeof ALL_VIEWPORT_IDS)[number]; orientation: number }[],
      isFirstLoad: boolean,
      currentSlots: SlotState[]
    ) => {
      const s = series.find((x) => x.id === seriesId);
      if (!s) return;
      const re = getRenderingEngine(RENDERING_ENGINE_ID);
      if (!re) return;
      const volId = isFirstLoad ? CT_VOLUME_ID : volumeIdForSeries(seriesId);
      const baseUrl = `${window.location.origin}${pacsBasePath}/${seriesId}`;
      const imageIds = Array.from(
        { length: s.sliceCount },
        (_, i) => `wadouri:${baseUrl}/I${s.sliceStart + i}`
      );
      const n = imageIds.length;
      const indices = new Set<number>();
      for (let i = 0; i < Math.min(30, n); i++) indices.add(i);
      for (let i = Math.floor(n / 2) - 15; i < Math.floor(n / 2) + 15 && i < n; i++) if (i >= 0) indices.add(i);
      for (let i = n - 1; i >= n - 30 && i >= 0; i--) indices.add(i);
      const toPreload = [...indices].map((i) => imageIds[i]);
      await Promise.allSettled(toPreload.map((id) => imageLoader.loadImage(id)));
      const volume = await volumeLoader.createAndCacheVolumeFromImages(volId, imageIds);
      await volume.load();
      seriesVolumeIdsRef.current.set(seriesId, volId);
      const removeFallback = createVolumeImagePlaneFallbackProvider(volId);
      try {
        await setVolumesForViewports(
          re,
          [{ volumeId: volId, callback: setCtTransferFunction }],
          assignments.map((a) => a.viewportId),
          true,
          true
        );

        const tg = createAndSetupToolGroup(seriesId, volId);
        toolGroupsBySeriesRef.current.set(seriesId, tg);

        for (const { viewportId } of assignments) {
          const prevSlot = currentSlots.find((s) => s.viewportId === viewportId);
          if (prevSlot?.seriesId) {
            const prevTg = toolGroupsBySeriesRef.current.get(prevSlot.seriesId);
            if (prevTg) prevTg.removeViewports(RENDERING_ENGINE_ID, viewportId);
          }
          tg.addViewport(viewportId, RENDERING_ENGINE_ID);
        }
        const firstVp = re.getViewport(assignments[0].viewportId);
        const forUID =
          firstVp?.getFrameOfReferenceUID?.() ??
          (volume as { metadata?: { FrameOfReferenceUID?: string } })?.metadata?.FrameOfReferenceUID;
        if (forUID) setFrameOfReferenceUID(forUID);

        const syncs = cameraSyncsRef.current;

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

          // Синхронизация по ориентации между всеми сериями (если включена)
          if (syncScrollEnabledRef.current && syncs) {
            const prevSlot = currentSlots.find((s) => s.viewportId === viewportId);
            const syncByAxis: Record<number, CameraSync> = {
              0: syncs.axial,
              1: syncs.sagittal,
              2: syncs.coronal,
            };
            if (prevSlot?.orientation != null) {
              const oldSync = syncByAxis[prevSlot.orientation];
              oldSync.remove({ renderingEngineId: RENDERING_ENGINE_ID, viewportId });
            }
            syncByAxis[orientation].add({ renderingEngineId: RENDERING_ENGINE_ID, viewportId });
          }
        }
        setSlots((prev) =>
          prev.map((slot) => {
            const a = assignments.find((x) => x.viewportId === slot.viewportId);
            if (a) return { ...slot, seriesId, orientation: a.orientation };
            return slot;
          })
        );
        setViewportOrientations((prev) => {
          const next = { ...prev };
          for (const { viewportId, orientation } of assignments) next[viewportId] = orientation;
          return next;
        });
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
    [pacsBasePath, series]
  );

  const handleDropConfirm = useCallback(
    async (orientation: number, fillOtherSlots: boolean) => {
      if (!dropModal.open) return;
      const { targetSlotId, seriesId } = dropModal;
      setDropModal({ open: false });
      const assignments: { viewportId: (typeof ALL_VIEWPORT_IDS)[number]; orientation: number }[] = [
        { viewportId: targetSlotId, orientation },
      ];
      const remaining = [0, 1, 2].filter(
        (o) => o !== orientation
      );
      if (fillOtherSlots) {
        const emptySlots = slots.filter((s) => s.seriesId === null && s.viewportId !== targetSlotId);
        let r = 0;
        for (const slot of emptySlots) {
          if (r < remaining.length) {
            assignments.push({ viewportId: slot.viewportId, orientation: remaining[r++] });
          }
        }
      }
      const isFirstLoad = !slots.some((s) => s.seriesId != null);
      try {
        await loadVolumeAndAssignToSlots(seriesId, assignments, isFirstLoad, slots);
      } catch (err) {
        console.error("Load volume error:", err);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [dropModal, slots, loadVolumeAndAssignToSlots]
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const seriesId = String(active.id);
    const viewportId = String(over.id) as (typeof ALL_VIEWPORT_IDS)[number];
    if (!ALL_VIEWPORT_IDS.includes(viewportId)) return;
    setDropModal({ open: true, targetSlotId: viewportId, seriesId });
  },
    []
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const applyProjectionToSelectedViewport = useCallback(
    (orientation: number) => {
      if (!selectedViewportId) return;
      const re = getRenderingEngine(RENDERING_ENGINE_ID);
      if (!re) return;
      const vp = re.getViewport(selectedViewportId);
      if (!vp) return;
      const slot = slots.find((s) => s.viewportId === selectedViewportId);
      const vpAny = vp as { applyViewOrientation?: (orientation: Enums.OrientationAxis, resetCamera?: boolean) => void };
      if (typeof vpAny.applyViewOrientation === "function") {
        const orientationAxis: Enums.OrientationAxis =
          orientation === 0
            ? Enums.OrientationAxis.AXIAL
            : orientation === 1
              ? Enums.OrientationAxis.SAGITTAL
              : Enums.OrientationAxis.CORONAL;
        vpAny.applyViewOrientation(orientationAxis, true);
        setViewportOrientations((prev) => ({ ...prev, [selectedViewportId]: orientation }));

        // Обновляем синхронизацию камеры по ориентации (между всеми сериями)
        if (syncScrollEnabledRef.current && slot && cameraSyncsRef.current) {
          const syncs = cameraSyncsRef.current;
          const viewportInfo = { renderingEngineId: RENDERING_ENGINE_ID, viewportId: selectedViewportId };
          const syncByAxis: Record<number, CameraSync> = {
            0: syncs.axial,
            1: syncs.sagittal,
            2: syncs.coronal,
          };
          const oldOrientation = viewportOrientations[selectedViewportId];
          if (oldOrientation != null) syncByAxis[oldOrientation].remove(viewportInfo);
          syncByAxis[orientation].add(viewportInfo);
        }

        re.renderViewports([selectedViewportId]);
        setMprPopoverOpen(false);
      }
    },
    [selectedViewportId, viewportOrientations, slots]
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
    const el4 = container.querySelector("[data-viewport=axial2]") as HTMLDivElement;
    if (!el1 || !el2 || !el3 || !el4) return;

    const run = async () => {
      try {
        setError(null);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        await coreInit({
          rendering: { renderingEngineMode: Enums.RenderingEngineModeEnum.ContextPool },
          debug: { statsOverlay: false },
        });
        dicomImageLoaderInit({ maxWebWorkers: navigator.hardwareConcurrency ?? 1 });
        cacheMetadataCleanupRef.current = createCacheBasedMetadataProvider();
        setCornerstoneReady(true);

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
          { viewportId: VIEWPORT_IDS.CT_AXIAL_2, element: el4, type: Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: Enums.OrientationAxis.AXIAL } },
        ];
        renderingEngine.setViewports(viewerInput);

        const axialSync = createCameraPositionSynchronizer("axial-sync");
        const sagittalSync = createCameraPositionSynchronizer("sagittal-sync");
        const coronalSync = createCameraPositionSynchronizer("coronal-sync");
        cameraSyncsRef.current = { axial: axialSync, sagittal: sagittalSync, coronal: coronalSync };

        const viewports = [...ALL_VIEWPORT_IDS];
        viewports.forEach((id) => renderingEngine.getViewport(id)?.resetCamera?.());
        renderingEngine.resize(true, true);
        renderingEngine.renderViewports(viewports);

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
          cameraSyncsRef.current = null;
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

  // Включаем Crosshairs после полной инициализации viewport — избегаем ошибки в CrosshairsTool
  // при загрузке (когда аннотаций ещё нет, callback вызывается с undefined).
  useEffect(() => {
    if (!cornerstoneReady) return;
    const t = setTimeout(() => {
      setCrosshairsVisible(true);
      applyToolToAllGroups((tg) => tg.setToolPassive(CrosshairsTool.toolName));
    }, 400);
    return () => clearTimeout(t);
  }, [cornerstoneReady, applyToolToAllGroups]);

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={() => {
          document.body.style.cursor = "grabbing";
        }}
        onDragEnd={(event) => {
          document.body.style.cursor = "";
          handleDragEnd(event);
        }}
        onDragCancel={() => {
          document.body.style.cursor = "";
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            minHeight: Math.max(VIEWPORT_SIZE + 120, 560),
            height: "calc(100vh - 120px)",
          }}
        >
          <StudyListSidebar pacsBasePath={pacsBasePath} series={series} cornerstoneReady={cornerstoneReady} />
          <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
            {error && (
              <div style={{ color: "#c00", padding: 8, background: "#fee" }}>
                Ошибка: {error}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Switch checked={crosshairsVisible} onChange={toggleCrosshairs} />
                <span>Линии уровня</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Switch checked={syncScrollEnabled} onChange={toggleSyncScroll} />
                <span>Синхронизация видов</span>
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <CtViewerToolbar activeTool={activeTool} onToolChange={setTool} />
                <CtLayoutSelector layout={layout} onLayoutChange={setLayout} />
                <Popover
                  content={
                    selectedViewportId &&
                    slots.find((s) => s.viewportId === selectedViewportId)?.seriesId != null ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                        {MPR_ORIENTATIONS.map(({ id, label }) => (
                          <Button
                            key={id}
                            type={viewportOrientations[selectedViewportId] === id ? "primary" : "default"}
                            onClick={() => applyProjectionToSelectedViewport(id)}
                            size="small"
                            style={{ textAlign: "left" }}
                            block
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "#888" }}>
                        Сначала выберите окно с загруженной серией
                      </span>
                    )
                  }
                  trigger="click"
                  open={
                    mprPopoverOpen &&
                    !!selectedViewportId &&
                    slots.find((s) => s.viewportId === selectedViewportId)?.seriesId != null
                  }
                  onOpenChange={(open) => {
                    const hasSeries =
                      !!selectedViewportId &&
                      slots.find((s) => s.viewportId === selectedViewportId)?.seriesId != null;
                    if (!hasSeries) return;
                    setMprPopoverOpen(open);
                  }}
                  placement="bottomLeft"
                  title="Мультипланарная реконструкция"
                >
                  <Button
                    type="default"
                    shape="circle"
                    icon={<SwapOutlined />}
                    title={
                      selectedViewportId &&
                      slots.find((s) => s.viewportId === selectedViewportId)?.seriesId != null
                        ? "Сменить проекцию выбранного окна"
                        : "Выберите окно с серией, затем нажмите для смены проекции"
                    }
                    disabled={
                      !selectedViewportId ||
                      !slots.find((s) => s.viewportId === selectedViewportId)?.seriesId
                    }
                  />
                </Popover>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    layout === "1x1" || layout === "1x2" || layout === "1x3"
                      ? "1fr"
                      : layout === "2x1" || layout === "2x2"
                        ? "1fr 1fr"
                        : layout === "3x1"
                          ? "1fr 1fr 1fr"
                          : "1fr",
                  gridTemplateRows:
                    layout === "1x1" || layout === "2x1" || layout === "3x1"
                      ? "1fr"
                      : layout === "1x2" || layout === "2x2"
                        ? "1fr 1fr"
                        : layout === "1x3"
                          ? "1fr 1fr 1fr"
                          : "1fr",
                  gap: 8,
                  flex: 1,
                  minHeight: VIEWPORT_SIZE,
                }}
              >
                {(["axial", "sagittal", "coronal", "axial2"] as const).map((dataViewport) => {
                  const viewportId = DATA_VIEWPORT_TO_ID[dataViewport];
                  const slot = slots.find((s) => s.viewportId === viewportId);
                  return (
                    <DroppableViewportSlot
                      key={dataViewport}
                      dataViewport={dataViewport}
                      viewportId={viewportId}
                      slot={slot}
                      isSelected={selectedViewportId === viewportId}
                      show={
                        dataViewport === "axial" ||
                        (dataViewport === "sagittal" &&
                          (layout === "2x1" ||
                            layout === "1x2" ||
                            layout === "2x2" ||
                            layout === "3x1" ||
                            layout === "1x3")) ||
                        (dataViewport === "coronal" &&
                          (layout === "2x2" || layout === "3x1" || layout === "1x3")) ||
                        (dataViewport === "axial2" && layout === "2x2")
                      }
                      onSelect={() => setSelectedViewportId(viewportId)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <DropProjectionModal
            open={dropModal.open}
            seriesLabel={dropModal.open ? dropModal.seriesId : undefined}
            showFillOtherSlots={
              dropModal.open
                ? (() => {
                    if (layout === "1x1") return false;
                    const emptyCount = slots.filter(
                      (s) => s.seriesId === null && s.viewportId !== dropModal.targetSlotId
                    ).length;
                    if (emptyCount === 0) return false;
                    if (layout === "2x2") return true;
                    if (layout === "2x1" || layout === "1x2") {
                      const visibleIds = [VIEWPORT_IDS.CT_AXIAL, VIEWPORT_IDS.CT_SAGITTAL];
                      const otherVisible = visibleIds.find((id) => id !== dropModal.targetSlotId);
                      return otherVisible != null && slots.find((s) => s.viewportId === otherVisible)?.seriesId == null;
                    }
                    return false;
                  })()
                : false
            }
            onConfirm={handleDropConfirm}
            onCancel={() => setDropModal({ open: false })}
          />
        </div>
      </DndContext>
    </>
  );
}
