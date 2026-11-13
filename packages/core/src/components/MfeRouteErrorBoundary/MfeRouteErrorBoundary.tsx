import { useRouteError, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

export function MfeRouteErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();
  const { t } = useTranslation();

  // Dynamically extract the MFE name from the URL path (e.g. /community/friends -> "community")
  const mfeName = location.pathname.split("/")[1] || "mfe";

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-danger-subtle border border-danger/30 rounded-xl text-center max-w-md mx-auto my-12 animate-in fade-in duration-300">
      <div className="w-12 h-12 rounded-full bg-danger-subtle flex items-center justify-center text-danger-text mb-4 font-bold text-xl">
        !
      </div>
      <h2 className="text-danger-text font-semibold mb-2">{t("errorBoundary.title", { name: mfeName })}</h2>
      <p className="text-muted-foreground text-sm mb-4">{t("errorBoundary.desc")}</p>
      <code className="text-xs bg-danger-subtle text-danger-text px-2 py-1 rounded font-mono">
        {(error instanceof Error && error.message) || t("errorBoundary.unknownError")}
      </code>
    </div>
  );
}

export default MfeRouteErrorBoundary;
