import Link from "next/link";

type ResultsOpportunitiesProps = {
  opportunities: string[];
  agencyAngle: string[];
};

export function ResultsOpportunities({
  opportunities,
  agencyAngle
}: ResultsOpportunitiesProps) {
  return (
    <section aria-label="Bottom opportunities and partner section">
      <style>{`
        .opps-bento-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .opps-bento-grid {
            grid-template-columns: repeat(12, 1fr);
          }
        }
      `}</style>
      <div className="opps-bento-grid">
        
        {/* Left Card: Top 3 Opportunities (spans 7 cols) */}
        <div style={{ gridColumn: 'span 7' }}>
          <h2 style={{ fontFamily: 'var(--font-manrope)', fontSize: '32px', fontWeight: 800, color: '#191c1e', marginBottom: '32px' }}>
            Top 3 Opportunities
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {opportunities.map((item, i) => (
              <div 
                key={i} 
                style={{ 
                  display: 'flex',
                  gap: '24px',
                  alignItems: 'flex-start',
                  padding: '24px',
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 128, 128, 0.1)'
                }}
              >
                <div style={{ 
                  fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#006565',
                  background: 'rgba(0, 101, 101, 0.05)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {i + 1}
                </div>
                
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: '16px', color: '#3e4949', lineHeight: 1.6, paddingTop: '12px' }}>
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Agency Angle (spans 5 cols) */}
        <div style={{ gridColumn: 'span 5' }}>
          <div className="glass-card" style={{ 
            borderRadius: '16px', 
            padding: '40px', 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            background: 'linear-gradient(135deg, #006565 0%, #004f4f 100%)',
            borderColor: 'rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '14px', fontWeight: 500, letterSpacing: '0.05em', color: '#93f2f2', textTransform: 'uppercase', marginBottom: '24px' }}>
              Where a web partner comes in
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flexGrow: 1, marginBottom: '40px' }}>
              {agencyAngle.map((item, i) => (
                <p key={i} style={{ fontFamily: 'var(--font-inter)', fontSize: '16px', color: '#ffffff', margin: 0, lineHeight: 1.6 }}>
                  {item}
                </p>
              ))}
            </div>
            
            <Link 
              href="#" 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                color: '#006565',
                fontFamily: 'var(--font-manrope)',
                fontSize: '16px',
                fontWeight: 700,
                padding: '16px 32px',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                alignSelf: 'flex-start'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f7f9fb';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'none';
              }}
            >
              Book a Strategy Call
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
