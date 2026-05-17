import Link from "next/link";
import { CircleUserRound } from "lucide-react";

export function AppHeader() {
  return (
    <header className="app-header" style={{
      height: '56px',
      width: '100%',
      background: '#FFFFFF',
      borderBottom: '1px solid #EBEBEB',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1280px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link href="/" className="app-brand" aria-label="Go to homepage" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ 
            fontWeight: 700, 
            fontSize: '1.1rem', 
            background: 'linear-gradient(135deg, #0057FF, #00A69C)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            display: 'inline-block'
          }}>Axiom</span>
          <span style={{ 
            fontSize: '0.8rem', 
            color: '#6B6B6B', 
            fontWeight: 500, 
            letterSpacing: '0.01em', 
            fontStyle: 'italic'
          }}>
            / Website Analyzer
          </span>
        </Link>

      </div>
    </header>
  );
}
