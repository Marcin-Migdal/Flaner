import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./Select";

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
});
