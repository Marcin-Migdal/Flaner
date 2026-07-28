import { useRouteError, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

export function MfeRouteErrorBoundary() {
  const error = useRouteError() as Error;
  const location = useLocation();
  const { t } = useTranslation();

  // Dynamically extract the MFE name from the URL path (e.g. /community/friends -> "community")
  const mfeName = location.pathname.split("/")[1] || "mfe";

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/50 border border-red-900/50 rounded-xl text-center max-w-md mx-auto my-12 animate-in fade-in duration-300">
      <div className="w-12 h-12 rounded-full bg-red-950 flex items-center justify-center text-red-500 mb-4 font-bold text-xl">
        !
      </div>
      <h2 className="text-red-400 font-semibold mb-2">{t("errorBoundary.title", { name: mfeName })}</h2>
      <p className="text-zinc-400 text-sm mb-4">{t("errorBoundary.desc")}</p>
      <code className="text-xs bg-red-950/40 text-red-300 px-2 py-1 rounded font-mono">
        {error?.message || t("errorBoundary.unknownError")}
      </code>
    </div>
  );
}

export default MfeRouteErrorBoundary;
