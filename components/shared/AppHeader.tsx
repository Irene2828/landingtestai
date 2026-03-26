import Link from "next/link";

const DEFAULT_TAGLINE = "AI-powered. Designed for designers.";

type AppHeaderProps = {
  tagline?: string;
};

export function AppHeader({ tagline }: AppHeaderProps) {
  const resolvedTagline = tagline ?? DEFAULT_TAGLINE;

  return (
    <header className="app-header">
      <Link href="/" className="app-brand" aria-label="Go to homepage">
        <div className="app-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path
              d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355Z"
              fill="var(--primary)"
            />
            <path
              d="M21 35.7574V12.2426L9.24264 24L21 35.7574Z"
              fill="var(--warning)"
            />
          </svg>
        </div>
        <div className="app-brand-copy">
          <h1>
            <span className="app-brand-title-row">
              <span>SAAS Landing Page Analyzer</span>
              <span className="app-beta-label">Beta</span>
            </span>
          </h1>
          <p className="app-brand-tagline">{resolvedTagline}</p>
        </div>
      </Link>

      <div className="app-avatar" aria-hidden="true">
        <span className="material-symbols-outlined app-avatar-icon">
          account_circle
        </span>
      </div>
    </header>
  );
}
