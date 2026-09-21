import { useEffect, useRef } from "react";
import type { User } from "firebase/auth";
import type { FilamentTemplate } from "../../../../api/templates";
import {
  addLookupColor,
  addLookupMaterial,
  addLookupType,
} from "../../../../api/lookups";
import { bambuFilaments } from "../../../../utils/bambuFilaments";

/**
 * One-time migration hook: scans existing user templates and ensures any custom
 * materials, types, or colors exist in the respective lookup subcollections.
 */
export const useSyncLookups = (
  user: User | null,
  userTemplates: FilamentTemplate[],
) => {
  const syncLookupsRef = useRef(false);

  useEffect(() => {
    if (syncLookupsRef.current || !user || userTemplates.length === 0) return;

    const syncLookups = async () => {
      // Deduplicate lookups across templates to avoid redundant writes
      const customMaterials = new Set<string>();
      const customTypes = new Map<string, { materialName: string; name: string }>();
      const customColors = new Map<
        string,
        { materialName: string; typeName: string; name: string; hex: string }
      >();

      for (const tpl of userTemplates) {
        if (!tpl.material || !tpl.type || !tpl.colorName) continue;

        const isOfficialMat = bambuFilaments.some(
          (bm) => bm.name.toLowerCase() === tpl.material.toLowerCase(),
        );
        if (!isOfficialMat) {
          customMaterials.add(tpl.material);
        }

        const isOfficialType = bambuFilaments.some(
          (bm) =>
            bm.name.toLowerCase() === tpl.material.toLowerCase() &&
            bm.types.some((bt) => bt.name.toLowerCase() === tpl.type.toLowerCase()),
        );
        if (!isOfficialType) {
          const key = `${tpl.material.toLowerCase()}::${tpl.type.toLowerCase()}`;
          customTypes.set(key, { materialName: tpl.material, name: tpl.type });
        }

        const isOfficialColor = bambuFilaments.some(
          (bm) =>
            bm.name.toLowerCase() === tpl.material.toLowerCase() &&
            bm.types.some(
              (bt) =>
                bt.name.toLowerCase() === tpl.type.toLowerCase() &&
                bt.colors.some(
                  (bc) => bc.name.toLowerCase() === tpl.colorName.toLowerCase(),
                ),
            ),
        );
        if (!isOfficialColor) {
          const key = `${tpl.material.toLowerCase()}::${tpl.type.toLowerCase()}::${tpl.colorName.toLowerCase()}`;
          customColors.set(key, {
            materialName: tpl.material,
            typeName: tpl.type,
            name: tpl.colorName,
            hex: tpl.colorHex || "#ffffff",
          });
        }
      }

      const promises: Promise<unknown>[] = [];

      for (const mat of customMaterials) {
        promises.push(addLookupMaterial(user.uid, { name: mat }));
      }
      for (const typ of customTypes.values()) {
        promises.push(addLookupType(user.uid, typ));
      }
      for (const col of customColors.values()) {
        promises.push(addLookupColor(user.uid, col));
      }

      if (promises.length === 0) {
        syncLookupsRef.current = true;
        return;
      }

      try {
        const results = await Promise.allSettled(promises);
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          console.error("Lookup sync had errors:", failed);
        } else {
          syncLookupsRef.current = true;
        }
      } catch (err) {
        console.error("Lookup sync failed:", err);
      }
    };

    void syncLookups();
  }, [user, userTemplates]);
};

export default useSyncLookups;
