"use client";

export default function WorkbenchError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-content">
      <div className="empty-state" role="alert">
        <h1 className="section-title">This page could not be loaded</h1>
        <p className="section-description">The synthetic workbench data is local. Try loading this view again.</p>
        <button className="button button-secondary section-spacer" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
