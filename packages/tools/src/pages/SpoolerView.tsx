import React, { useMemo, useState } from "react";
import { Disc, Layers, Settings, ShoppingBag } from "lucide-react";
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@flaner/ui-components";
import {
  useGetSpoolsQuery,
  useGetTemplatesQuery,
  useToolsTranslations,
} from "../hooks";
import { SpoolsTab } from "../components/spools/SpoolsTab";
import { TemplatesTab } from "../components/templates/TemplatesTab";
import { SpoolerSettingsModal } from "../components/settings/SpoolerSettingsModal";

export const SpoolerView: React.FC = () => {
  const { t } = useToolsTranslations();
  const [activeTab, setActiveTab] = useState<string>("spools");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const { data: spools = [] } = useGetSpoolsQuery();
  const { data: templates = [], isLoading: isLoadingTemplates } = useGetTemplatesQuery();

  const activeSpools = useMemo(() => spools.filter((s) => !s.isFinished), [spools]);
  const finishedSpools = useMemo(() => spools.filter((s) => s.isFinished), [spools]);

  const totalRemainingGrams = useMemo(
    () => activeSpools.reduce((acc, s) => acc + (s.currentWeight || 0), 0),
    [activeSpools],
  );

  const totalWeightFormatted =
    totalRemainingGrams >= 1000
      ? `${(totalRemainingGrams / 1000).toFixed(2)} kg`
      : `${totalRemainingGrams.toFixed(0)} g`;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="text-left space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Disc className="size-7 text-brand" />
            <span>{t("spooler.title")}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("spooler.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 text-xs"
          >
            <Settings className="size-3.5" />
            <span>{t("spooler.settings.preferences")}</span>
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 text-left shadow-xs">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <ShoppingBag className="size-3.5 text-brand" />
            {t("spooler.stats.totalWeight")}
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">{totalWeightFormatted}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 text-left shadow-xs">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Disc className="size-3.5 text-emerald-500" />
            {t("spooler.stats.activeSpools")}
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">{activeSpools.length}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 text-left shadow-xs">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Layers className="size-3.5 text-muted-foreground" />
            {t("spooler.stats.emptySpools")}
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">{finishedSpools.length}</p>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex justify-start">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="spools" className="px-5 py-2 text-xs font-semibold rounded-lg">
              {t("spooler.tabs.spools")} ({activeSpools.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="px-5 py-2 text-xs font-semibold rounded-lg">
              {t("spooler.tabs.templates")} ({templates.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="spools" className="w-full">
          <SpoolsTab
            templates={templates}
            onNavigateToTemplates={() => setActiveTab("templates")}
          />
        </TabsContent>

        <TabsContent value="templates" className="w-full">
          <TemplatesTab
            templates={templates}
            isLoading={isLoadingTemplates}
          />
        </TabsContent>
      </Tabs>

      {/* Settings Modal */}
      <SpoolerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default SpoolerView;
