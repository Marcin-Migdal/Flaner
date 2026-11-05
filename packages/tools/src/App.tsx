import { useRoutes, type RouteObject } from "react-router";
import { TooltipProvider } from "@flaner/ui-components";
import { routes } from "./routes";

export function App() {
  const element = useRoutes(routes as RouteObject[]);
  return (
    <TooltipProvider>
      <section data-testid="tools" className="h-full w-full flex-1 flex flex-col min-h-0">
        {element}
      </section>
    </TooltipProvider>
  );
}

export default App;
