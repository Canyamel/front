"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  geometryLoader,
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
  synchronizers,
  CrosshairsTool,
  LengthTool,
  EllipticalROITool,
  RectangleROITool,
  segmentation,
  utilities: toolsUtilities,
  Enums: ToolsEnums,
} = cornerstoneTools;

const { MouseBindings } = ToolsEnums;
const { createCameraPositionSynchronizer, createVOISynchronizer } = cornerstoneTools.synchronizers;

const PACS = "/pacs/ID1/P1/E1/S2";
const SLICE_START = 994;
const SLICE_END = 1985;
const VIEWPORT_SIZE = 512;

const RENDERING_ENGINE_ID = "pet-ct-viewer";
const CT_VOLUME_ID = "ct-volume";
const CT_TOOL_GROUP_ID = "ct-toolgroup";

const VIEWPORT_IDS = {
  CT_AXIAL: "CT_AXIAL",
  CT_SAGITTAL: "CT_SAGITTAL",
  CT_CORONAL: "CT_CORONAL",
} as const;

const TOOLS = ["WindowLevel", "Crosshairs", "Length", "RectangleROI", "EllipseROI"] as const;

const CT_WINDOW_LOWER = 40 - 400 / 2; // -160
const CT_WINDOW_UPPER = 40 + 400 / 2; // 240

/** Fallback imagePlaneModule provider when DICOM metadata is not yet loaded (e.g. wadouri). */
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

export default function PetCtViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<(typeof TOOLS)[0]>("WindowLevel");
  const [frameOfReferenceUID, setFrameOfReferenceUID] = useState<string | null>(null);
  const [selectedSegmentInfo, setSelectedSegmentInfo] = useState<{
    segmentIndex: number;
    label: string;
    color: string;
    pointCount?: number;
    contourCount?: number;
  } | null>(null);
  const toolGroupRef = useRef<ReturnType<typeof ToolGroupManager.getToolGroup> | null>(null);

  const setTool = useCallback((tool: (typeof TOOLS)[0]) => {
    const tg = toolGroupRef.current;
    if (!tg) return;

    tg.setToolPassive(CrosshairsTool.toolName);
    tg.setToolDisabled(LengthTool.toolName);
    tg.setToolDisabled(EllipticalROITool.toolName);
    tg.setToolDisabled(RectangleROITool.toolName);
    tg.setToolDisabled(WindowLevelTool.toolName);

    if (tool === "WindowLevel") {
      tg.setToolPassive(CrosshairsTool.toolName);
      tg.setToolDisabled(LengthTool.toolName);
      tg.setToolDisabled(EllipticalROITool.toolName);
      tg.setToolPassive(RectangleROITool.toolName);
      tg.setToolActive(WindowLevelTool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });
    } else if (tool === "Crosshairs") {
      tg.setToolDisabled(WindowLevelTool.toolName);
      tg.setToolDisabled(LengthTool.toolName);
      tg.setToolDisabled(EllipticalROITool.toolName);
      tg.setToolDisabled(RectangleROITool.toolName);
      tg.setToolActive(CrosshairsTool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });
    } else if (tool === "Length") {
      tg.setToolDisabled(WindowLevelTool.toolName);
      tg.setToolDisabled(CrosshairsTool.toolName);
      tg.setToolDisabled(EllipticalROITool.toolName);
      tg.setToolDisabled(RectangleROITool.toolName);
      tg.setToolActive(LengthTool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });
    } else if (tool === "RectangleROI") {
      tg.setToolDisabled(WindowLevelTool.toolName);
      tg.setToolDisabled(CrosshairsTool.toolName);
      tg.setToolDisabled(LengthTool.toolName);
      tg.setToolDisabled(EllipticalROITool.toolName);
      tg.setToolActive(RectangleROITool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });
    } else {
      tg.setToolDisabled(WindowLevelTool.toolName);
      tg.setToolDisabled(CrosshairsTool.toolName);
      tg.setToolDisabled(LengthTool.toolName);
      tg.setToolDisabled(RectangleROITool.toolName);
      tg.setToolActive(EllipticalROITool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });
    }
    setActiveTool(tool);
  }, []);

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

        const baseUrl = window.location.origin + PACS;
        const imageIds = Array.from(
          { length: SLICE_END - SLICE_START + 1 },
          (_, i) => `wadouri:${baseUrl}/I${SLICE_START + i}`
        );

        await coreInit({
          rendering: { renderingEngineMode: Enums.RenderingEngineModeEnum.ContextPool },
          debug: { statsOverlay: false },
        });

        dicomImageLoaderInit({
          maxWebWorkers: navigator.hardwareConcurrency ?? 1,
        });

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

        const n = imageIds.length;
        const indices = new Set<number>();
        for (let i = 0; i < Math.min(30, n); i++) indices.add(i);
        for (let i = Math.floor(n / 2) - 15; i < Math.floor(n / 2) + 15 && i < n; i++)
          if (i >= 0) indices.add(i);
        for (let i = n - 1; i >= n - 30 && i >= 0; i--) indices.add(i);
        const toPreload = [...indices].map((i) => imageIds[i]);
        await Promise.allSettled(toPreload.map((id) => imageLoader.loadImage(id)));
        const ctVolume = await volumeLoader.createAndCacheVolumeFromImages(CT_VOLUME_ID, imageIds);

        const removeFallbackProvider = createVolumeImagePlaneFallbackProvider(CT_VOLUME_ID);

        const viewerInput: PublicViewportInput[] = [
          {
            viewportId: VIEWPORT_IDS.CT_AXIAL,
            element: el1,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.AXIAL },
          },
          {
            viewportId: VIEWPORT_IDS.CT_SAGITTAL,
            element: el2,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.SAGITTAL },
          },
          {
            viewportId: VIEWPORT_IDS.CT_CORONAL,
            element: el3,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.CORONAL },
          },
        ];

        renderingEngine.setViewports(viewerInput);

        await ctVolume.load();
        await setVolumesForViewports(
          renderingEngine,
          [{ volumeId: CT_VOLUME_ID, callback: setCtTransferFunction }],
          [VIEWPORT_IDS.CT_AXIAL, VIEWPORT_IDS.CT_SAGITTAL, VIEWPORT_IDS.CT_CORONAL],
          true,
          true
        );

        const axialVpForUID = renderingEngine.getViewport(VIEWPORT_IDS.CT_AXIAL);
        const forUID = axialVpForUID?.getFrameOfReferenceUID?.() ?? (ctVolume as { metadata?: { FrameOfReferenceUID?: string } }).metadata?.FrameOfReferenceUID;
        if (forUID) setFrameOfReferenceUID(forUID);

        const viewportColors: Record<string, string> = {
          [VIEWPORT_IDS.CT_AXIAL]: "rgb(200, 0, 0)",
          [VIEWPORT_IDS.CT_SAGITTAL]: "rgb(200, 200, 0)",
          [VIEWPORT_IDS.CT_CORONAL]: "rgb(0, 200, 0)",
        };

        const crosshairsConfig = {
          getReferenceLineColor: (id: string) => viewportColors[id] ?? "rgb(0, 200, 0)",
          getReferenceLineControllable: () => true,
          getReferenceLineDraggableRotatable: () => true,
          getReferenceLineSlabThicknessControlsOn: () => true,
          filterActorUIDsToSetSlabThickness: [CT_VOLUME_ID],
        };

        const axialSync = createCameraPositionSynchronizer("axial-sync");
        const sagittalSync = createCameraPositionSynchronizer("sagittal-sync");
        const coronalSync = createCameraPositionSynchronizer("coronal-sync");
        [VIEWPORT_IDS.CT_AXIAL].forEach((id) =>
          axialSync.add({ renderingEngineId: RENDERING_ENGINE_ID, viewportId: id })
        );
        [VIEWPORT_IDS.CT_SAGITTAL].forEach((id) =>
          sagittalSync.add({ renderingEngineId: RENDERING_ENGINE_ID, viewportId: id })
        );
        [VIEWPORT_IDS.CT_CORONAL].forEach((id) =>
          coronalSync.add({ renderingEngineId: RENDERING_ENGINE_ID, viewportId: id })
        );

        const ctVoiSync = createVOISynchronizer("ct-voi-sync", {
          syncInvertState: false,
          syncColormap: false,
        });
        [VIEWPORT_IDS.CT_AXIAL, VIEWPORT_IDS.CT_SAGITTAL, VIEWPORT_IDS.CT_CORONAL].forEach(
          (id) => ctVoiSync.add({ renderingEngineId: RENDERING_ENGINE_ID, viewportId: id })
        );

        const toolGroup = ToolGroupManager.createToolGroup(CT_TOOL_GROUP_ID)!;
        toolGroupRef.current = toolGroup;

        toolGroup.addViewport(VIEWPORT_IDS.CT_AXIAL, RENDERING_ENGINE_ID);
        toolGroup.addViewport(VIEWPORT_IDS.CT_SAGITTAL, RENDERING_ENGINE_ID);
        toolGroup.addViewport(VIEWPORT_IDS.CT_CORONAL, RENDERING_ENGINE_ID);

        toolGroup.addTool(PanTool.toolName);
        toolGroup.addTool(ZoomTool.toolName);
        toolGroup.addTool(StackScrollTool.toolName);
        toolGroup.addTool(CrosshairsTool.toolName, crosshairsConfig);
        toolGroup.addTool(LengthTool.toolName, { volumeId: CT_VOLUME_ID });
        toolGroup.addTool(RectangleROITool.toolName, { volumeId: CT_VOLUME_ID });
        toolGroup.addTool(EllipticalROITool.toolName);
        toolGroup.addTool(WindowLevelTool.toolName);

        toolGroup.setToolActive(WindowLevelTool.toolName, {
          bindings: [{ mouseButton: MouseBindings.Primary }],
        });
        toolGroup.setToolActive(PanTool.toolName, {
          bindings: [{ mouseButton: MouseBindings.Auxiliary }],
        });
        toolGroup.setToolActive(ZoomTool.toolName, {
          bindings: [{ mouseButton: MouseBindings.Secondary }],
        });
        toolGroup.setToolActive(StackScrollTool.toolName, {
          bindings: [{ mouseButton: MouseBindings.Wheel }],
        });
        toolGroup.setToolPassive(CrosshairsTool.toolName);

        const viewports = [VIEWPORT_IDS.CT_AXIAL, VIEWPORT_IDS.CT_SAGITTAL, VIEWPORT_IDS.CT_CORONAL];
        viewports.forEach((id) => {
          renderingEngine.getViewport(id)?.resetCamera?.();
        });

        renderingEngine.resize(true, true);
        renderingEngine.renderViewports(viewports);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        let removeClickHandlers: (() => void) | undefined;
        if (forUID) {
          try {
            const axialVp = renderingEngine.getViewport(VIEWPORT_IDS.CT_AXIAL);
            const fp = axialVp?.getCamera().focalPoint as [number, number, number];
            const s = 40;
            const demoContourSet = {
              id: "demo-segment-1",
              frameOfReferenceUID: forUID,
              color: [255, 0, 0] as [number, number, number],
              segmentIndex: 1,
              data: [
                {
                  points: [
                    [fp[0] - s, fp[1] - s, fp[2]],
                    [fp[0] + s, fp[1] - s, fp[2]],
                    [fp[0] + s, fp[1] + s, fp[2]],
                    [fp[0] - s, fp[1] + s, fp[2]],
                  ] as [number, number, number][],
                  type: Enums.ContourType.CLOSED_PLANAR,
                  color: [255, 0, 0] as [number, number, number],
                  segmentIndex: 1,
                },
              ],
            };
            geometryLoader.createAndCacheGeometry(demoContourSet.id, {
              type: Enums.GeometryType.CONTOUR,
              geometryData: demoContourSet,
            });
            const DEMO_SEGMENTATION_ID = "demo-segmentation";
            segmentation.addSegmentations([
              {
                segmentationId: DEMO_SEGMENTATION_ID,
                representation: {
                  type: ToolsEnums.SegmentationRepresentations.Contour,
                  data: { geometryIds: [demoContourSet.id] },
                },
              },
            ]);
            await segmentation.addContourRepresentationToViewportMap({
              [VIEWPORT_IDS.CT_AXIAL]: [{ segmentationId: DEMO_SEGMENTATION_ID }],
              [VIEWPORT_IDS.CT_SAGITTAL]: [{ segmentationId: DEMO_SEGMENTATION_ID }],
              [VIEWPORT_IDS.CT_CORONAL]: [{ segmentationId: DEMO_SEGMENTATION_ID }],
            });
            renderingEngine.renderViewports(viewports);

            setSelectedSegmentInfo({
              segmentIndex: 1,
              label: "Демо квадрат 80×80 мм",
              color: "rgb(255, 0, 0)",
              pointCount: 4,
              contourCount: 1,
            });
            removeClickHandlers = () => {};
          } catch (e) {
            console.error("Demo segment error:", e);
            setError(prev => prev ?? (e instanceof Error ? e.message : String(e)));
          }
        }

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
          ro.disconnect();
          removeFallbackProvider?.();
          removeClickHandlers?.();
          ToolGroupManager.destroyToolGroup(CT_TOOL_GROUP_ID);
          renderingEngine.destroy();
          toolGroupRef.current = null;
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
  }, [ready]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
        minHeight: VIEWPORT_SIZE + 100,
      }}
    >
      {error && (
        <div style={{ color: "#c00", padding: 8, background: "#fee" }}>
          Ошибка: {error}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <label htmlFor="tool-select">Инструмент:</label>
        <select
          id="tool-select"
          value={activeTool}
          onChange={(e) => setTool(e.target.value as (typeof TOOLS)[0])}
          style={{ padding: "4px 8px" }}
        >
          {TOOLS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#666" }}>
          Демо: красный контур 80×80 мм. Клик по сегменту — выбор и подсветка.
        </span>
        {selectedSegmentInfo && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "6px 10px",
              background: "#f0f8ff",
              borderRadius: 4,
              border: `2px solid ${selectedSegmentInfo.color}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: selectedSegmentInfo.color,
                }}
              />
              <span style={{ fontSize: 13 }}>
                <strong>Сегмент {selectedSegmentInfo.segmentIndex}:</strong> {selectedSegmentInfo.label}
              </span>
            </div>
            {(selectedSegmentInfo.pointCount != null || selectedSegmentInfo.contourCount != null) && (
              <div style={{ fontSize: 11, color: "#555" }}>
                {selectedSegmentInfo.contourCount != null && (
                  <span>Контуров: {selectedSegmentInfo.contourCount}</span>
                )}
                {selectedSegmentInfo.pointCount != null && (
                  <span style={{ marginLeft: selectedSegmentInfo.contourCount != null ? 12 : 0 }}>
                    Точек: {selectedSegmentInfo.pointCount}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        {frameOfReferenceUID && (
          <div style={{ fontSize: 12, color: "#666", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis" }}>
            frameOfReferenceUID:{" "}
            <code title={frameOfReferenceUID} style={{ fontSize: 11, background: "#f5f5f5", padding: "2px 4px" }}>
              {frameOfReferenceUID.length > 50 ? frameOfReferenceUID.slice(0, 50) + "…" : frameOfReferenceUID}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(frameOfReferenceUID)}
              style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px" }}
            >
              Копировать
            </button>
          </div>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          flex: 1,
          height: VIEWPORT_SIZE,
          minHeight: VIEWPORT_SIZE,
        }}
      >
        <div
          data-viewport="axial"
          style={{
            width: "100%",
            height: "100%",
            minWidth: 256,
            minHeight: 256,
            backgroundColor: "#000",
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
        <div
          data-viewport="sagittal"
          style={{
            width: "100%",
            height: "100%",
            minWidth: 256,
            minHeight: 256,
            backgroundColor: "#000",
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
        <div
          data-viewport="coronal"
          style={{
            width: "100%",
            height: "100%",
            minWidth: 256,
            minHeight: 256,
            backgroundColor: "#000",
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}
