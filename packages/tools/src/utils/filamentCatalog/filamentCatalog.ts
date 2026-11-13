import { bambuFilaments } from "../bambuFilaments";
import type { LookupColor, LookupMaterial, LookupType } from "../../api/lookups";

/**
 * The one place that answers catalog questions (built-in Bambu filaments + the user's lookups)
 * and defines lookup identity: names compare trimmed and case-insensitive, a type is scoped by
 * its material, a colour by its material + type.
 */

/** A filament as stored on templates and spools (text values). */
export type FilamentRef = {
  material: string;
  type: string;
  colorName: string;
};

export type FilamentColor = {
  id?: string;
  name: string;
  hex: string;
  isCustom?: boolean;
};

export type FilamentType = {
  id?: string;
  name: string;
  colors: FilamentColor[];
  isCustom?: boolean;
};

export type FilamentMaterial = {
  id?: string;
  name: string;
  types: FilamentType[];
  isCustom?: boolean;
};

export const normalizeName = (name: string): string => name.trim().toLowerCase();

export const isSameName = (a: string, b: string): boolean => normalizeName(a) === normalizeName(b);

export const findCatalogColor = ({ material, type, colorName }: FilamentRef) =>
  bambuFilaments
    .find((m) => isSameName(m.name, material))
    ?.types.find((t) => isSameName(t.name, type))
    ?.colors.find((c) => isSameName(c.name, colorName));

/** Hex to show: a catalog colour always uses the catalog, a custom colour keeps its stored hex (white included). */
export const resolveColorHex = (filament: FilamentRef & { colorHex: string }): string =>
  findCatalogColor(filament)?.hex ?? filament.colorHex;

/** Saved hex of a custom colour: its lookup first, then a template with the same material + type + colour. */
export const findCustomColorHex = (
  filament: FilamentRef,
  lookupColors: LookupColor[],
  templates: Array<FilamentRef & { colorHex: string }>,
): string | undefined => {
  const lookup = lookupColors.find(
    (c) =>
      isSameName(c.materialName, filament.material) &&
      isSameName(c.typeName, filament.type) &&
      isSameName(c.name, filament.colorName),
  );
  if (lookup?.hex) return lookup.hex;

  const template = templates.find(
    (t) =>
      isSameName(t.material, filament.material) &&
      isSameName(t.type, filament.type) &&
      isSameName(t.colorName, filament.colorName),
  );
  return template?.colorHex || undefined;
};

/** Catalog tree merged with the user's lookups; nodes from lookups carry their `id` and `isCustom` when not in the catalog. */
export const buildFilamentOptions = (
  lookupMaterials: LookupMaterial[],
  lookupTypes: LookupType[],
  lookupColors: LookupColor[],
): FilamentMaterial[] => {
  const merged: FilamentMaterial[] = structuredClone(bambuFilaments);

  const materialNode = (name: string, id?: string): FilamentMaterial => {
    let node = merged.find((m) => isSameName(m.name, name));
    if (!node) {
      node = { name, types: [], isCustom: true };
      merged.push(node);
    }
    if (id) node.id = id;
    return node;
  };

  const typeNode = (materialName: string, name: string, id?: string): FilamentType => {
    const material = materialNode(materialName);
    let node = material.types.find((t) => isSameName(t.name, name));
    if (!node) {
      node = { name, colors: [], isCustom: true };
      material.types.push(node);
    }
    if (id) node.id = id;
    return node;
  };

  lookupMaterials.forEach((lm) => materialNode(lm.name, lm.id));
  lookupTypes.forEach((lt) => typeNode(lt.materialName, lt.name, lt.id));
  lookupColors.forEach((lc) => {
    const type = typeNode(lc.materialName, lc.typeName);
    const node = type.colors.find((c) => isSameName(c.name, lc.name));
    if (node) {
      node.id = lc.id;
      // A catalog colour keeps the catalog hex (see resolveColorHex)
      if (node.isCustom) node.hex = lc.hex;
    } else {
      type.colors.push({ id: lc.id, name: lc.name, hex: lc.hex, isCustom: true });
    }
  });

  return merged;
};
