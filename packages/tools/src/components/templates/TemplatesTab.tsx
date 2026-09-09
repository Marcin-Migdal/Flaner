import React, { useState } from "react";
import { Archive, Layers, Loader2, Plus } from "lucide-react";
import { Button } from "@flaner/ui-components";
import type { FilamentTemplate } from "../../api/templates";
import { TemplateItem } from "./TemplateItem";
import { TemplateFormModal } from "./modals/TemplateFormModal";
import { DeleteTemplateModal } from "./modals/DeleteTemplateModal";
import { useToolsTranslations } from "../../hooks";

type TemplatesTabProps = {
  templates: FilamentTemplate[];
  isLoading: boolean;
};

export const TemplatesTab: React.FC<TemplatesTabProps> = ({
  templates,
  isLoading,
}) => {
  const { t } = useToolsTranslations();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FilamentTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<FilamentTemplate | null>(null);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-left">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layers className="size-5 text-brand" />
            {t("spooler.templates.title")} ({templates.length})
          </h2>
          <p className="text-muted-foreground text-xs mt-1">
            {t("spooler.templates.subtitle")}
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingTemplate(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>{t("spooler.templates.addTemplate")}</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 text-brand animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="w-full bg-card/40 border border-dashed border-border rounded-2xl py-12 px-4 text-center">
          <Archive className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">{t("spooler.templates.noTemplates")}</p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            {t("spooler.templates.addFirstTemplatePrompt")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <TemplateItem
              key={template.id}
              template={template}
              onEdit={() => {
                setEditingTemplate(template);
                setIsFormOpen(true);
              }}
              onDelete={() => setDeletingTemplate(template)}
            />
          ))}
        </div>
      )}

      <TemplateFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTemplate(null);
        }}
        initialData={editingTemplate}
      />

      <DeleteTemplateModal
        isOpen={!!deletingTemplate}
        onClose={() => setDeletingTemplate(null)}
        template={deletingTemplate}
      />
    </div>
  );
};

export default TemplatesTab;
