// Exposed by the federation plugin as 'scheduling/App'.
// Consumers render it lazily via `lazyProvider('scheduling', 'App')`.
export function App() {
  return (
    <section data-testid="scheduling">
      <h1>Hello from scheduling</h1>
    </section>
  );
}

export default App;
