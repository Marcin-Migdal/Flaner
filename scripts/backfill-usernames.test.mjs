// Run: node --test scripts/backfill-usernames.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { planBackfill } from "./backfill-usernames.mjs";

const suffix = () => "1234";

test("leaves profiles that own their reservation alone", () => {
  const plan = planBackfill([{ uid: "a", username: "Alice", usernameLower: "alice" }], [{ id: "alice", uid: "a" }], suffix);

  assert.deepEqual(plan, { fixes: [], release: [] });
});

test("reserves a free name without renaming", () => {
  const { fixes } = planBackfill([{ uid: "a", username: "Alice", usernameLower: "alice" }], [], suffix);

  assert.deepEqual(fixes, [{ uid: "a", username: "Alice", usernameLower: "alice", reserve: true, renamed: false, updateProfile: false }]);
});

test("renames a profile whose name is reserved by someone else", () => {
  const { fixes } = planBackfill(
    [{ uid: "a", username: "John", usernameLower: "john" }],
    [{ id: "john", uid: "b" }],
    suffix,
  );

  assert.deepEqual(fixes, [{ uid: "a", username: "John1234", usernameLower: "john1234", reserve: true, renamed: true, updateProfile: true }]);
});

test("gives the name to the first of two unreserved duplicates", () => {
  const { fixes } = planBackfill(
    [
      { uid: "a", username: "User", usernameLower: "user" },
      { uid: "b", username: "User", usernameLower: "user" },
    ],
    [],
    suffix,
  );

  assert.equal(fixes[0].usernameLower, "user");
  assert.equal(fixes[1].usernameLower, "user1234");
});

test("fixes a usernameLower that does not match the username", () => {
  const { fixes } = planBackfill([{ uid: "a", username: "Alice", usernameLower: "old" }], [{ id: "alice", uid: "a" }], suffix);

  assert.deepEqual(fixes, [{ uid: "a", username: "Alice", usernameLower: "alice", reserve: false, renamed: false, updateProfile: true }]);
});

test("releases reservations no profile points at", () => {
  const { release } = planBackfill(
    [{ uid: "a", username: "Alice", usernameLower: "alice" }],
    [
      { id: "alice", uid: "a" },
      { id: "old-alice", uid: "a" },
      { id: "ghost", uid: "deleted" },
    ],
    suffix,
  );

  assert.deepEqual(release, ["old-alice", "ghost"]);
});
