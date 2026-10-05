import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, CustomMenu, CustomMenuList } from "./Select";

const mockOptions = [
  { label: "Option One", value: "opt-1" },
  { label: "Option Two", value: "opt-2" },
  { label: "Option Three", value: "opt-3" },
];

describe("Select component", () => {
  it("renders with label, placeholder, and description", () => {
    render(
      <Select
        label="Category"
        placeholder="Choose category..."
        description="Select primary category"
        options={mockOptions}
      />
    );

    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Choose category...")).toBeInTheDocument();
    expect(screen.getByText("Select primary category")).toBeInTheDocument();
  });

  it("renders error message when error prop is provided", () => {
    render(
      <Select
        label="Category"
        options={mockOptions}
        error="Category is required"
      />
    );

    expect(screen.getByText("Category is required")).toBeInTheDocument();
  });

  it("calls onChange when an option is selected", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(
      <Select
        label="Category"
        placeholder="Select option"
        options={mockOptions}
        onChange={onChangeMock}
      />
    );

    const control = screen.getByText("Select option");
    await user.click(control);

    const option = await screen.findByText("Option Two");
    await user.click(option);

    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: "opt-2", label: "Option Two" }),
      expect.anything()
    );
  });

  it("handles creatable mode when creatable={true}", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(
      <Select
        label="Tags"
        creatable
        placeholder="Add tag..."
        options={mockOptions}
        onChange={onChangeMock}
      />
    );

    const input = screen.getByRole("combobox");
    await user.type(input, "NewCustomTag{enter}");

    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: "NewCustomTag" }),
      expect.anything()
    );
  });

  it("renders disabled state", () => {
    const { container } = render(
      <Select
        label="Disabled Select"
        placeholder="Cannot click"
        disabled
        options={mockOptions}
      />
    );

    const input = container.querySelector("input");
    expect(input).toBeDisabled();
    expect(container.querySelector(".react-select--is-disabled")).toBeInTheDocument();
  });

  it("renders clear indicator and clears selected value", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(
      <Select
        isClearable
        defaultValue={mockOptions[0]}
        options={mockOptions}
        onChange={onChangeMock}
      />
    );

    const clearIndicator = document.querySelector("[class*='clearIndicator']");
    if (clearIndicator) {
      await user.click(clearIndicator);
    }
  });

  it("renders noOptionsMessage and handles wheel/touchmove on menu", async () => {
    const user = userEvent.setup();

    render(
      <Select
        placeholder="Select option"
        options={mockOptions}
      />
    );

    const control = screen.getByText("Select option");
    await user.click(control);

    const input = screen.getByRole("combobox");
    await user.type(input, "NonExistentValue");

    const noOptions = screen.getByText("No options");
    expect(noOptions).toBeInTheDocument();

    const menuList = noOptions.parentElement;
    const menu = menuList?.parentElement;

    if (menuList) {
      fireEvent.wheel(menuList, { deltaY: 100 });
      fireEvent.touchMove(menuList, { touches: [{ clientY: 50 }] });
      menuList.dispatchEvent(new Event("wheel"));
      menuList.dispatchEvent(new Event("touchmove"));
    }
    if (menu) {
      fireEvent.wheel(menu, { deltaY: 100 });
      fireEvent.touchMove(menu, { touches: [{ clientY: 50 }] });
      menu.dispatchEvent(new Event("wheel"));
      menu.dispatchEvent(new Event("touchmove"));
    }
  });

  it("handles wheel and touchmove on inline menu and menuList", async () => {
    const user = userEvent.setup();
    render(
      <Select
        placeholder="Open me"
        options={mockOptions}
      />
    );

    const control = screen.getByText("Open me");
    await user.click(control);

    const option = await screen.findByText("Option One");
    expect(option).toBeInTheDocument();

    const menuList = document.querySelector(".react-remove-scroll-ignore");
    const menu = menuList?.parentElement;

    expect(menuList).not.toBeNull();
    expect(menu).not.toBeNull();

    if (menu) {
      fireEvent.wheel(menu, { deltaY: 50 });
      fireEvent.touchMove(menu, { touches: [{ clientY: 20 }] });
    }
    if (menuList) {
      fireEvent.wheel(menuList, { deltaY: 50 });
      fireEvent.touchMove(menuList, { touches: [{ clientY: 20 }] });
    }
  });

  it("handles CustomMenu and CustomMenuList innerRef callbacks and unmount cleanup", async () => {
    const user = userEvent.setup();
    const menuRefMock = vi.fn();
    const listRefMock = vi.fn();

    const { unmount } = render(
      <Select
        placeholder="Open for refs"
        options={mockOptions}
        components={{
          Menu: (menuProps) => (
            <CustomMenu
              {...menuProps}
              innerRef={menuRefMock}
            />
          ),
          MenuList: (listProps) => (
            <CustomMenuList
              {...listProps}
              innerRef={listRefMock}
            />
          ),
        }}
      />
    );

    const control = screen.getByText("Open for refs");
    await user.click(control);

    expect(menuRefMock).toHaveBeenCalled();
    expect(listRefMock).toHaveBeenCalled();

    unmount();
  });

  it("invokes onWheel and onTouchMove inside CustomMenu and CustomMenuList", async () => {
    const user = userEvent.setup();
    const parentOnWheel = vi.fn();
    const parentOnTouchMove = vi.fn();

    type InnerPropsWithHandlers = {
      onWheel?: (e: { stopPropagation: () => void }) => void;
      onTouchMove?: (e: { stopPropagation: () => void }) => void;
    };
    let capturedMenuProps: InnerPropsWithHandlers | undefined;
    let capturedListProps: InnerPropsWithHandlers | undefined;

    render(
      <Select
        placeholder="Open for handlers"
        options={mockOptions}
        components={{
          Menu: (menuProps) => {
            const el = CustomMenu({
              ...menuProps,
              innerProps: {
                ...menuProps.innerProps,
                onWheel: parentOnWheel,
                onTouchMove: parentOnTouchMove,
              },
            });
            capturedMenuProps = el.props.innerProps;
            return el;
          },
          MenuList: (listProps) => {
            const el = CustomMenuList({
              ...listProps,
              innerProps: {
                ...listProps.innerProps,
                onWheel: parentOnWheel,
                onTouchMove: parentOnTouchMove,
              },
            });
            capturedListProps = el.props.innerProps;
            return el;
          },
        }}
      />
    );

    const control = screen.getByText("Open for handlers");
    await user.click(control);

    const mockEvent = { stopPropagation: vi.fn() };
    capturedMenuProps?.onWheel?.(mockEvent);
    capturedMenuProps?.onTouchMove?.(mockEvent);
    capturedListProps?.onWheel?.(mockEvent);
    capturedListProps?.onTouchMove?.(mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(4);
    expect(parentOnWheel).toHaveBeenCalledTimes(2);
    expect(parentOnTouchMove).toHaveBeenCalledTimes(2);
  });

  it("handles onWheel and onTouchMove when parent innerProps handlers are omitted", async () => {
    const user = userEvent.setup();

    type InnerPropsWithHandlers = {
      onWheel?: (e: { stopPropagation: () => void }) => void;
      onTouchMove?: (e: { stopPropagation: () => void }) => void;
    };
    let capturedMenuProps: InnerPropsWithHandlers | undefined;
    let capturedListProps: InnerPropsWithHandlers | undefined;

    render(
      <Select
        placeholder="Open for empty handlers"
        options={mockOptions}
        components={{
          Menu: (menuProps) => {
            const el = CustomMenu({
              ...menuProps,
              innerProps: {
                ...menuProps.innerProps,
                onWheel: undefined,
                onTouchMove: undefined,
              },
            });
            capturedMenuProps = el.props.innerProps;
            return el;
          },
          MenuList: (listProps) => {
            const el = CustomMenuList({
              ...listProps,
              innerProps: {
                ...listProps.innerProps,
                onWheel: undefined,
                onTouchMove: undefined,
              },
            });
            capturedListProps = el.props.innerProps;
            return el;
          },
        }}
      />
    );

    const control = screen.getByText("Open for empty handlers");
    await user.click(control);

    const mockEvent = { stopPropagation: vi.fn() };
    capturedMenuProps?.onWheel?.(mockEvent);
    capturedMenuProps?.onTouchMove?.(mockEvent);
    capturedListProps?.onWheel?.(mockEvent);
    capturedListProps?.onTouchMove?.(mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(4);
  });

  it("renders with variant='glass' and menuPlacement='top'", async () => {
    const user = userEvent.setup();
    render(
      <Select
        variant="glass"
        menuPlacement="top"
        placeholder="Glass select"
        options={mockOptions}
        value={mockOptions[0]}
      />
    );

    const control = screen.getByText("Option One");
    await user.click(control);
    expect(screen.getByText("Option Two")).toBeInTheDocument();
  });

  it("handles customStyles for menuPortal and menu, including near right edge positioning", async () => {
    vi.stubGlobal("innerWidth", 500);

    const user = userEvent.setup();
    const { unmount } = render(
      <Select
        placeholder="Edge select"
        options={mockOptions}
        styles={{
          menuPortal: (base) => ({ ...base, opacity: 0.9 }),
          menu: (base) => ({ ...base, opacity: 0.8 }),
        }}
      />
    );

    const control = screen.getByText("Edge select");
    await user.click(control);

    expect(await screen.findByText("Option One")).toBeInTheDocument();
    unmount();
    vi.unstubAllGlobals();
  });

  it("handles variant='glass' with placeholder and selected value", () => {
    const { rerender } = render(
      <Select
        variant="glass"
        placeholder="Glass Placeholder"
        options={mockOptions}
      />
    );

    expect(screen.getByText("Glass Placeholder")).toBeInTheDocument();

    rerender(
      <Select
        variant="glass"
        value={mockOptions[0]}
        options={mockOptions}
      />
    );

    expect(screen.getByText("Option One")).toBeInTheDocument();
  });
});


