import React, { useEffect } from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { useSheet } from "./useSheet";

describe("useSheet", () => {
  const createWrapper = (initialEntries = ["/"]) => {
    return ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    );
  };

  it("initializes with defaultOpen state", () => {
    const { result } = renderHook(() => useSheet({ defaultOpen: false }), {
      wrapper: createWrapper(),
    });
    const [isOpen] = result.current;
    expect(isOpen).toBe(false);

    const { result: openResult } = renderHook(() => useSheet({ defaultOpen: true }), {
      wrapper: createWrapper(),
    });
    const [isOpenTrue] = openResult.current;
    expect(isOpenTrue).toBe(true);
  });

  it("supports open, close, and toggle actions", () => {
    const { result } = renderHook(() => useSheet(), {
      wrapper: createWrapper(),
    });

    // open()
    act(() => {
      result.current[1].open();
    });
    expect(result.current[0]).toBe(true);

    // close()
    act(() => {
      result.current[1].close();
    });
    expect(result.current[0]).toBe(false);

    // toggle()
    act(() => {
      result.current[1].toggle();
    });
    expect(result.current[0]).toBe(true);

    // setOpen(false)
    act(() => {
      result.current[1].setOpen(false);
    });
    expect(result.current[0]).toBe(false);
  });

  it("automatically opens when URL hash matches hashTarget", () => {
    const { result } = renderHook(
      () => useSheet({ hashTarget: "#settings-sheet" }),
      { wrapper: createWrapper(["/dashboard#settings-sheet"]) }
    );

    const [isOpen] = result.current;
    expect(isOpen).toBe(true);
  });

  it("handles dynamic hash change while mounted", () => {
    let navigate: ((to: string) => void) | undefined;
    const Navigator = () => {
      const nav = useNavigate();
      useEffect(() => {
        navigate = nav;
      }, [nav]);
      return null;
    };

    const { result } = renderHook(
      () => useSheet({ hashTarget: "#dynamic-sheet" }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Navigator />
            {children}
          </MemoryRouter>
        ),
      }
    );

    expect(result.current[0]).toBe(false);

    act(() => {
      navigate?.("/dashboard#dynamic-sheet");
    });

    expect(result.current[0]).toBe(true);
  });
});
