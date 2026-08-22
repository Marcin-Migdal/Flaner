import { useRoutes, type RouteObject } from "react-router";
import { routes } from "./routes";

export function App() {
  const element = useRoutes(routes as RouteObject[]);
  return (
    <section data-testid="planning" className="h-full w-full flex-1 flex flex-col min-h-0">
      {element}
    </section>
  );
}

export default App;
