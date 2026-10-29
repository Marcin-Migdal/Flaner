/// <reference types="vite/client" />

export enum FlanerUploadPreset {
  PRODUCT_ICONS = "flaner_product_icons",
  AVATARS = "flaner_avatars",
}

export const getValidatedCloudName = (): string => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("Missing Cloudinary Cloud Name configuration (VITE_CLOUDINARY_CLOUD_NAME)");
  }
  return cloudName;
};

export const uploadToCloudinary = async (
  file: File,
  uploadPreset: string = FlanerUploadPreset.AVATARS
): Promise<string> => {
  try {
    const cloudName = getValidatedCloudName();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Nie udało się przesłać pliku na serwer Cloudinary.");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("uploadToCloudinary failed:", error);
    throw error;
  }
};

const MAX_COMPRESSION_ATTEMPTS = 5;

const getCompressionPenalty = (attempt: number): number => 
  Math.log(attempt) / Math.log(MAX_COMPRESSION_ATTEMPTS + 1);

const compressImageInternal = (originalFile: File, sizeLimit: number, attempt: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (sizeLimit <= 0) {
      return reject(new Error("Nieprawidłowy limit rozmiaru kompresji."));
    }

    if (attempt > MAX_COMPRESSION_ATTEMPTS) {
      return reject(new Error("Kompresja obrazu nie powiodła się. Plik przekracza dozwolony limit rozmiaru."));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(originalFile);
    const penalty = getCompressionPenalty(attempt);
    const quality = Math.min(Math.max(sizeLimit / originalFile.size - penalty, 0.1), 0.9);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return reject(new Error("Nie można stworzyć kontekstu graficznego 2D."));
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);

          if (!blob) {
            return reject(new Error("Konwersja obrazu do blob nie powiodła się."));
          }

          const compressedFile = new File([blob], originalFile.name, { type: "image/webp" });

          if (compressedFile.size > sizeLimit) {
            return compressImageInternal(originalFile, sizeLimit, attempt + 1)
              .then(resolve)
              .catch(reject);
          }

          resolve(compressedFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nie udało się załadować obrazu do kompresji."));
    };

    img.src = objectUrl;
  });
};

export const compressImage = (file: File, sizeLimit: number): Promise<File> => {
  return compressImageInternal(file, sizeLimit, 1);
};
export default uploadToCloudinary;
