import { bambuFilaments } from "./bambuFilaments";
import type { LookupColor, LookupMaterial, LookupType } from "../api/lookups";

export type MergedColor = {
  id?: string;
  name: string;
  hex: string;
  isCustom?: boolean;
};

export type MergedType = {
  id?: string;
  name: string;
  colors: MergedColor[];
  isCustom?: boolean;
};

export type MergedMaterial = {
  id?: string;
  name: string;
  types: MergedType[];
  isCustom?: boolean;
};

export const mergeFilamentOptions = (
  lookupMaterials: LookupMaterial[] = [],
  lookupTypes: LookupType[] = [],
  lookupColors: LookupColor[] = [],
): MergedMaterial[] => {
  const merged: MergedMaterial[] = JSON.parse(JSON.stringify(bambuFilaments));

  // 1. Merge lookup materials
  lookupMaterials.forEach((lm) => {
    let materialNode = merged.find((m) => m.name.toLowerCase() === lm.name.toLowerCase());
    if (!materialNode) {
      materialNode = { id: lm.id, name: lm.name, types: [], isCustom: true };
      merged.push(materialNode);
    } else {
      materialNode.id = lm.id;
    }
  });

  // 2. Merge lookup types
  lookupTypes.forEach((lt) => {
    let materialNode = merged.find((m) => m.name.toLowerCase() === lt.materialName.toLowerCase());
    if (!materialNode) {
      materialNode = { name: lt.materialName, types: [], isCustom: true };
      merged.push(materialNode);
    }
    let typeNode = materialNode.types.find((t) => t.name.toLowerCase() === lt.name.toLowerCase());
    if (!typeNode) {
      typeNode = { id: lt.id, name: lt.name, colors: [], isCustom: true };
      materialNode.types.push(typeNode);
    } else {
      typeNode.id = lt.id;
      // If not in official Bambu for this material, mark as custom
      const isOfficial = bambuFilaments.some(
        (bm) =>
          bm.name.toLowerCase() === lt.materialName.toLowerCase() &&
          bm.types.some((bt) => bt.name.toLowerCase() === lt.name.toLowerCase()),
      );
      if (!isOfficial) {
        typeNode.isCustom = true;
      }
    }
  });

  // 3. Merge lookup colors
  lookupColors.forEach((lc) => {
    let materialNode = merged.find((m) => m.name.toLowerCase() === lc.materialName.toLowerCase());
    if (!materialNode) {
      materialNode = { name: lc.materialName, types: [], isCustom: true };
      merged.push(materialNode);
    }
    let typeNode = materialNode.types.find((t) => t.name.toLowerCase() === lc.typeName.toLowerCase());
    if (!typeNode) {
      typeNode = { name: lc.typeName, colors: [], isCustom: true };
      materialNode.types.push(typeNode);
    }
    let colorNode = typeNode.colors.find((c) => c.name.toLowerCase() === lc.name.toLowerCase());
    if (!colorNode) {
      colorNode = { id: lc.id, name: lc.name, hex: lc.hex, isCustom: true };
      typeNode.colors.push(colorNode);
    } else {
      colorNode.id = lc.id;
      colorNode.hex = lc.hex;
      // If not in official Bambu for this material & type, mark as custom
      const isOfficial = bambuFilaments.some(
        (bm) =>
          bm.name.toLowerCase() === lc.materialName.toLowerCase() &&
          bm.types.some(
            (bt) =>
              bt.name.toLowerCase() === lc.typeName.toLowerCase() &&
              bt.colors.some((bc) => bc.name.toLowerCase() === lc.name.toLowerCase()),
          ),
      );
      if (!isOfficial) {
        colorNode.isCustom = true;
      }
    }
  });

  return merged;
};
