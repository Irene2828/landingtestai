"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, Info, Check, RotateCcw, X } from "lucide-react";

import { AnalysisSetupForm } from "@/components/analyzer/AnalysisSetupForm";
import { LiveStatesPanel } from "@/components/loading/LiveStatesPanel";
import { HowItWorksModal } from "@/components/home/HowItWorksModal";
import { AppHeader } from "@/components/shared/AppHeader";
import { useAnalysisStore } from "@/components/providers/AnalysisProvider";
import { AnalysisAccordion } from "@/components/results/AnalysisAccordion";
import { AxiomReportOverlay } from "@/components/results/AxiomReportOverlay";
import type { AnalyzeRequestPayload, AnalyzeApiResponse } from "@/lib/types";

export function LandingPageBase() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { setAnalysis, result, request } = useAnalysisStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (showResults && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showResults]);



  const handleStartAnalysis = async (url: string, businessType: string, goal: string) => {
    setIsAnalyzing(true);
    setShowResults(false);
    setApiError(null);
    setAnalysis(null as any, null as any); // Clear old results
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      const request: AnalyzeRequestPayload = { url, businessType, goal };
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errBody: any = {};
        try {
          errBody = await response.json();
        } catch (_) {}

        if (response.status === 422 || errBody.error === "Page Not Found") {
          setApiError("We couldn't read this page. Try the homepage URL instead (e.g. https://example.com)");
          setIsAnalyzing(false);
          return;
        }
        throw new Error(errBody.details || errBody.error || `API returned ${response.status}`);
      }

      const result: AnalyzeApiResponse = await response.json();
      
      // Store the result
      setAnalysis(request, result);
      setIsAnalyzing(false);
      setShowResults(true);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Analysis cancelled by user');
      } else {
        console.error('Failed to analyze:', error);
        alert(error.message || 'An error occurred during analysis. Please try again.');
        setIsAnalyzing(false);
      }
    }
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
  };

  return (
    <>
      <AppHeader />

      <main className="setup-main" style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '144px' }}>
        <div className="setup-container" style={{ width: '100%', maxWidth: '1152px', padding: '0 16px' }}>
          
          <style>{`
            .hero-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
              width: 100%;
              align-items: flex-start;
              padding-top: 10px;
              padding-bottom: 0px;
            }
            .intake-form-section {
              padding-top: 0px !important;
            }
            .app-footer-container {
              flex-direction: column !important;
              gap: 20px !important;
              align-items: center !important;
              text-align: center !important;
            }
            .footer-links {
              flex-direction: column !important;
              gap: 12px !important;
              align-items: center !important;
            }
            @media (min-width: 640px) {
              .app-footer-container {
                flex-direction: row !important;
                justify-content: space-between !important;
                gap: 0px !important;
              }
              .footer-links {
                flex-direction: row !important;
                gap: 32px !important;
              }
            }
            .main-hero-title {
              font-size: 38px !important;
              font-weight: 700;
              color: #111827;
              line-height: 1.15 !important;
              letter-spacing: -0.02em;
              margin: 0 0 24px 0;
            }
            @media (min-width: 480px) {
              .main-hero-title {
                font-size: 48px !important;
              }
            }
            @media (min-width: 900px) {
              .main-hero-title {
                font-size: 64px !important;
                line-height: 1.1 !important;
              }
              .hero-grid {
                grid-template-columns: 1.1fr 0.9fr;
                gap: 100px;
              }
              .intake-form-section {
                padding-top: 60px !important;
              }
            }
            .tooltip-bubble {
              position: absolute !important;
              bottom: calc(100% + 8px) !important;
              right: -30px !important;
              left: auto !important;
              width: 280px !important;
              background-color: #1F2937 !important;
              color: #FFFFFF !important;
              padding: 16px !important;
              border-radius: 12px !important;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
              z-index: 50 !important;
              font-size: 12px !important;
              line-height: 1.5 !important;
              font-weight: 450 !important;
              opacity: 0 !important;
              visibility: hidden !important;
              transform: translateY(-6px) !important;
              transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
              pointer-events: none !important;
              text-align: left !important;
            }
            .tooltip-bubble.tooltip-visible {
              opacity: 1 !important;
              visibility: visible !important;
              transform: translateY(0) !important;
            }
            @media (min-width: 480px) {
              .tooltip-bubble {
                left: 50% !important;
                right: auto !important;
                transform: translateX(-50%) translateY(-6px) !important;
              }
              .tooltip-bubble.tooltip-visible {
                transform: translateX(-50%) translateY(0) !important;
              }
            }
          `}</style>
          
          <section style={{ padding: '12px 0 20px 0', position: 'relative' }}>
            <div className="hero-grid">
              {/* LEFT COLUMN: Narrative + Live States */}
              <div>
                <h1 className="main-hero-title" style={{ 
                  fontWeight: 700, 
                  color: '#111827'
                }}>
                  <span style={{ position: 'relative', display: 'inline-block' }}>
                    <span style={{ 
                      color: '#111827',
                      display: 'inline-block'
                    }}>
                      Uncover
                    </span>
                    <svg 
                      viewBox="0 0 100 10" 
                      preserveAspectRatio="none" 
                      style={{ position: 'absolute', bottom: '-8px', left: 0, width: '100%', height: '8px' }}
                    >
                      <defs>
                        <linearGradient id="brandUnderlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#0057FF" />
                          <stop offset="100%" stopColor="#00A69C" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M0 8 Q 50 2 100 8" 
                        stroke="url(#brandUnderlineGradient)" 
                        strokeWidth="3" 
                        fill="none" 
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <br />
                  your website's
                  <br />
                  next {' '}
                  <span style={{ 
                    background: 'linear-gradient(135deg, #0057FF, #00A69C)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block'
                  }}>
                    advantage.
                  </span>
                </h1>
                <div style={{ maxWidth: '600px', margin: '0 0 40px 0' }}>
                  <p style={{ fontSize: '18px', color: '#6B7280', fontWeight: 400, margin: 0, lineHeight: 1.5 }}>
                    See exactly where your website is losing customers — <br />and what to do about it.
                  </p>
                </div>

                {/* Analyzing State (Spinner + Steps) */}
                {isAnalyzing && (
                  <div style={{ 
                    marginTop: '40px',
                    width: '100%',
                    maxWidth: '500px'
                  }}>
                    <LiveStatesPanel />
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Intake Form */}
              <section className="intake-form-section" style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <div style={{ width: '100%', maxWidth: '440px' }}>
                    <div style={{
                      opacity: isAnalyzing ? 0.6 : 1,
                      pointerEvents: isAnalyzing ? 'none' : 'auto',
                      transition: 'opacity 0.3s ease'
                    }}>
                      <AnalysisSetupForm 
                        key={formKey}
                        id="setup-form"
                        isAnalyzing={isAnalyzing}
                        disabled={showResults}
                        urlError={apiError}
                        onStartAnalysis={handleStartAnalysis}
                        onCancelAnalysis={handleCancelAnalysis}
                        onValidationChange={setCanSubmit}
                      />
                    </div>
                    
                    <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          type={isAnalyzing ? "button" : "submit"}
                          form={isAnalyzing ? undefined : "setup-form"}
                          onClick={isAnalyzing ? handleCancelAnalysis : undefined}
                          disabled={showResults || (!isAnalyzing && !canSubmit)}
                          style={{
                            height: '52px',
                            padding: '0 32px',
                            borderRadius: '26px',
                            background: isAnalyzing 
                              ? '#FFFFFF' 
                              : (showResults 
                                  ? '#E5E7EB' 
                                  : (canSubmit 
                                      ? 'linear-gradient(135deg, #0057FF, #00A69C)' 
                                      : 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #0057FF, #00A69C) border-box'
                                    )
                                ),
                            border: isAnalyzing 
                              ? '1px solid #D1D5DB' 
                              : (showResults 
                                  ? 'none' 
                                  : (canSubmit 
                                      ? 'none' 
                                      : '1px solid transparent'
                                    )
                                ),
                            color: isAnalyzing 
                              ? '#4B5563' 
                              : (showResults 
                                  ? '#9CA3AF' 
                                  : (canSubmit 
                                      ? '#FFFFFF' 
                                      : '#0D0D0D'
                                    )
                                ),
                            fontSize: '16px',
                            fontWeight: 600,
                            cursor: (showResults || (!isAnalyzing && !canSubmit)) ? 'default' : 'pointer',
                            boxShadow: 'none',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            opacity: showResults ? 0.7 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (isAnalyzing) {
                              e.currentTarget.style.background = '#F3F4F6';
                              e.currentTarget.style.color = '#1F2937';
                              e.currentTarget.style.borderColor = '#9CA3AF';
                            } else if (!showResults && canSubmit) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isAnalyzing) {
                              e.currentTarget.style.background = '#FFFFFF';
                              e.currentTarget.style.color = '#4B5563';
                              e.currentTarget.style.borderColor = '#D1D5DB';
                            } else if (!showResults && canSubmit) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                          aria-label={isAnalyzing ? 'Cancel Analysis' : (showResults ? 'Website Analyzed' : 'Analyze Conversion Potential')}
                        >
                          {isAnalyzing ? (
                            <>
                              Cancel Analysis
                              <X size={20} strokeWidth={2.5} />
                            </>
                          ) : showResults ? (
                            <>
                              Website Analyzed
                              <Check size={20} strokeWidth={2.5} />
                            </>
                          ) : (
                            <>
                              Analyze Your Website
                              <ArrowUpRight size={20} strokeWidth={2.5} />
                            </>
                          )}
                        </button>

                        {showResults && (
                          <button
                            type="button"
                            onClick={() => {
                              setAnalysis(null as any, null as any);
                              setShowResults(false);
                              setApiError(null);
                              setFormKey(prev => prev + 1);
                            }}
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '50%',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #D1D5DB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#4B5563',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#0057FF';
                              e.currentTarget.style.color = '#0057FF';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 87, 255, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#D1D5DB';
                              e.currentTarget.style.color = '#4B5563';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                            title="Reset Form and Start Over"
                            aria-label="Reset form"
                          >
                            <RotateCcw size={20} strokeWidth={2.2} />
                          </button>
                        )}
                      </div>
                      <style>{`
                        @keyframes spin {
                          to { transform: rotate(360deg); }
                        }
                      `}</style>
                      
                      <p style={{ 
                        marginTop: '16px', 
                        fontSize: '11px', 
                        lineHeight: 1.4, 
                        color: '#6B7280', 
                        textAlign: 'center',
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}>
                        <span>AI-powered analysis. Human-refined logic.</span>
                        
                        {/* Info Icon & Hover Tooltip */}
                        <span 
                          style={{
                            position: 'relative',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9CA3AF',
                            transition: 'color 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#0057FF';
                            const tooltip = e.currentTarget.querySelector('.tooltip-bubble') as HTMLElement;
                            if (tooltip) {
                              tooltip.classList.add('tooltip-visible');
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#9CA3AF';
                            const tooltip = e.currentTarget.querySelector('.tooltip-bubble') as HTMLElement;
                            if (tooltip) {
                              tooltip.classList.remove('tooltip-visible');
                            }
                          }}
                          onClick={(e) => {
                            const tooltip = e.currentTarget.querySelector('.tooltip-bubble') as HTMLElement;
                            if (tooltip) {
                              tooltip.classList.toggle('tooltip-visible');
                            }
                          }}
                        >
                          <Info size={14} strokeWidth={2.5} />
                          
                          {/* Tooltip Bubble */}
                          <div className="tooltip-bubble">
                            <div style={{ fontWeight: 600, color: '#00A69C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>
                              How it works
                            </div>
                            Our conversion engine runs a multi-agent UX analysis of your page:
                            <ul style={{ margin: '8px 0 0 0', paddingLeft: '16px', color: '#D1D5DB', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <li><strong>Positioning:</strong> Evaluates value proposition clarity.</li>
                              <li><strong>UX Hierarchy:</strong> Audits visual pathing and layout flow.</li>
                              <li><strong>Copy Relevance:</strong> Measures industry-specific persuasion score.</li>
                            </ul>
                          </div>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>

      {showResults && (
        <>
          <div ref={resultsRef} style={{ width: '100%' }}>
            <AxiomReportOverlay 
              isOpen={showResults} 
              result={result} 
              url={request?.url || ""}
            />
          </div>
        </>
      )}
      </main>

      <div style={{ 
        width: '75%', 
        height: '1px', 
        backgroundColor: '#E5E7EB',
        margin: '0 auto 10px auto',
        opacity: 0.8
      }} />

      <footer style={{ 
        width: '100%', 
        padding: '10px 0 30px 0', 
        backgroundColor: '#FFFFFF',
        borderTop: 'none'
      }}>
        <div className="app-footer-container" style={{ 
          maxWidth: '1152px', 
          margin: '0 auto', 
          padding: '0 24px', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #0057FF, #00A69C)' }} />
            <span style={{ 
              fontSize: '13px', 
              fontWeight: 700, 
              background: 'linear-gradient(135deg, #0057FF, #00A69C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.04em',
              display: 'inline-block'
            }}>AXIOM</span>
          </div>
          <div className="footer-links" style={{ display: 'flex' }}>
            <a href="#" style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textDecoration: 'none', transition: 'color 0.2s' }}>Privacy Policy</a>
            <a href="#" style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textDecoration: 'none', transition: 'color 0.2s' }}>Terms of Service</a>
            <span style={{ fontSize: '12px', color: '#D1D5DB' }}>© 2026</span>
          </div>
        </div>
      </footer>

      <HowItWorksModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
