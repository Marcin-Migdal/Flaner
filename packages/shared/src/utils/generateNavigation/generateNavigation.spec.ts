import { describe, it, expect } from "vitest";
import { generateNavigation } from "./generateNavigation";
import type { AppRouteObject } from "../../types/navigation";

import type { IconName } from "lucide-react/dynamic";

// Simple dummy icon name for test handles
const DummyIcon: IconName = "calendar";

describe("generateNavigation", () => {
  it("returns an empty array when given an empty routes array", () => {
    const result = generateNavigation([], "/");
    expect(result).toEqual([]);
  });

  it("filters out routes marked with hideInNav: true", () => {
    const routes: AppRouteObject[] = [
      {
        path: "secret",
        handle: { label: "secret.title", icon: DummyIcon, hideInNav: true },
      },
      {
        path: "visible",
        handle: { label: "visible.title", icon: DummyIcon },
      },
    ];

    const result = generateNavigation(routes, "/base");
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/base/visible");
    expect(result[0].labelKey).toBe("visible.title");
  });

  it("filters out dynamic parameterized routes (containing ':')", () => {
    const routes: AppRouteObject[] = [
      {
        path: "groups/:groupId",
        handle: { label: "group.detail", icon: DummyIcon },
      },
      {
        path: "groups",
        handle: { label: "group.list", icon: DummyIcon },
      },
    ];

    const result = generateNavigation(routes, "/app");
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/app/groups");
  });

  it("normalizes paths by removing double slashes and trailing slashes", () => {
    const routes: AppRouteObject[] = [
      {
        path: "/dashboard/",
        handle: { label: "dashboard.title", icon: DummyIcon },
      },
      {
        path: "settings//profile/",
        handle: { label: "profile.title", icon: DummyIcon },
      },
    ];

    const result = generateNavigation(routes, "/base/");
    expect(result[0].path).toBe("/dashboard");
    expect(result[1].path).toBe("/base/settings/profile");
  });

  it("recursively processes nested children routes", () => {
    const routes: AppRouteObject[] = [
      {
        path: "community",
        handle: { label: "community.title", icon: DummyIcon },
        children: [
          {
            path: "groups",
            handle: { label: "community.groups", icon: DummyIcon },
          },
          {
            path: "friends",
            handle: { label: "community.friends", icon: DummyIcon },
          },
        ],
      },
    ];

    const result = generateNavigation(routes, "/app");
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/app/community");
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children?.[0].path).toBe("/app/community/groups");
    expect(result[0].children?.[1].path).toBe("/app/community/friends");
  });

  it("lifts children up if parent route has no label or icon handle", () => {
    const routes: AppRouteObject[] = [
      {
        path: "wrapper",
        // No handle with label/icon
        children: [
          {
            path: "child",
            handle: { label: "child.title", icon: DummyIcon },
          },
        ],
      },
    ];

    const result = generateNavigation(routes, "/base");
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/base/wrapper/child");
  });
});
