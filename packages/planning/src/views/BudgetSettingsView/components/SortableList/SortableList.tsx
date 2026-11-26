import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@flaner/shared/utils";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { sortableListStyles as styles } from "./SortableList.styles";

type SortableItem = { id: string; name: string };

type SortableRowProps<T extends SortableItem> = {
  item: T;
  disabled: boolean;
  className?: string;
  children: (handle: ReactNode) => ReactNode;
};

const SortableRow = <T extends SortableItem>({ item, disabled, className, children }: SortableRowProps<T>) => {
  const { t } = usePlanningTranslations();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={styles.handle}
      aria-label={t("budget.categories.move", { name: item.name })}
      disabled={disabled}
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden="true" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, isDragging && styles.dragging)}
    >
      {children(handle)}
    </li>
  );
};

export type SortableListProps<T extends SortableItem> = {
  items: T[];
  /** Moves `activeId` to the position of `overId` (only called when it changes). */
  onMove: (activeId: string, overId: string) => void;
  /** Renders a row; `handle` is the drag handle (also reorders by keyboard: Space, arrows, Space). */
  renderItem: (item: T, handle: ReactNode) => ReactNode;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
};

/**
 * A vertical list reordered by dragging a row's handle with a mouse or finger, or by keyboard on the focused handle;
 * moves are announced to screen readers in the UI language.
 */
export const SortableList = <T extends SortableItem>({
  items,
  onMove,
  renderItem,
  disabled = false,
  className,
  itemClassName,
}: SortableListProps<T>) => {
  const { t } = usePlanningTranslations();
  const sensors = useSensors(
    // A short move first, so a tap on the handle is not a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nameOf = (id: UniqueIdentifier) => items.find((item) => item.id === id)?.name ?? "";
  const placeOf = (id: UniqueIdentifier | undefined) => ({
    position: items.findIndex((item) => item.id === id) + 1,
    total: items.length,
  });
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("budget.categories.drag.start", { name: nameOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over ? t("budget.categories.drag.over", { name: nameOf(active.id), ...placeOf(over.id) }) : undefined,
    onDragEnd: ({ active, over }) =>
      t("budget.categories.drag.end", { name: nameOf(active.id), ...placeOf(over?.id ?? active.id) }),
    onDragCancel: ({ active }) => t("budget.categories.drag.cancel", { name: nameOf(active.id) }),
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t("budget.categories.drag.instructions") } }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ul className={className}>
          {items.map((item) => (
            <SortableRow key={item.id} item={item} disabled={disabled} className={itemClassName}>
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
