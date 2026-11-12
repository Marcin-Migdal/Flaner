import { render, screen } from "@testing-library/react";
import { Sheet } from "../ui/sheet";
import { SidePanel } from "./SidePanel";

describe("SidePanel", () => {
  it("renders an accessible dialog with title, description and body", () => {
    render(
      <Sheet open>
        <SidePanel title="Invitations" description="People who invited you">
          <p>Row</p>
        </SidePanel>
      </Sheet>,
    );

    const dialog = screen.getByRole("dialog", { name: "Invitations" });
    expect(dialog).toHaveAccessibleDescription("People who invited you");
    expect(screen.getByText("Row").parentElement).toHaveAttribute("data-slot", "side-panel-body");
  });

  it("renders nothing while the sheet is closed", () => {
    render(
      <Sheet open={false}>
        <SidePanel title="Invitations">
          <p>Row</p>
        </SidePanel>
      </Sheet>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
