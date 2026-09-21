import { useState, useCallback } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { ZoomIn, ZoomOut, RotateCw, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useUiTranslations } from "../../hooks/useUiTranslations";
import { toast } from "@flaner/shared/utils";
import { getCroppedImg } from "../../utils/cropImage";
import { imageCropperModalStyles } from "./ImageCropperModal.styles";

export type ImageCropperLabels = {
  title?: string;
  description?: string;
  zoom?: string;
  rotate?: string;
  cancel?: string;
  apply?: string;
  processing?: string;
  cropError?: string;
};

export type ImageCropperModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  cropShape?: "round" | "rect";
  aspect?: number;
  outputSize?: { width: number; height: number };
  fileName?: string;
  labels?: Partial<ImageCropperLabels>;
  onCropComplete: (croppedFile: File) => void;
  onCancel?: () => void;
};

type ImageCropperContentProps = {
  imageSrc: string;
  cropShape: "round" | "rect";
  aspect: number;
  outputSize: { width: number; height: number };
  fileName: string;
  labels?: Partial<ImageCropperLabels>;
  onCropComplete: (croppedFile: File) => void;
  onCancel?: () => void;
  onOpenChange: (open: boolean) => void;
};

const ImageCropperContent = ({
  imageSrc,
  cropShape,
  aspect,
  outputSize,
  fileName,
  labels,
  onCropComplete,
  onCancel,
  onOpenChange,
}: ImageCropperContentProps) => {
  const { t } = useUiTranslations();

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApply = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, {
        rotation,
        outputSize,
        fileName,
        mimeType: "image/webp",
      });

      onCropComplete(croppedFile);
      onOpenChange(false);
    } catch {
      toast.failure(labels?.cropError || t("imageCropper.cropError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <DialogContent className={imageCropperModalStyles.dialogContent}>
      <DialogHeader>
        <DialogTitle>
          {labels?.title || t("imageCropper.title")}
        </DialogTitle>
        <DialogDescription>
          {labels?.description || t("imageCropper.description")}
        </DialogDescription>
      </DialogHeader>

      <div className={imageCropperModalStyles.cropperWrapper}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          cropShape={cropShape}
          showGrid={cropShape === "rect"}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className={imageCropperModalStyles.controlsContainer}>
        {/* Zoom Control */}
        <div className={imageCropperModalStyles.sliderRow}>
          <ZoomOut className="size-4 shrink-0" aria-hidden="true" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            aria-label={labels?.zoom || t("imageCropper.zoom")}
            onChange={(e) => setZoom(Number(e.target.value))}
            className={imageCropperModalStyles.slider}
          />
          <ZoomIn className="size-4 shrink-0" aria-hidden="true" />
        </div>

        {/* Additional Actions (Rotation) */}
        <div className={imageCropperModalStyles.actionsRow}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className="text-xs flex items-center gap-1.5"
          >
            <RotateCw className="size-3.5" />
            {labels?.rotate || t("imageCropper.rotate")}
          </Button>
        </div>
      </div>

      <DialogFooter className={imageCropperModalStyles.footer}>
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          disabled={isProcessing}
        >
          {labels?.cancel || t("imageCropper.cancel")}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleApply}
          disabled={isProcessing || !croppedAreaPixels}
        >
          {isProcessing ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              {labels?.processing || t("imageCropper.processing")}
            </>
          ) : (
            labels?.apply || t("imageCropper.apply")
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export const ImageCropperModal = ({
  open,
  onOpenChange,
  imageSrc,
  cropShape = "round",
  aspect = 1,
  outputSize = { width: 512, height: 512 },
  fileName = "avatar.webp",
  labels,
  onCropComplete,
  onCancel,
}: ImageCropperModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && imageSrc ? (
        <ImageCropperContent
          key={imageSrc}
          imageSrc={imageSrc}
          cropShape={cropShape}
          aspect={aspect}
          outputSize={outputSize}
          fileName={fileName}
          labels={labels}
          onCropComplete={onCropComplete}
          onCancel={onCancel}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
};

export default ImageCropperModal;
