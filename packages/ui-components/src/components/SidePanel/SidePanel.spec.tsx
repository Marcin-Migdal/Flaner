import { render, screen } from "@testing-library/react";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
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

  it("names the close button from closeLabel", () => {
    render(
      <Sheet open>
        <SidePanel title="Invitations" closeLabel="Dismiss panel" />
      </Sheet>,
    );

    expect(screen.getByRole("button", { name: "Dismiss panel" })).toBeInTheDocument();
  });

  it("names the close button from the ui namespace by default", () => {
    const i18nInstance = createTestI18n({ pl: { ui: { close: "Zamknij" } } });
    void i18nInstance.changeLanguage("pl");
    renderWithProviders(
      <Sheet open>
        <SidePanel title="Zaproszenia" />
      </Sheet>,
      { i18nInstance },
    );

    expect(screen.getByRole("button", { name: "Zamknij" })).toBeInTheDocument();
  });
});
