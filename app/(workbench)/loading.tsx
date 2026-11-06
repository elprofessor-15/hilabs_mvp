export default function Loading() {
  return (
    <main className="page-content" aria-label="Loading workbench">
      <div className="skeleton" style={{ width: 150, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: 260, height: 28, marginBottom: 24 }} />
      <div className="stat-grid">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="skeleton" style={{ height: 82 }} />)}
      </div>
      <div className="skeleton section-spacer" style={{ height: 320 }} />
    </main>
  );
}
