import { SettingsView } from "./pages/SettingsView";

// Exposed by the federation plugin as 'settings/App'.
// Consumers render it lazily via `lazyProvider('settings', 'App')`.
export function App() {
  return (
    <section data-testid="settings">
      <SettingsView />
    </section>
  );
}

export default App;
