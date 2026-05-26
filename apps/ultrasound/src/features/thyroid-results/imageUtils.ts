export const getFileExtension = (url: string): string => {
  if (!url) return "";
  const withoutQuery = url.split("?")[0].split("#")[0];
  const parts = withoutQuery.split(".");
  if (parts.length < 2) return "";
  return parts.pop()?.toLowerCase() || "";
};

export const isTiffUrl = (url: string): boolean => {
  const ext = getFileExtension(url);
  return ext === "tiff" || ext === "tif";
};

export const isDicomUrl = (url: string): boolean => {
  const ext = getFileExtension(url);
  return ext === "dcm" || ext === "dicom" || ext === "";
};

export const getImageDimensions = (
  url: string
): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};
