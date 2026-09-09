import type { FilamentTemplate } from "../../../api/templates";

export type TemplateFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData?: FilamentTemplate | null;
};

export type DeleteLookupTarget =
  | { kind: "material"; id: string; name: string }
  | { kind: "type"; id: string; materialName: string; name: string }
  | { kind: "color"; id: string; name: string };
