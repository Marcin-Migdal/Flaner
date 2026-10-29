import { useCallback, useId, useState } from "react";
import ReactSelect, {
  components,
  Props as SelectProps,
  type GroupBase,
  type MenuListProps,
  type MenuProps,
  type StylesConfig,
} from "react-select";
import CreatableSelect, { type CreatableProps } from "react-select/creatable";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { selectControlVariants, selectOptionVariants } from "./Select.styles";
import { cn } from "@flaner/shared/utils";

export type SelectOption = {
  label: string;
  value: string;
  [key: string]: unknown;
};

export const CustomMenuList = <Option extends SelectOption = SelectOption>(
  props: MenuListProps<Option, false, GroupBase<Option>>,
) => {
  const { innerRef } = props;

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof innerRef === "function") {
        innerRef(node);
      }
      if (!node) return;

      const stopPropagation = (e: Event) => {
        e.stopPropagation();
      };

      node.addEventListener("wheel", stopPropagation, { passive: true });
      node.addEventListener("touchmove", stopPropagation, { passive: true });

      return () => {
        node.removeEventListener("wheel", stopPropagation);
        node.removeEventListener("touchmove", stopPropagation);
      };
    },
    [innerRef],
  );

  return (
    <components.MenuList
      {...props}
      innerRef={handleRef}
      innerProps={{
        ...props.innerProps,
        onWheel: (e) => {
          e.stopPropagation();
          props.innerProps?.onWheel?.(e);
        },
        onTouchMove: (e) => {
          e.stopPropagation();
          props.innerProps?.onTouchMove?.(e);
        },
      }}
    />
  );
};

export const CustomMenu = <Option extends SelectOption = SelectOption>(
  props: MenuProps<Option, false, GroupBase<Option>>,
) => {
  const { innerRef } = props;

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof innerRef === "function") {
        innerRef(node);
      }
      if (!node) return;

      const stopPropagation = (e: Event) => {
        e.stopPropagation();
      };

      node.addEventListener("wheel", stopPropagation, { passive: true });
      node.addEventListener("touchmove", stopPropagation, { passive: true });

      return () => {
        node.removeEventListener("wheel", stopPropagation);
        node.removeEventListener("touchmove", stopPropagation);
      };
    },
    [innerRef],
  );

  return (
    <components.Menu
      {...props}
      innerRef={handleRef}
      innerProps={{
        ...props.innerProps,
        onWheel: (e) => {
          e.stopPropagation();
          props.innerProps?.onWheel?.(e);
        },
        onTouchMove: (e) => {
          e.stopPropagation();
          props.innerProps?.onTouchMove?.(e);
        },
      }}
    />
  );
};

export type CustomSelectProps<Option extends SelectOption = SelectOption> = Omit<SelectProps<Option, false, GroupBase<Option>>, "size"> &
  Omit<Partial<CreatableProps<Option, false, GroupBase<Option>>>, "size"> & {
    label?: string;
    description?: string;
    error?: string;
    containerClassName?: string;
    labelClassName?: string;
    disabled?: boolean;
    variant?: "default" | "glass";
    creatable?: boolean;
  };

export const Select = <Option extends SelectOption = SelectOption>({
  label,
  description,
  error,
  disabled = false,
  variant = "default",
  containerClassName,
  labelClassName,
  options,
  placeholder,
  value,
  onChange,
  id: customId,
  creatable = false,
  menuPlacement = "auto",
  menuPosition = "fixed",
  menuPortalTarget,
  menuShouldScrollIntoView = false,
  closeMenuOnScroll = true,
  onMenuOpen,
  onMenuClose,
  styles: customStyles,
  classNames: externalClassNames,
  ...props
}: CustomSelectProps<Option>) => {
  const defaultId = useId();
  const selectId = customId || defaultId;
  const [isMenuOpenState, setIsMenuOpenState] = useState(false);
  const isMenuOpen = props.menuIsOpen ?? isMenuOpenState;

  const handleMenuOpen = () => {
    setIsMenuOpenState(true);
    onMenuOpen?.();
  };

  const handleMenuClose = () => {
    setIsMenuOpenState(false);
    onMenuClose?.();
  };

  const targetPortal =
    menuPortalTarget !== undefined
      ? menuPortalTarget
      : typeof document !== "undefined"
        ? document.body
        : undefined;

  const mergedStyles: StylesConfig<Option, false, GroupBase<Option>> = {
    ...customStyles,
    menuPortal: (base, state) => {
      const portalStyles = customStyles?.menuPortal ? customStyles.menuPortal(base, state) : base;
      const baseWidth = typeof base?.width === "number" ? base.width : 0;
      const baseLeft = typeof base?.left === "number" ? base.left : 0;
      const isNearRightEdge = typeof window !== "undefined" && baseLeft + 280 > window.innerWidth;

      return {
        ...portalStyles,
        pointerEvents: "auto",
        zIndex: 9999,
        width: "auto",
        minWidth: baseWidth || "auto",
        ...(isNearRightEdge && typeof window !== "undefined"
          ? {
              left: "auto",
              right: Math.max(8, window.innerWidth - (baseLeft + baseWidth)),
            }
          : {}),
      };
    },
    menu: (base, state) => ({
      ...(customStyles?.menu ? customStyles.menu(base, state) : base),
      pointerEvents: "auto",
      width: "max-content",
      minWidth: "100%",
      maxWidth: "min(90vw, 360px)",
    }),
  };

  const customClassNames = {
    control: ({ isFocused, isDisabled }: { isFocused: boolean; isDisabled: boolean }) => {
      const isControlDisabled = isDisabled || disabled;
      const state = isControlDisabled ? "disabled" : error ? "error" : isFocused ? "focused" : "idle";
      return selectControlVariants({ variant, state });
    },
    valueContainer: () =>
      variant === "glass"
        ? "px-2.5 py-1 md:px-3 md:py-1.5 flex items-center gap-1"
        : "px-3 py-1.5 flex items-center gap-1",
    singleValue: () => (variant === "glass" ? "text-foreground font-medium" : "text-foreground"),
    placeholder: () => (variant === "glass" ? "text-muted-foreground/70" : "text-muted-foreground"),
    input: () => "text-foreground m-0 p-0",
    menu: ({ placement }: { placement?: "top" | "bottom" } = {}) =>
      cn(
        "min-w-full w-max max-w-[min(90vw,360px)] overflow-hidden z-50 pointer-events-auto",
        variant === "glass"
          ? "rounded-2xl border border-white/10 bg-[#151515]/90 backdrop-blur-xl shadow-2xl p-1.5 flex flex-col"
          : "rounded-lg border border-border bg-popover shadow-lg",
        placement === "top" ? "mb-1.5" : "mt-1.5",
      ),
    menuList: () =>
      cn(
        "react-remove-scroll-ignore",
        variant === "glass"
          ? "max-h-60 overflow-y-auto overflow-x-hidden m-scroll w-full flex flex-col gap-0.5"
          : "py-1 max-h-60 overflow-y-auto m-scroll",
      ),
    option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) => {
      const state = isSelected ? "selected" : isFocused ? "focused" : "idle";
      return selectOptionVariants({ variant, state });
    },
    indicatorsContainer: () => "px-2 gap-1",
    dropdownIndicator: () => "text-muted-foreground hover:text-foreground cursor-pointer",
    clearIndicator: () => "text-muted-foreground hover:text-foreground cursor-pointer",
    noOptionsMessage: () => "text-muted-foreground py-3 text-center text-sm",
    ...externalClassNames,
  };

  const mergedComponents = {
    MenuList: CustomMenuList,
    Menu: CustomMenu,
    ...props.components,
  };

  return (
    <Field
      data-invalid={!!error}
      data-disabled={disabled}
      className={cn(
        containerClassName,
        "data-[disabled=true]:opacity-60 data-[disabled=true]:cursor-not-allowed",
      )}
    >
      {label && <FieldLabel htmlFor={selectId} className={labelClassName}>{label}</FieldLabel>}
      {/* Raise the whole control while the menu is open so it overlays positioned siblings rendered later in the DOM. */}
      <div className={cn("relative w-full", isMenuOpen && "z-50")}>
        {creatable ? (
          <CreatableSelect
            id={selectId}
            options={options}
            value={value}
            onChange={onChange}
            isDisabled={disabled}
            placeholder={placeholder}
            classNamePrefix="react-select"
            unstyled
            classNames={customClassNames}
            styles={mergedStyles}
            components={mergedComponents}
            menuPortalTarget={targetPortal}
            menuPosition={menuPosition}
            menuPlacement={menuPlacement}
            menuShouldScrollIntoView={menuShouldScrollIntoView}
            closeMenuOnScroll={closeMenuOnScroll}
            onMenuOpen={handleMenuOpen}
            onMenuClose={handleMenuClose}
            {...props}
          />
        ) : (
          <ReactSelect
            id={selectId}
            options={options}
            value={value}
            onChange={onChange}
            isDisabled={disabled}
            placeholder={placeholder}
            classNamePrefix="react-select"
            unstyled
            classNames={customClassNames}
            styles={mergedStyles}
            components={mergedComponents}
            menuPortalTarget={targetPortal}
            menuPosition={menuPosition}
            menuPlacement={menuPlacement}
            menuShouldScrollIntoView={menuShouldScrollIntoView}
            closeMenuOnScroll={closeMenuOnScroll}
            onMenuOpen={handleMenuOpen}
            onMenuClose={handleMenuClose}
            {...props}
          />
        )}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
};

Select.displayName = "Select";
export default Select;
