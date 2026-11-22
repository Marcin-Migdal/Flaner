import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RankedList, type RankedListItem } from "./RankedList";

vi.mock("../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

const ITEMS: RankedListItem[] = [
  { id: "food", label: "Food", value: 600, color: 1 },
  { id: "home", label: "Home", value: 300, color: 2 },
  { id: "others", label: "Others", value: 100, color: "muted" },
];
const formatValue = (value: number) => `${value} zł`;

describe("RankedList", () => {
  it("shows each item's amount and share of the total in the given order", () => {
    render(<RankedList label="Categories" items={ITEMS} formatValue={formatValue} />);

    const rows = within(screen.getByRole("list", { name: "Categories" })).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["Food600 zł60%", "Home300 zł30%", "Others100 zł10%"]);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("draws a share bar per item", () => {
    render(<RankedList label="Categories" items={ITEMS} formatValue={formatValue} />);

    expect(screen.getByRole("meter", { name: "Food" })).toHaveAttribute("aria-valuenow", "60");
  });

  it("lets the user pick an item when selectable", async () => {
    const onSelect = vi.fn();
    render(<RankedList label="Categories" items={ITEMS} formatValue={formatValue} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: /Home/ }));

    expect(onSelect).toHaveBeenCalledWith("home");
  });
});
