export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-brand">
        <div className="app-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path
              d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h1>SaaS Analyzer</h1>
      </div>

      <div className="app-avatar" aria-hidden="true" />
    </header>
  );
}
