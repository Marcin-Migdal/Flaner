import { useRoutes } from "react-router";
import { routes } from "./routes";

// Exposed by the federation plugin as 'community/App'.
// Consumers render it lazily via `lazyProvider('community', 'App')`.
export function App() {
  const element = useRoutes(routes);
  return (
    <section data-testid="community">
      {element}
    </section>
  );
}

export default App;
