import React, { useId, useRef, useState, useEffect } from "react";
import { Image as ImageIcon, UploadCloud, Trash2 } from "lucide-react";
import { cn, ONE_KB, ONE_MB } from "@flaner-v2/shared";
import { 
  Field, 
  FieldLabel, 
  FieldDescription, 
  FieldError 
} from "./ui/field";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "./ui/attachment";
import { useUiTranslations } from "../hooks/useUiTranslations";

export interface ImagePickerLabels {
  invalidFileType?: string;
  fileTooSmall?: string;
  fileTooLarge?: string;
  resolutionTooSmall?: string;
  resolutionTooLarge?: string;
  dimensionReadError?: string;
  fileLoadError?: string;
  networkImageDefaultName?: string;
  cloudImageDesc?: string;
  noImageSelectedTitle?: string;
  noImageSelectedDesc?: string;
  dropzoneActiveText?: string;
  dropzoneIdleText?: string;
  acceptedFormatsDesc?: string;
}

export interface ImagePickerProps {
  id?: string;
  value?: File | string | null;
  onChange?: (value: File | null) => void;
  minResolution?: { width: number; height: number };
  maxResolution?: { width: number; height: number };
  minSize?: number; // in bytes
  maxSize?: number; // in bytes
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  labels?: Partial<ImagePickerLabels>;
}

const formatSize = (bytes: number): string => {
  if (bytes >= ONE_MB) return `${(bytes / ONE_MB).toFixed(1)} MB`;
  return `${(bytes / ONE_KB).toFixed(1)} KB`;
};

export const ImagePicker = React.forwardRef<HTMLInputElement, ImagePickerProps>(
  (
    {
      id: customId,
      value,
      onChange,
      minResolution,
      maxResolution,
      minSize,
      maxSize,
      label,
      description,
      error,
      containerClassName,
      labelClassName,
      labels,
    },
    ref
  ) => {
    const defaultId = useId();
    const inputId = customId || defaultId;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [localError, setLocalError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const { t } = useUiTranslations();

    // Sync file preview object URLs
    useEffect(() => {
      let url: string | null = null;
      if (value instanceof File) {
        url = URL.createObjectURL(value);
        setPreviewUrl(url);
      } else if (typeof value === "string") {
        setPreviewUrl(value);
      } else {
        setPreviewUrl(null);
      }

      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    }, [value]);

    const validateAndProcessFile = async (file: File) => {
      setLocalError(null);

      // 1. File Type check
      if (!file.type.startsWith("image/")) {
        setLocalError(labels?.invalidFileType || t("imagePicker.invalidFileType"));
        return;
      }

      // 2. File Size check
      if (minSize !== undefined && file.size < minSize) {
        setLocalError(labels?.fileTooSmall || t("imagePicker.fileTooSmall", { size: formatSize(minSize) }));
        return;
      }
      if (maxSize !== undefined && file.size > maxSize) {
        setLocalError(labels?.fileTooLarge || t("imagePicker.fileTooLarge", { size: formatSize(maxSize) }));
        return;
      }

      // 3. Resolution check (async loading)
      if (minResolution !== undefined || maxResolution !== undefined) {
        const checkResolution = (): Promise<string | null> => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
              const img = new Image();
              img.onload = () => {
                if (minResolution) {
                  if (img.naturalWidth < minResolution.width || img.naturalHeight < minResolution.height) {
                    resolve(
                      labels?.resolutionTooSmall || t("imagePicker.resolutionTooSmall", { res: `${minResolution.width}x${minResolution.height}px` })
                    );
                    return;
                  }
                }
                if (maxResolution) {
                  if (img.naturalWidth > maxResolution.width || img.naturalHeight > maxResolution.height) {
                    resolve(
                      labels?.resolutionTooLarge || t("imagePicker.resolutionTooLarge", { res: `${maxResolution.width}x${maxResolution.height}px` })
                    );
                    return;
                  }
                }
                resolve(null);
              };
              img.onerror = () => {
                resolve(labels?.dimensionReadError || t("imagePicker.dimensionReadError"));
              };
              img.src = e.target?.result as string;
            };
            reader.onerror = () => {
              resolve(labels?.fileLoadError || t("imagePicker.fileLoadError"));
            };
            reader.readAsDataURL(file);
          });
        };

        const resError = await checkResolution();
        if (resError) {
          setLocalError(resError);
          return;
        }
      }

      // If all validations pass
      if (onChange) {
        onChange(file);
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        validateAndProcessFile(file);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        validateAndProcessFile(file);
      }
    };

    const triggerFileSelect = () => {
      fileInputRef.current?.click();
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      setLocalError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (onChange) {
        onChange(null);
      }
    };

    const activeError = error || localError;

    // Get metadata display details for preview Card
    const getAttachmentMetadata = () => {
      if (value instanceof File) {
        return {
          title: value.name,
          desc: `${fileTypeDisplay(value.type)} · ${formatSize(value.size)}`,
        };
      } else if (typeof value === "string") {
        const cleanName = value.split("/").pop()?.split("?")[0] || (labels?.networkImageDefaultName || t("imagePicker.networkImageDefaultName"));
        return {
          title: cleanName,
          desc: labels?.cloudImageDesc || t("imagePicker.cloudImageDesc"),
        };
      }
      return {
        title: labels?.noImageSelectedTitle || t("imagePicker.noImageSelectedTitle"),
        desc: labels?.noImageSelectedDesc || t("imagePicker.noImageSelectedDesc"),
      };
    };

    const fileTypeDisplay = (type: string) => {
      const sub = type.split("/")[1];
      return sub ? sub.toUpperCase() : "IMAGE";
    };

    const meta = getAttachmentMetadata();

    return (
      <Field data-invalid={!!activeError} className={containerClassName}>
        {label && (
          <FieldLabel htmlFor={inputId} className={labelClassName}>
            {label}
          </FieldLabel>
        )}

        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-stretch w-full">
          {/* Left Column: Attachment Preview */}
          <div className="flex-1 w-full max-w-md">
            {previewUrl ? (
              <Attachment state="done" className="w-full flex items-center justify-between border-solid p-2.5 h-full">
                <AttachmentMedia variant="image" className="relative group h-16! w-16! sm:h-20! sm:w-20! shrink-0">
                  <img src={previewUrl} alt="Thumbnail Preview" className="h-full w-full object-cover rounded-lg" />
                </AttachmentMedia>
                <AttachmentContent className="ml-1 select-none">
                  <AttachmentTitle className="text-foreground max-w-[200px] truncate">{meta.title}</AttachmentTitle>
                  <AttachmentDescription className="text-muted-foreground">{meta.desc}</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleRemove}
                    className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground cursor-pointer rounded-lg size-8 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ) : (
              <Attachment state="idle" className="w-full flex items-center justify-between p-2.5 h-full border-dashed">
                <AttachmentMedia variant="icon" className="bg-accent/40 text-muted-foreground">
                  <ImageIcon className="size-4" />
                </AttachmentMedia>
                <AttachmentContent className="ml-1 select-none">
                  <AttachmentTitle className="text-muted-foreground/60">{meta.title}</AttachmentTitle>
                  <AttachmentDescription>{meta.desc}</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            )}
          </div>

          {/* Right Column: Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={cn(
              "flex-1 w-full border-2 border-dashed border-border bg-card/10 hover:bg-card/30 hover:border-accent rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-200 text-center select-none min-h-[96px]",
              isDragging && "border-brand bg-brand/5 scale-[1.01]"
            )}
          >
            <input
              type="file"
              ref={(node) => {
                fileInputRef.current = node;
                if (typeof ref === "function") ref(node);
                else if (ref) ref.current = node;
              }}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              id={inputId}
            />
            <UploadCloud className={cn("size-6 text-muted-foreground mb-2 transition-colors", isDragging && "text-brand")} />
            <span className="text-xs font-semibold text-foreground/80">
              {isDragging ? (labels?.dropzoneActiveText || t("imagePicker.dropzoneActiveText")) : (labels?.dropzoneIdleText || t("imagePicker.dropzoneIdleText"))}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {labels?.acceptedFormatsDesc || t("imagePicker.acceptedFormatsDesc")}
            </span>
          </div>
        </div>

        {description && <FieldDescription>{description}</FieldDescription>}
        {activeError && <FieldError>{activeError}</FieldError>}
      </Field>
    );
  }
);

ImagePicker.displayName = "ImagePicker";
export default ImagePicker;
