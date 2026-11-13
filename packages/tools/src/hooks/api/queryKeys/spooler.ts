import type { UserType } from "@flaner/shared/types";
import type { RecordUsageInput, UndoPrintInput } from "../../../api/spools";

// Spooler (tools) query keys — the only place that builds them. Nothing here is listener-backed:
// every key is fetched, so each write must list what it makes stale in `spoolerInvalidation`.
// Child keys extend their parent, so invalidating the parent refreshes them too.
export const spoolerKeys = {
  spools: (uid: string) => ["spooler", "spools", uid],
  /** Spools made from one template; nested under `spools`, so every spool / template write refreshes it. */
  associatedSpools: (uid: string, templateId: string) => [...spoolerKeys.spools(uid), "associated", templateId],
  prints: (spoolId: string) => ["spooler", "prints", spoolId],
  lastPrint: (spoolId: string) => [...spoolerKeys.prints(spoolId), "last"],
  templates: (uid: string) => ["spooler", "templates", uid],
  lookupMaterials: (uid: string) => ["spooler", "lookupMaterials", uid],
  lookupTypes: (uid: string) => ["spooler", "lookupTypes", uid],
  lookupColors: (uid: string) => ["spooler", "lookupColors", uid],
  startupWaste: (uid: string) => ["spooler", "startupWaste", uid],
};

/** Which keys each Spooler write makes stale (`useUserMutation({ invalidates })`). */
export const spoolerInvalidation = {
  addSpool: ({ uid }: UserType) => [spoolerKeys.spools(uid)],
  editSpool: ({ uid }: UserType) => [spoolerKeys.spools(uid)],
  deleteSpool: ({ uid }: UserType) => [spoolerKeys.spools(uid)],
  markSpoolAsFinished: ({ uid }: UserType) => [spoolerKeys.spools(uid)],
  recordSpoolUsage: ({ uid }: UserType, { spoolId }: RecordUsageInput) => [spoolerKeys.spools(uid), spoolerKeys.prints(spoolId)],
  undoLastPrint: ({ uid }: UserType, { spoolId }: UndoPrintInput) => [spoolerKeys.spools(uid), spoolerKeys.prints(spoolId)],
  addTemplate: ({ uid }: UserType) => [spoolerKeys.templates(uid)],
  // Editing / deleting a template can rewrite or delete its spools
  editTemplate: ({ uid }: UserType) => [spoolerKeys.templates(uid), spoolerKeys.spools(uid)],
  deleteTemplate: ({ uid }: UserType) => [spoolerKeys.templates(uid), spoolerKeys.spools(uid)],
  addLookupMaterial: ({ uid }: UserType) => [spoolerKeys.lookupMaterials(uid)],
  addLookupType: ({ uid }: UserType) => [spoolerKeys.lookupTypes(uid)],
  addLookupColor: ({ uid }: UserType) => [spoolerKeys.lookupColors(uid)],
  // Deleting a lookup cascades to its children (material → types → colors)
  deleteLookupMaterial: ({ uid }: UserType) => [
    spoolerKeys.lookupMaterials(uid),
    spoolerKeys.lookupTypes(uid),
    spoolerKeys.lookupColors(uid),
  ],
  deleteLookupType: ({ uid }: UserType) => [spoolerKeys.lookupTypes(uid), spoolerKeys.lookupColors(uid)],
  deleteLookupColor: ({ uid }: UserType) => [spoolerKeys.lookupColors(uid)],
  updateStartupWaste: ({ uid }: UserType) => [spoolerKeys.startupWaste(uid)],
};
