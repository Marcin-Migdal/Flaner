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
    syncLookupsRef.current = true;

    for (const tpl of userTemplates) {
      if (!tpl.material || !tpl.type || !tpl.colorName) continue;

      const isOfficialMat = bambuFilaments.some(
        (bm) => bm.name.toLowerCase() === tpl.material.toLowerCase(),
      );
      if (!isOfficialMat) {
        addLookupMaterial(user.uid, { name: tpl.material }).catch(() => {});
      }

      const isOfficialType = bambuFilaments.some(
        (bm) =>
          bm.name.toLowerCase() === tpl.material.toLowerCase() &&
          bm.types.some((bt) => bt.name.toLowerCase() === tpl.type.toLowerCase()),
      );
      if (!isOfficialType) {
        addLookupType(user.uid, {
          materialName: tpl.material,
          name: tpl.type,
        }).catch(() => {});
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
        addLookupColor(user.uid, {
          materialName: tpl.material,
          typeName: tpl.type,
          name: tpl.colorName,
          hex: tpl.colorHex || "#ffffff",
        }).catch(() => {});
      }
    }
  }, [user, userTemplates]);
};

export default useSyncLookups;
