// Exposed by the federation plugin as 'shopping/App'.
// Consumers render it lazily via `lazyProvider('shopping', 'App')`.
export function App() {
  return (
    <section data-testid="shopping">
      <h1>Hello from shopping</h1>
    </section>
  );
}

export default App;
