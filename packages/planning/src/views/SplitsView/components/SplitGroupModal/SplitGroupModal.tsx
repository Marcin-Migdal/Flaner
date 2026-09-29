import { useAuth } from "@flaner/shared/context";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FormSelect,
  FormSwitch,
  FormTextArea,
  FormTextField,
  type SelectOption,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { SplitGroup } from "../../../../api/splits";
import { ParticipantSelect } from "../../../../components/ParticipantSelect";
import { useCreateSplitGroupMutation, useUpdateSplitGroupMutation } from "../../../../hooks/api/mutation";
import { useCurrencyOptions } from "../../../../hooks/useCurrencyOptions";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { DEFAULT_CURRENCY } from "../../../../utils/money";
import { getSplitGroupSchema, type SplitGroupFormData } from "../../../../utils/schemas";
import { splitGroupModalStyles as styles } from "./SplitGroupModal.styles";

const buildDefaultValues = (group: SplitGroup | null, currentUserId: string | undefined): SplitGroupFormData => ({
  name: group?.name ?? "",
  description: group?.description ?? "",
  defaultCurrency: group?.defaultCurrency ?? DEFAULT_CURRENCY,
  participants: group?.participants ?? (currentUserId ? [currentUserId] : []),
  simplifyDebts: group?.simplifyDebts ?? false,
});

export type SplitGroupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupToEdit?: SplitGroup | null;
  onSuccess?: (groupId: string) => void;
};

export const SplitGroupModal = ({ open, onOpenChange, groupToEdit = null, onSuccess }: SplitGroupModalProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const currencyOptions = useCurrencyOptions();
  const isEdit = groupToEdit !== null;

  const { mutateAsync: createGroup, isPending: isCreating } = useCreateSplitGroupMutation();
  const { mutateAsync: updateGroup, isPending: isUpdating } = useUpdateSplitGroupMutation();
  const isPending = isCreating || isUpdating;

  const methods = useForm<SplitGroupFormData>({
    resolver: zodResolver(getSplitGroupSchema(t, isEdit ? "edit" : "create")),
    defaultValues: buildDefaultValues(groupToEdit, user?.uid),
  });

  useEffect(() => {
    if (open) {
      methods.reset(buildDefaultValues(groupToEdit, user?.uid));
    }
  }, [open, groupToEdit, user?.uid, methods]);

  const onSubmit = async (data: SplitGroupFormData) => {
    try {
      if (groupToEdit) {
        await updateGroup(
          {
            groupId: groupToEdit.id,
            data: {
              name: data.name,
              description: data.description,
              defaultCurrency: data.defaultCurrency,
              simplifyDebts: data.simplifyDebts ?? false,
            },
          },
          {
            onSuccess: () => {
              onOpenChange(false);
              onSuccess?.(groupToEdit.id);
            },
          },
        );
        return;
      }

      await createGroup(data, {
        onSuccess: (group) => {
          onOpenChange(false);
          onSuccess?.(group.id);
        },
      });
    } catch {
      // Handled by mutation's global onError toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{isEdit ? t("splits.groupModal.editTitle") : t("splits.groupModal.title")}</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <div className={styles.form}>
              <div className={styles.row}>
                <FormTextField name="name" label={t("splits.fields.name")} placeholder={t("splits.fields.name")} />
                <FormSelect
                  name="defaultCurrency"
                  label={t("splits.fields.defaultCurrency")}
                  options={currencyOptions}
                  formatOptionLabel={(option: SelectOption, { context }) =>
                    context === "value" ? option.value : option.label
                  }
                />
              </div>
              <FormTextArea
                name="description"
                label={t("splits.fields.description")}
                placeholder={t("splits.fields.description")}
                style={{ resize: "none" }}
              />
              <FormSwitch
                name="simplifyDebts"
                label={t("splits.balances.simplify")}
                description={t("splits.balances.simplifyDesc")}
              />
              {!isEdit && (
                <>
                  <ParticipantSelect
                    creatorId={user?.uid}
                    label={t("splits.groupModal.participants")}
                    searchPlaceholder={t("splits.groupModal.searchFriends")}
                  />
                  {methods.formState.errors.participants && (
                    <p className={styles.error}>{methods.formState.errors.participants.message}</p>
                  )}
                </>
              )}
            </div>

            <div className={styles.footer}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("splits.actions.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending}>
                {isEdit ? t("splits.actions.save") : t("splits.actions.createGroup")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
