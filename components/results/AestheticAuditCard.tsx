"use client";

import { Palette, Ruler } from "lucide-react";

type AestheticAuditCardProps = {
  score: number;
  visualGap: string;
  designFix: string;
};

export function AestheticAuditCard({ 
  score, 
  visualGap, 
  designFix 
}: AestheticAuditCardProps) {
  return (
    <div style={{ 
      background: '#FFFFFF', 
      borderRadius: '24px', 
      border: '1px solid rgba(0, 0, 0, 0.05)', 
      padding: '40px',
      marginBottom: '64px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '40px',
      alignItems: 'center'
    }} className="aesthetic-card-md">
      <style>{`
        @media (min-width: 768px) {
          .aesthetic-card-md {
            grid-template-columns: 160px 1px 1fr !important;
          }
        }
      `}</style>
      
      {/* Score Section */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: '#9CA3AF', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em', 
          marginBottom: '12px' 
        }}>
          Visual Integrity
        </div>
        <div style={{ 
          fontSize: '72px', 
          fontWeight: 800, 
          color: '#0D0D0D', 
          lineHeight: 1,
          letterSpacing: '-0.04em'
        }}>
          {score}<span style={{ fontSize: '24px', color: '#E5E7EB', fontWeight: 400 }}>/100</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '100px', background: 'rgba(0, 0, 0, 0.05)', display: 'none' }} className="md-divider" />
      <style>{`
        @media (min-width: 768px) {
          .md-divider { display: block !important; }
        }
      `}</style>

      {/* Findings Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }} className="md-findings-grid">
        <style>{`
          @media (min-width: 768px) {
            .md-findings-grid {
              grid-template-columns: 1fr 1fr !important;
              gap: 48px !important;
            }
          }
        `}</style>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(0, 87, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0057FF' }}>
              <Palette size={16} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0D0D0D', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Primary Visual Gap
            </h3>
          </div>
          <p style={{ fontSize: '16px', color: '#4B5563', lineHeight: 1.6, fontWeight: 400, margin: 0 }}>
            {visualGap}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(9, 184, 179, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#09B8B3' }}>
              <Ruler size={16} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0D0D0D', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Design System Fix
            </h3>
          </div>
          <p style={{ fontSize: '16px', color: '#4B5563', lineHeight: 1.6, fontWeight: 400, margin: 0 }}>
            {designFix}
          </p>
        </div>
      </div>
    </div>
  );
}
