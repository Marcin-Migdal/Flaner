import { useRoutes, type RouteObject } from "react-router";
import { routes } from "./routes";

// Exposed by the federation plugin as 'community/App'.
// Consumers render it lazily via `lazyProvider('community', 'App')`.
export function App() {
  const element = useRoutes(routes as RouteObject[]);
  return (
    <section data-testid="community">
      {element}
    </section>
  );
}

export default App;
