// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { setupEmulator } from "@flaner/test-utils/emulator";
import { doc } from "firebase/firestore";
import { fb } from "../../firebase";
import { BATCH_LIMIT, deleteInBatches } from "./deleteInBatches";

const { signInAs, seed, list } = setupEmulator();

const notification = (id: string) => ({
  id,
  type: "friend_request_accepted",
  senderUid: "user-2",
  senderUsername: "Bob",
  senderAvatarUrl: "",
  createdAt: 1,
  read: false,
});

describe("deleteInBatches", () => {
  it("does nothing for an empty list", async () => {
    await expect(deleteInBatches(fb.firestore, [])).resolves.toBeUndefined();
  });

  it("deletes more docs than one batch may hold, and only those", async () => {
    const ids = Array.from({ length: BATCH_LIMIT + 2 }, (_, index) => `n-${index}`);
    await seed(Object.fromEntries([...ids, "kept"].map((id) => [`users/user-1/notifications/${id}`, notification(id)])));
    await signInAs("user-1");

    await deleteInBatches(
      fb.firestore,
      ids.map((id) => doc(fb.firestore, "users/user-1/notifications", id)),
    );

    expect(Object.keys(await list("users/user-1/notifications"))).toEqual(["kept"]);
  });
});
