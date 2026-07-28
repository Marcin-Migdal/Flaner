import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  FormTextField,
  FormTextArea,
  FormSelect,
  FormSwitch,
  FormImagePicker,
} from "@flaner-v2/ui-components";
import { createGroupSchema, type CreateGroupSchema } from "../utils/schemas/groups";
import { useCreateGroupMutation } from "../hooks";
import { uploadToCloudinary, toast, compressImage, ONE_MB } from "@flaner-v2/shared";
import { useCommunityTranslations } from "../hooks/useCommunityTranslations";

export interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupModal({ open, onOpenChange }: CreateGroupModalProps) {
  const { t } = useCommunityTranslations();
  const { mutateAsync: createGroup, isPending: isCreating } = useCreateGroupMutation();
  const [isUploading, setIsUploading] = useState(false);
  const isPending = isCreating || isUploading;

  const methods = useForm<CreateGroupSchema>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "private",
      requiresApproval: false,
      avatarUrl: "",
    },
  });

  const { handleSubmit, watch, reset, control } = methods;
  const groupType = watch("type");

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        description: "",
        type: "private",
        requiresApproval: false,
        avatarUrl: "",
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateGroupSchema) => {
    try {
      setIsUploading(true);
      let finalAvatarUrl: string | null = null;
      
      if (data.avatarUrl instanceof File) {
        const compressed = await compressImage(data.avatarUrl, ONE_MB);
        finalAvatarUrl = await uploadToCloudinary(compressed);
      } else if (typeof data.avatarUrl === "string" && data.avatarUrl) {
        finalAvatarUrl = data.avatarUrl;
      }
      
      const payload = {
        ...data,
        description: data.description || "",
        avatarUrl: finalAvatarUrl,
      };

      await createGroup(payload);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create group", error);
      toast.failure(t("groupsView.createModal.error"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("groupsView.createModal.title")}</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormImagePicker
              control={control as any}
              name="avatarUrl"
              label={t("groupsView.createModal.avatarLabel")}
              disabled={isPending}
              maxSize={ONE_MB}
            />

            <FormTextField
              control={control as any}
              name="name"
              label={t("groupsView.createModal.nameLabel")}
              placeholder={t("groupsView.createModal.namePlaceholder")}
              disabled={isPending}
            />

            <FormTextArea
              control={control as any}
              name="description"
              label={t("groupsView.createModal.descLabel")}
              placeholder={t("groupsView.createModal.descPlaceholder")}
              disabled={isPending}
              rows={3}
            />

            <FormSelect
              control={control as any}
              name="type"
              label={t("groupsView.createModal.typeLabel")}
              options={[
                { label: t("groupsView.createModal.typePrivate"), value: "private" },
                { label: t("groupsView.createModal.typePublic"), value: "public" },
              ]}
              disabled={isPending}
            />

            {groupType === "public" && (
              <FormSwitch
                control={control as any}
                name="requiresApproval"
                label={t("groupsView.createModal.requiresApprovalLabel")}
                description={t("groupsView.createModal.requiresApprovalDesc")}
                disabled={isPending}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("groupsView.createModal.cancel")}
              </Button>
              <Button type="submit" isBusy={isPending}>
                {t("groupsView.createModal.submit")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export default CreateGroupModal;
