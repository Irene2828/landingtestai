"use client";

import { useState } from "react";
import type { SectionAnalysis } from "@/lib/types";

type ResultsSummaryProps = {
  score: number;
  summary: string;
  sections: SectionAnalysis[];
  url?: string;
};

export function ResultsSummary({
  score,
  summary,
  sections,
  url = "Website"
}: ResultsSummaryProps) {
  // Strip http:// or https:// and www. for display
  const displayUrl = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
  
  const strongCount = sections.filter(s => s.status === 'strong').length;
  const needsWorkCount = sections.filter(s => s.status === 'needs-work').length;
  const missingCount = sections.filter(s => s.status === 'missing').length;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '64px', justifyContent: 'space-between', alignItems: 'flex-end' }} className="md-flex-row">
      <style>{`
        @media (min-width: 768px) {
          .md-flex-row {
            flex-direction: row !important;
          }
        }
      `}</style>
      <div style={{ maxWidth: '42rem' }}>

        <h1 style={{ fontFamily: 'var(--font-manrope)', fontSize: '64px', fontWeight: 800, color: '#191c1e', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '16px', wordBreak: 'break-word' }}>
          {displayUrl}
        </h1>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: '18px', color: '#3e4949', lineHeight: 1.6, fontWeight: 400, margin: 0 }}>
          <strong style={{ fontWeight: 600 }}>Executive Summary:</strong> {summary}
        </p>
      </div>
      
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', borderRadius: '12px', borderColor: 'rgba(0, 128, 128, 0.2)', background: 'rgba(0, 101, 101, 0.05)', minWidth: '240px' }}>
        <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '14px', fontWeight: 500, letterSpacing: '0.05em', color: '#006565', textTransform: 'uppercase', marginBottom: '8px' }}>
          Overall Score
        </span>
        <div style={{ position: 'relative' }}>
          <span style={{ fontFamily: 'var(--font-manrope)', fontSize: '96px', fontWeight: 800, color: '#006565', lineHeight: 1 }}>
            {score}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#006565', fontFamily: 'var(--font-manrope)', fontSize: '20px', fontWeight: 600, lineHeight: 1.4 }}>
              {strongCount}
            </div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.05em', color: '#3e4949', textTransform: 'uppercase' }}>
              Strong
            </div>
          </div>
          <div style={{ width: '1px', height: '32px', background: '#bdc9c8', alignSelf: 'center' }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#565e74', fontFamily: 'var(--font-manrope)', fontSize: '20px', fontWeight: 600, lineHeight: 1.4 }}>
              {needsWorkCount + missingCount}
            </div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.05em', color: '#3e4949', textTransform: 'uppercase' }}>
              Needs Work
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
