import { useRoutes } from "react-router";
import { BudgetProvider } from "./context/BudgetContext";
import { routes } from "./routes";

export function App() {
  const element = useRoutes(routes);
  return (
    <section data-testid="planning" className="h-full w-full flex-1 flex flex-col min-h-0">
      {/* Above the routes, so the unlocked budget survives moving between Budget pages and other planning views */}
      <BudgetProvider>{element}</BudgetProvider>
    </section>
  );
}

export default App;
