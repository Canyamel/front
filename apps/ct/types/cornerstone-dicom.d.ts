declare module "@cornerstonejs/dicom-image-loader" {
  interface DicomImageLoaderConfig {
    maxWebWorkers?: number;
    startWebWorkersOnDemand?: boolean;
  }

  export function init(config?: DicomImageLoaderConfig): void;
}
