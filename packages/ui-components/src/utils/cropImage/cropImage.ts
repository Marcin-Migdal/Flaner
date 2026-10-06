import type { Area } from "react-easy-crop";

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getRadianAngle = (degreeValue: number): number => {
  return (degreeValue * Math.PI) / 180;
};

/**
 * Returns the bounding box size of a rotated rectangle.
 */
const rotateSize = (width: number, height: number, rotation: number): { width: number; height: number } => {
  const rotRad = getRadianAngle(rotation);

  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

export type CropImageOptions = {
  rotation?: number;
  flip?: { horizontal: boolean; vertical: boolean };
  fileName?: string;
  mimeType?: "image/webp" | "image/jpeg" | "image/png";
  quality?: number;
  outputSize?: { width: number; height: number };
};

/**
 * Crops and rotates an image source based on react-easy-crop Area coordinates,
 * returning a new File object in the specified format (default: image/webp).
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  options: CropImageOptions = {}
): Promise<File> {
  const {
    rotation = 0,
    flip = { horizontal: false, vertical: false },
    fileName = "avatar.webp",
    mimeType = "image/webp",
    quality = 0.92,
    outputSize,
  } = options;

  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.naturalWidth, image.naturalHeight, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);

  ctx.drawImage(image, 0, 0);

  const targetWidth = outputSize?.width ?? pixelCrop.width;
  const targetHeight = outputSize?.height ?? pixelCrop.height;

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("Unable to create cropped canvas context");
  }

  croppedCanvas.width = targetWidth;
  croppedCanvas.height = targetHeight;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas export produced an empty blob"));
          return;
        }
        const file = new File([blob], fileName, {
          type: mimeType,
          lastModified: Date.now(),
        });
        resolve(file);
      },
      mimeType,
      quality
    );
  });
}
