import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateItem } from "./TemplateItem";
import type { FilamentTemplate } from "../../../api/templates";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockTemplate: FilamentTemplate = {
  id: "tpl-1",
  userId: "user-1",
  material: "PLA",
  type: "Basic",
  colorName: "Bambu Green",
  colorHex: "#00ae42",
  defaultWeight: 1000,
};

describe("TemplateItem", () => {
  it("renders template info correctly", () => {
    render(
      <TemplateItem
        template={mockTemplate}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("PLA Basic")).toBeInTheDocument();
    expect(screen.getByText("Bambu Green • 1000g")).toBeInTheDocument();
  });

  it("renders color preview swatch with matching color hex", () => {
    const { container } = render(
      <TemplateItem
        template={mockTemplate}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const swatch = container.querySelector('div[style*="background-color: rgb(0, 174, 66)"]');
    expect(swatch).not.toBeNull();
  });
});
