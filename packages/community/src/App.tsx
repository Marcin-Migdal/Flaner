import { FriendsView } from "./pages/FriendsView";

// Exposed by the federation plugin as 'community/App'.
// Consumers render it lazily via `lazyProvider('community', 'App')`.
export function App() {
  return (
    <section data-testid="community">
      <FriendsView />
    </section>
  );
}

export default App;
