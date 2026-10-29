import { cn } from "@flaner/shared/utils";
import { Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconTextField, IconTextFieldProps } from "../IconTextField";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";

export interface SearchBarProps<T> extends Omit<IconTextFieldProps, "onChange" | "results" | "onSelect" | "value"> {
  results?: T[];
  isLoading?: boolean;
  onSelect?: (item: T) => void;
  renderResult: (item: T) => React.ReactNode;
  keyExtractor?: (item: T) => string | number;
  emptyStateText?: string;
  onChange?: (value: string) => void;
  value?: string;
  hasMore?: boolean;
  onShowMore?: () => void;
  isFetchingNextPage?: boolean;
  showMoreText?: string;
}

const DEFAULT_RESULTS: unknown[] = [];

export function SearchBar<T>({
  results = DEFAULT_RESULTS as T[],
  isLoading = false,
  onSelect,
  renderResult,
  keyExtractor = (item: T) => ((item as Record<string, unknown>).id as string | number) || String(item),
  emptyStateText = "searchBar.emptySearch",
  onChange,
  value,
  className,
  onFocus,
  onKeyDown,
  alwaysOpen = false,
  hasMore,
  onShowMore,
  isFetchingNextPage,
  showMoreText = "searchBar.showMore",
  ...props
}: SearchBarProps<T>) {
  const { t } = useTranslation("common");

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [prevIsExpanded, setPrevIsExpanded] = useState(props.isExpanded);
  const [prevValue, setPrevValue] = useState(value);
  const [prevResults, setPrevResults] = useState(results);

  if (props.isExpanded !== prevIsExpanded) {
    setPrevIsExpanded(props.isExpanded);
    if (props.isExpanded === false) {
      setIsOpen(false);
    }
  }

  if (value !== prevValue || results !== prevResults) {
    setPrevValue(value);
    setPrevResults(results);
    setSelectedIndex(-1);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key !== "Escape") {
      setIsOpen(true);
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const maxIndex = hasMore ? results.length : results.length - 1;
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
        break;
      }
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          onSelect?.(results[selectedIndex]);
          setIsOpen(false);
        } else if (selectedIndex === results.length && hasMore) {
          // If the "Show more" button is focused
          onShowMore?.();
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }

    onKeyDown?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsOpen(true);
    onFocus?.(e);
  };

  const handleClose = () => {
    setIsOpen(false);
    props.onClose?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
    setIsOpen(true);
  };

  // Scroll into view on keyboard navigation
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView?.({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const hasContent = Boolean(value && value.length > 0);
  const showDropdown = isOpen && hasContent;

  return (
    <Popover
      open={showDropdown}
      onOpenChange={(open) => {
        if (!open) setIsOpen(false);
      }}
    >
      <PopoverAnchor asChild>
        <div ref={containerRef} className={cn("relative", alwaysOpen ? "w-full" : "w-fit", className)}>
          <IconTextField
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            alwaysOpen={alwaysOpen}
            {...props}
            onClose={handleClose}
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (e.target instanceof Node && containerRef.current?.contains(e.target)) {
            e.preventDefault();
          }
        }}
        // Portaled outside of a parent Dialog, whose scroll lock would otherwise swallow wheel/touch scrolling here.
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className="w-(--radix-popover-trigger-width) min-w-[20rem] md:min-w-[24rem] max-w-[calc(100vw-2rem)] gap-0 p-0 overflow-hidden rounded-xl border border-border bg-popover shadow-lg ring-0"
      >
        {isLoading && results.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : results.length > 0 ? (
          <ul
            ref={listRef}
            className={cn(
              "max-h-80 overflow-y-auto py-2 outline-none transition-opacity duration-200",
              isLoading ? "opacity-50 pointer-events-none" : "opacity-100",
            )}
          >
            {results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <li key={keyExtractor(item)}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect?.(item);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left cursor-pointer px-4 py-2.5 transition-colors",
                      isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                    )}
                  >
                    {renderResult(item)}
                  </button>
                </li>
              );
            })}

            {hasMore && (
              <li className="p-1 text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowMore?.();
                  }}
                  className={cn(
                    "w-full cursor-pointer px-4 py-2 text-center text-sm font-medium text-brand transition-colors rounded-lg",
                    selectedIndex === results.length ? "bg-accent text-brand" : "hover:bg-accent/50",
                  )}
                >
                  {isFetchingNextPage ? <Loader2 className="size-4 animate-spin mx-auto" /> : t(showMoreText)}
                </button>
              </li>
            )}
          </ul>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">{t(emptyStateText)}</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
