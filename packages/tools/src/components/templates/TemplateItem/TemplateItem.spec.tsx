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

  it("falls back to white for unknown material with white hex or missing hex", () => {
    const unknownTemplate: FilamentTemplate = {
      ...mockTemplate,
      material: "CustomMat",
      type: "CustomType",
      colorName: "CustomColor",
      colorHex: "#ffffff",
    };

    const { container, rerender } = render(
      <TemplateItem
        template={unknownTemplate}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const whiteSwatch = container.querySelector('div[style*="background-color: rgb(255, 255, 255)"]');
    expect(whiteSwatch).not.toBeNull();

    rerender(
      <TemplateItem
        template={{ ...unknownTemplate, colorHex: "" }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(container.querySelector('div[style*="background-color: rgb(255, 255, 255)"]')).not.toBeNull();
  });
});
