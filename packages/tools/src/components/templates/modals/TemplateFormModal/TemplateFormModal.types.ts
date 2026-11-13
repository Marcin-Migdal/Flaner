import type { FilamentTemplate } from "../../../../api/templates";

export type TemplateFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData?: FilamentTemplate | null;
};

/** A lookup is identified by its names (see `utils/filamentCatalog`), not by a document id. */
export type DeleteLookupTarget =
  | { kind: "material"; name: string }
  | { kind: "type"; materialName: string; name: string }
  | { kind: "color"; materialName: string; typeName: string; name: string };
