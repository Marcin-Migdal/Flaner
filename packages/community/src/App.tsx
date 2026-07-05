// Exposed by the federation plugin as 'community/App'.
// Consumers render it lazily via `lazyProvider('community', 'App')`.
export function App() {
  return (
    <section data-testid="community">
      <h1>Hello from community</h1>
    </section>
  );
}

export default App;
