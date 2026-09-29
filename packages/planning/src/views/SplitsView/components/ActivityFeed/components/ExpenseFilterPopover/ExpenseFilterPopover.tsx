import { useIsMobile } from "@flaner/shared/hooks";
import { Button, DatePicker, Popover, PopoverContent, PopoverTrigger } from "@flaner/ui-components";
import { format, parseISO } from "date-fns";
import { Filter, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "../../../../../../api/splits";
import type { SplitGroupMember } from "../../../../../../hooks/useSplitGroupMembers";
import { usePlanningTranslations } from "../../../../../../hooks/usePlanningTranslations";
import {
  expenseFilterPopoverStyles as styles,
  filterTriggerVariants,
  scopeButtonVariants,
} from "./ExpenseFilterPopover.styles";
import {
  countActiveFilters,
  DEFAULT_EXPENSE_FILTERS,
  type ExpenseFilterScope,
  type ExpenseFilters,
} from "./types";

export type ExpenseFilterPopoverProps = {
  filters: ExpenseFilters;
  onApply: (newFilters: ExpenseFilters) => void;
  members: SplitGroupMember[];
};

export const ExpenseFilterPopover = ({
  filters,
  onApply,
  members,
}: ExpenseFilterPopoverProps) => {
  const { t } = usePlanningTranslations();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ExpenseFilters>(filters);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const dateToRef = useRef<HTMLButtonElement | null>(null);
  const isMobile = useIsMobile();

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setDraft(filters);
      }
      setDateFromOpen(false);
      setDateToOpen(false);
      setOpen(isOpen);
    },
    [filters],
  );

  useEffect(() => {
    if (!open || !isMobile) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isMobile, handleOpenChange]);

  const activeCount = countActiveFilters(filters);
  const hasActiveFilters = activeCount > 0;

  const handleApply = () => {
    onApply(draft);
    setDateFromOpen(false);
    setDateToOpen(false);
    setOpen(false);
  };

  const handleResetDraft = () => {
    setDraft(DEFAULT_EXPENSE_FILTERS);
    setDateFromOpen(false);
    setDateToOpen(false);
  };

  const handleDateFromChange = (date: Date | undefined) => {
    if (!date) {
      setDateFromOpen(false);
      return;
    }
    const formatted = format(date, "yyyy-MM-dd");
    if (draft.dateFrom === formatted) {
      setDateFromOpen(false);
      return;
    }
    setDraft((prev) => {
      const isEndEarlier = prev.dateTo && prev.dateTo < formatted;
      return {
        ...prev,
        dateFrom: formatted,
        dateTo: isEndEarlier ? null : prev.dateTo,
      };
    });
    setDateFromOpen(false);
    setDateToOpen(true);
    setTimeout(() => {
      dateToRef.current?.focus();
    }, 50);
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (!date) {
      setDateToOpen(false);
      return;
    }
    const formatted = format(date, "yyyy-MM-dd");
    if (draft.dateTo === formatted) {
      setDateToOpen(false);
      return;
    }
    setDraft((prev) => ({
      ...prev,
      dateTo: formatted,
    }));
    setDateToOpen(false);
  };

  const handleClearDateFrom = () => {
    setDraft((prev) => ({ ...prev, dateFrom: null }));
    setDateFromOpen(false);
  };

  const handleClearDateTo = () => {
    setDraft((prev) => ({ ...prev, dateTo: null }));
    setDateToOpen(false);
  };

  const triggerButton = (
    <button
      type="button"
      className={filterTriggerVariants({ active: hasActiveFilters })}
      aria-label={t("splits.filters.title")}
      title={t("splits.filters.title")}
      onClick={isMobile ? () => handleOpenChange(!open) : undefined}
    >
      <Filter className="size-3.5" />
      <span className={styles.filterButtonLabel}>{t("splits.filters.button")}</span>
      {hasActiveFilters && <span className={styles.badge}>{activeCount}</span>}
    </button>
  );

  const filterContent = (
    <>
      <div className={styles.header}>
        <span className={styles.title}>{t("splits.filters.title")}</span>
        <div className="flex items-center gap-1.5">
          {countActiveFilters(draft) > 0 && (
            <span className={styles.badge}>
              {t("splits.filters.activeCount", { count: countActiveFilters(draft) })}
            </span>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              aria-label={t("splits.actions.cancel")}
              className={styles.closeButton}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Text Search */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="expense-filter-query">
          {t("splits.filters.searchLabel")}
        </label>
        <div className={styles.searchInputWrapper}>
          <Search className={styles.searchIcon} />
          <input
            id="expense-filter-query"
            type="text"
            value={draft.query}
            onChange={(e) => setDraft((prev) => ({ ...prev, query: e.target.value }))}
            placeholder={t("splits.filters.searchPlaceholder")}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* 2. Scope / Involvement */}
      <div className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>{t("splits.filters.scope")}</span>
        <div className={styles.scopeGrid}>
          {(
            [
              { value: "all", label: t("splits.filters.scopeAll") },
              { value: "paid_by_me", label: t("splits.filters.scopePaidByMe") },
              { value: "my_share", label: t("splits.filters.scopeMyShare") },
            ] as const
          ).map((scopeOption) => (
            <button
              key={scopeOption.value}
              type="button"
              className={scopeButtonVariants({ active: draft.scope === scopeOption.value })}
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  scope: scopeOption.value as ExpenseFilterScope,
                }))
              }
            >
              {scopeOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Payer */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="expense-filter-payer">
          {t("splits.filters.payer")}
        </label>
        <select
          id="expense-filter-payer"
          value={draft.payerId ?? ""}
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              payerId: e.target.value ? e.target.value : null,
            }))
          }
          className={styles.selectInput}
        >
          <option value="" className={styles.selectOption}>
            {t("splits.filters.allPayers")}
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.id} className={styles.selectOption}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Category */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="expense-filter-category">
          {t("splits.filters.category")}
        </label>
        <select
          id="expense-filter-category"
          value={draft.category ?? ""}
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              category: (e.target.value as ExpenseCategory) || null,
            }))
          }
          className={styles.selectInput}
        >
          <option value="" className={styles.selectOption}>
            {t("splits.filters.allCategories")}
          </option>
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category} className={styles.selectOption}>
              {t(`splits.categories.${category}`)}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Date Range */}
      <div className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>{t("splits.fields.date")}</span>
        <div className={styles.dateRow}>
          <div className={styles.dateField}>
            <div className="flex items-center justify-between">
              <span className={styles.dateLabel}>{t("splits.filters.dateFrom")}</span>
              {draft.dateFrom && (
                <button
                  type="button"
                  onClick={handleClearDateFrom}
                  className="text-[10px] text-muted-foreground/60 hover:text-foreground cursor-pointer"
                >
                  {t("splits.filters.clear")}
                </button>
              )}
            </div>
            <DatePicker
              value={draft.dateFrom ? parseISO(draft.dateFrom) : undefined}
              onChange={handleDateFromChange}
              open={dateFromOpen}
              onOpenChange={setDateFromOpen}
              dateFormat="dd.MM.yyyy"
              buttonClassName={styles.datePickerButton}
            />
          </div>
          <div className={styles.dateField}>
            <div className="flex items-center justify-between">
              <span className={styles.dateLabel}>{t("splits.filters.dateTo")}</span>
              {draft.dateTo && (
                <button
                  type="button"
                  onClick={handleClearDateTo}
                  className="text-[10px] text-muted-foreground/60 hover:text-foreground cursor-pointer"
                >
                  {t("splits.filters.clear")}
                </button>
              )}
            </div>
            <DatePicker
              ref={dateToRef}
              value={draft.dateTo ? parseISO(draft.dateTo) : undefined}
              onChange={handleDateToChange}
              open={dateToOpen}
              onOpenChange={setDateToOpen}
              dateFormat="dd.MM.yyyy"
              buttonClassName={styles.datePickerButton}
            />
          </div>
        </div>
      </div>

      {/* 6. Footer Actions */}
      <div className={styles.footer}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetDraft}
          className={styles.resetDraftButton}
        >
          {t("splits.filters.reset")}
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleApply}
          className={styles.applyButton}
        >
          {t("splits.filters.apply")}
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        {open &&
          createPortal(
            <>
              <div
                className={styles.mobileBackdrop}
                onClick={() => {
                  if (dateFromOpen || dateToOpen) {
                    setDateFromOpen(false);
                    setDateToOpen(false);
                    return;
                  }
                  handleOpenChange(false);
                }}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t("splits.filters.title")}
                className={styles.mobileContainer}
              >
                {filterContent}
              </div>
            </>,
            document.body,
          )}
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className={styles.popoverContent}>
        {filterContent}
      </PopoverContent>
    </Popover>
  );
};
