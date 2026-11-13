import { MFE_NAMES } from "@flaner/shared/constants";
import { loadRemote } from "@module-federation/runtime";
import { loadNotificationTargets } from "./loadNotificationTargets";

// The remotes are what leaves the app here
vi.mock("@module-federation/runtime", () => ({ loadRemote: vi.fn() }));

describe("loadNotificationTargets", () => {
  it("merges the targets of every MFE that exposes them and skips the ones that fail", async () => {
    const friends = () => "/community/friends";
    const splits = () => "/planning/splits";
    vi.mocked(loadRemote).mockImplementation(async (id: string) => {
      if (id === `${MFE_NAMES.COMMUNITY}/notificationTargets`) return { notificationTargets: { friend_request: friends } };
      if (id === `${MFE_NAMES.PLANNING}/notificationTargets`) return { notificationTargets: { split_group_invitation: splits } };
      throw new Error(`no expose ${id}`);
    });

    const targets = await loadNotificationTargets();

    expect(targets).toEqual({ friend_request: friends, split_group_invitation: splits });
    expect(loadRemote).toHaveBeenCalledTimes(Object.values(MFE_NAMES).length);
  });
});
