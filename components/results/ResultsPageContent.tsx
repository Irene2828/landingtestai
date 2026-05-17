"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { isLikelyServiceBusiness } from "@/lib/business-type";
import { useAnalysisStore } from "@/components/providers/AnalysisProvider";

import { AnalysisContextHeader } from "./AnalysisContextHeader";
import { AnalysisAccordion } from "./AnalysisAccordion";
import { ResultsSummary } from "./ResultsSummary";
import { ResultsOpportunities } from "./ResultsOpportunities";
import { AestheticAuditCard } from "./AestheticAuditCard";

export function ResultsPageContent() {
  const { request, result: rawResult, isHydrated } = useAnalysisStore();
  const result = rawResult as any;

  if (!isHydrated) {
    return <main className="app-shell" style={{ background: '#f7f9fb' }} />;
  }

  if (!result) {
    return (
      <main className="app-shell" style={{ background: '#f7f9fb' }}>
        <div className="empty-state">
          <h2 className="empty-state-title" style={{ fontFamily: 'var(--font-manrope)' }}>No analysis available</h2>
          <p style={{ fontFamily: 'var(--font-inter)' }}>
            Start from the setup page to generate a landing page analysis.
          </p>
          <div className="empty-state-actions">
            <Link href="/" className="primary-link">
              Back to setup
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 24px', background: '#f7f9fb', fontFamily: 'var(--font-inter)' }}>
      <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', paddingTop: '64px', paddingBottom: '96px' }}>
        
        {/* Results Summary */}
        <ResultsSummary 
          score={result.overallScore} 
          summary={result.executiveSummary} 
          sections={result.sections}
          url={request?.url}
        />

        {/* Aesthetic Audit Section */}
        <AestheticAuditCard 
          score={result.aestheticScore}
          visualGap={result.primaryVisualGap}
          designFix={result.designSystemFix}
        />
        
        {/* 5 Result Cards */}
        <section aria-label="Detailed section analysis" style={{ marginBottom: '64px' }}>
          <AnalysisAccordion sections={result.sections} />
        </section>

        {/* Executive Summary / Partnership Message */}
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto 120px auto', 
          width: '100%',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0D0D0D', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Next Steps
          </h2>
          <p style={{ 
            fontSize: '18px', 
            lineHeight: 1.6, 
            color: '#374151', 
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            Want to turn these insights into a high-converting reality? Let's discuss how our team can help you implement these recommendations.
          </p>
          
          <a 
            href="https://calendly.com/your-team" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              padding: '0 32px',
              borderRadius: '26px',
              background: 'linear-gradient(135deg, #0057FF, #00A69C)',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0, 87, 255, 0.25)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Book a Call with Our Team
          </a>
        </div>
      </div>
    </main>
  );
}
