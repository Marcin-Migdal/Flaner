import { useAuth } from "@flaner/shared/context";
import {
  BigCalendar,
  Button,
  CalendarEvent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FormDatePicker,
  FormTextArea,
  FormTextField,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO, startOfToday } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import type { SchedulerEvent } from "../../api/events/types";
import { useCreateEventMutation, useUpdateEventMutation } from "../../hooks/api/mutation";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { CreateSchedulerFormData, getCreateSchedulerSchema } from "../../utils/schemas/create-scheduler-schema";
import { ParticipantSelect } from "./components";
import { getRandomSlotColor } from "./utils";

export type EventModalProps = {
  trigger?: React.ReactNode;
  eventToEdit?: SchedulerEvent | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (event?: SchedulerEvent) => void;
};

export const EventModal = ({
  trigger,
  eventToEdit,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess: externalOnSuccess,
}: EventModalProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof externalIsOpen === "boolean";
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;

  const [showMobileCalendar, setShowMobileCalendar] = useState(false);
  const [selectedRange, setSelectedRange] = useState<[Date, Date?] | null>(null);

  const methods = useForm<CreateSchedulerFormData>({
    resolver: zodResolver(getCreateSchedulerSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      endDate: new Date(),
      participants: user ? [user.uid] : [],
      proposedDates: [],
    },
  });

  const { mutateAsync: createEvent, isPending: isCreating } = useCreateEventMutation();
  const { mutateAsync: updateEvent, isPending: isUpdating } = useUpdateEventMutation();
  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        methods.reset({
          name: eventToEdit.name,
          description: eventToEdit.description || "",
          endDate: eventToEdit.endDate ? parseISO(eventToEdit.endDate) : undefined,
          participants: eventToEdit.participants,
          proposedDates: eventToEdit.proposedDates.map((d) => ({
            start: parseISO(d.start),
            end: parseISO(d.end),
            color: d.color,
          })),
        });
      } else {
        methods.reset({
          name: "",
          description: "",
          endDate: new Date(),
          participants: user ? [user.uid] : [],
          proposedDates: [],
        });
      }
    }
  }, [isOpen, eventToEdit, user, methods]);

  const onSubmit = async (data: CreateSchedulerFormData) => {
    if (!user) return;

    const formattedDates = data.proposedDates.map((d) => ({
      start: format(d.start, "yyyy-MM-dd"),
      end: format(d.end, "yyyy-MM-dd"),
      color: d.color,
    }));

    if (eventToEdit) {
      await updateEvent(
        {
          eventId: eventToEdit.id,
          data: {
            name: data.name,
            description: data.description || "",
            endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
            participants: data.participants,
            proposedDates: formattedDates,
          },
        },
        {
          onSuccess: () => {
            handleOpenChange(false);
            externalOnSuccess?.(eventToEdit);
          },
        },
      );
    } else {
      await createEvent(
        {
          name: data.name,
          description: data.description || "",
          endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
          participants: data.participants,
          proposedDates: formattedDates,
        },
        {
          onSuccess: (createdEvent) => {
            handleOpenChange(false);
            externalOnSuccess?.(createdEvent);
          },
        },
      );
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (externalOnOpenChange) {
      externalOnOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }

    if (!open) {
      methods.reset();
      setSelectedRange(null);
      setShowMobileCalendar(false);
    }
  };

  const handleDateChange = (range: [Date, Date?] | null) => {
    setSelectedRange(range);

    if (range && range[0] && range[1]) {
      const currentDates = methods.getValues("proposedDates") || [];
      const color = getRandomSlotColor(range[0], range[1], currentDates);
      const newRange = { start: range[0], end: range[1], color };

      methods.setValue("proposedDates", [...currentDates, newRange], { shouldValidate: true });
      setSelectedRange(null);
    }
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentDates = methods.getValues("proposedDates") || [];
    const indexToRemove = typeof event.id === "string" ? parseInt(event.id, 10) : event.id;
    const newDates = currentDates.filter((_, idx) => idx !== indexToRemove);
    methods.setValue("proposedDates", newDates, { shouldValidate: false });
  };

  const rawProposedDates = useWatch({ control: methods.control, name: "proposedDates" });

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const dates = rawProposedDates || [];
    return dates.map((d, index) => ({
      id: index.toString(),
      title: `${format(d.start, "MMM dd")} - ${format(d.end, "MMM dd")}`,
      start: d.start,
      end: d.end,
      color: d.color,
    }));
  }, [rawProposedDates]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !isControlled && (
        <DialogTrigger asChild>
          <Button size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100vw-0.5rem)] max-w-[calc(100vw-0.5rem)] max-md:h-[calc(100dvh-0.5rem)] max-md:max-h-[calc(100dvh-0.5rem)] sm:max-w-[1000px] md:max-w-[1200px] lg:max-w-[1640px] md:w-[95vw] p-0 gap-0 overflow-hidden bg-background">
        <DialogHeader className="px-4 py-4 md:px-6 md:pt-6 md:pb-4 border-b">
          <DialogTitle>{eventToEdit ? t("edit.title") : t("create.title")}</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-[360px_1fr] lg:grid-cols-[420px_1fr] md:h-[850px] lg:h-[950px] max-md:h-[calc(100dvh-5rem)] max-h-[95vh]"
          >
            <div
              className={`p-3 md:p-6 border-r overflow-y-auto flex-col gap-6 ${showMobileCalendar ? "hidden md:flex" : "flex"}`}
            >
              <div className="space-y-4">
                <FormTextField name="name" label={t("fields.name")} placeholder={t("fields.name")} />
                <FormTextArea
                  name="description"
                  label={t("fields.description")}
                  placeholder={t("fields.description")}
                  style={{ resize: "none" }}
                />
                <FormDatePicker name="endDate" label={t("fields.endDate")} />
              </div>

              <ParticipantSelect
                creatorId={eventToEdit ? eventToEdit.creatorId : user?.uid}
                initialParticipantIds={eventToEdit?.participants}
              />

              <div className="mt-auto pt-6 flex flex-col gap-4">
                {!showMobileCalendar && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full md:hidden"
                    onClick={() => setShowMobileCalendar(true)}
                  >
                    {t("create.proposeDates")}
                  </Button>
                )}

                <div className="flex flex-col gap-2">
                  {methods.formState.errors.proposedDates && (
                    <p className="text-sm font-medium text-destructive text-right">
                      {methods.formState.errors.proposedDates.message}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                      {isSaving ? t("actions.saving") : eventToEdit ? t("actions.save") : t("actions.add")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`bg-muted/10 flex-col p-3.5 md:p-6 overflow-hidden w-full flex-1 min-h-0 ${showMobileCalendar ? "flex" : "hidden md:flex"}`}
            >
              <div className="md:hidden flex items-center mb-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileCalendar(false)}
                  className="mr-2 -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h3 className="font-semibold text-sm">{t("create.proposeDates")}</h3>
              </div>
              <h3 className="font-semibold mb-4 text-sm hidden md:block">{t("create.proposeDates")}</h3>
              <div className="h-full bg-background rounded-xl border shadow-sm flex flex-col overflow-auto">
                <BigCalendar
                  fitContainer
                  view="month"
                  views={["month"]}
                  maxEventsPerDay={2}
                  selectionMode="range"
                  selectedDate={selectedRange}
                  events={calendarEvents}
                  disabledDates={{ before: startOfToday() }}
                  onDateChange={handleDateChange}
                  onEventClick={handleEventClick}
                />
              </div>

              <div className="mt-6 flex md:hidden flex-col gap-2">
                {methods.formState.errors.proposedDates && (
                  <p className="text-sm font-medium text-destructive text-right">
                    {methods.formState.errors.proposedDates.message}
                  </p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                    {isSaving ? t("actions.saving") : eventToEdit ? t("actions.save") : t("actions.add")}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
