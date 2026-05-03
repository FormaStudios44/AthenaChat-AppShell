// StickyBanner.tsx
// Currently hidden from the UI — preserved here for future use.
// To re-enable: import StickyBanner and AthenaIntelligenceOverlay from this file,
// add intelligenceOpen state to AthenaChatExperience, and render both at the call sites.

import React, { useState } from 'react';

// ─── Highlight styles ─────────────────────────────────────────────────────────

const hlStyles = {
  blue:   { display:'inline-block', fontWeight:500, borderRadius:5, padding:'1px 7px', margin:'0 2px', fontSize:12, background:'#0C447C',  color:'#85B7EB' } as React.CSSProperties,
  amber:  { display:'inline-block', fontWeight:500, borderRadius:5, padding:'1px 7px', margin:'0 2px', fontSize:12, background:'#633806',  color:'#FAC775' } as React.CSSProperties,
  purple: { display:'inline-block', fontWeight:500, borderRadius:5, padding:'1px 7px', margin:'0 2px', fontSize:12, background:'#26215C',  color:'#AFA9EC' } as React.CSSProperties,
  green:  { display:'inline-block', fontWeight:500, borderRadius:5, padding:'1px 7px', margin:'0 2px', fontSize:12, background:'#173404',  color:'#97C459' } as React.CSSProperties,
};

const bigHlStyles = {
  blue:   { ...hlStyles.blue,   fontSize:17, padding:'2px 9px', borderRadius:6 } as React.CSSProperties,
  amber:  { ...hlStyles.amber,  fontSize:17, padding:'2px 9px', borderRadius:6 } as React.CSSProperties,
  purple: { ...hlStyles.purple, fontSize:17, padding:'2px 9px', borderRadius:6 } as React.CSSProperties,
  green:  { ...hlStyles.green,  fontSize:17, padding:'2px 9px', borderRadius:6 } as React.CSSProperties,
};

// ─── Intelligence data ────────────────────────────────────────────────────────

export const INTELLIGENCE_DATA = {
  firstSentence: (
    <>
      <span style={hlStyles.blue}>2,847 lapsed contacts</span> haven't heard from you in <span style={hlStyles.amber}>47 days</span> — your <span style={hlStyles.purple}>Q2 deadline</span> is 18 days out.
    </>
  ),
  fullSentence: (
    <>
      <span style={bigHlStyles.blue}>2,847 lapsed contacts</span> haven't heard from you in <span style={bigHlStyles.amber}>47 days</span> — your <span style={bigHlStyles.purple}>Q2 deadline</span> is 18 days out. Engagement peaks <span style={bigHlStyles.green}>Tuesdays 9–11am</span> and question-style subject lines lift opens by <span style={bigHlStyles.blue}>22%</span>.
    </>
  ),
  dataRows: [
    { icon: 'clock',    value: 'Spring Promo · 34% open rate',       meta: 'Last campaign'    },
    { icon: 'trend',    value: 'Question subject lines +22% opens',  meta: 'Pattern learned'  },
    { icon: 'calendar', value: 'Tuesdays 9–11am peak engagement',    meta: 'Best send window' },
  ],
  recommendations: [
    {
      type: 'Campaign',
      color: 'blue',
      title: 'Win-back: Q2 Re-engagement',
      description: 'Warm tone targeting 2,847 lapsed contacts. Personal subject line, low-pressure CTA, send Tuesday morning.',
      cta: 'Build this campaign',
      prompt: 'Build the Q2 re-engagement win-back campaign for my 2,847 lapsed contacts. Warm tone, personal subject line, Tuesday morning send.',
      why: 'Athena detected that 2,847 Zeta Luxury Hotels guests haven\'t engaged in 47 days — a pattern that historically becomes unrecoverable past 60. Your Q2 window closes in 18 days, making this the last viable moment to act before the segment goes cold.',
    },
    {
      type: 'Audience',
      color: 'purple',
      title: 'Segment: Lapsed 45–60 day contacts',
      description: 'Dynamic segment catching contacts before the 60-day threshold — while re-engagement is still viable.',
      cta: 'Build this segment',
      prompt: 'Create a dynamic audience segment for contacts inactive between 45 and 60 days.',
      why: 'Contacts in the 45–60 day window re-engage at 3× the rate of those past 60 days — this segment catches them while they\'re still warm. Building it now lets Athena automatically flag and trigger campaigns before each contact crosses the threshold.',
    },
  ],
  automations: [
    {
      id: 'tuesday',
      label: 'Auto-schedule sends for Tuesday mornings',
      prompt: 'Yes, let Athena auto-schedule sends for Tuesday mornings.',
      why: 'Your audience engages 3× more on Tuesday mornings between 9–11am. Automating send timing removes the guesswork and consistently hits the peak window — your Spring Promo\'s 34% open rate was sent on a Tuesday.',
    },
    {
      id: 'followup',
      label: 'Follow up non-openers after 48 hours',
      prompt: 'Yes, let Athena follow up non-openers 48 hours after every send.',
      why: 'Contacts who don\'t open within 48 hours are 60% less likely to engage after that window closes. An automated follow-up at 48h recovers an average of 18% of non-openers before the opportunity is lost.',
    },
    {
      id: 'lapsed',
      label: 'Flag lapsed contacts before 60 days',
      prompt: 'Yes, let Athena flag lapsed contacts before they hit 60 days.',
      why: 'Re-engagement drops sharply after 60 days of silence. Flagging contacts at 45–59 days lets Athena trigger a win-back while they\'re still warm — the window where your audience re-engages at 3× the rate of those past 60.',
    },
  ],
};

// ─── AthenaIntelligenceOverlay ────────────────────────────────────────────────

export const AthenaIntelligenceOverlay = ({
  onClose,
  onSendMessage,
  longHorizonSection,
}: {
  onClose: () => void;
  onSendMessage: (text: string) => void;
  longHorizonSection?: React.ReactNode;
}) => {
  const [automations, setAutomations] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [dismissedRecs, setDismissedRecs] = useState<string[]>([]);

  const recColors: Record<string, React.CSSProperties> = {
    blue:   { background: 'rgba(22,119,255,0.06)',  border: '0.5px solid rgba(22,119,255,0.2)'  },
    purple: { background: 'rgba(139,92,246,0.06)',  border: '0.5px solid rgba(139,92,246,0.2)'  },
  };
  const recBtnColors: Record<string, React.CSSProperties> = {
    blue:   { background: '#1677FF',               color: '#fff'    },
    purple: { background: 'rgba(139,92,246,0.3)',  color: '#C4B5FD' },
  };
  const recTagColors: Record<string, React.CSSProperties> = {
    blue:   { color: '#5AA9FF' },
    purple: { color: '#AFA9EC' },
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--window-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px 16px',
        borderBottom: '0.5px solid var(--window-border)',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 24, fontWeight: 700, lineHeight: '28px',
          color: 'var(--textarea-color)', fontFamily: 'Lato, sans-serif',
        }}>
          Athena Intelligence
        </span>
        <button
          onClick={onClose}
          style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--toolbar-icon)' }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Body — two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>

        {/* Left — What Athena knows */}
        <div style={{ padding: 24, borderRight: '0.5px solid var(--window-border)', overflowY: 'auto' }}>
          <p style={{ fontSize: 16, fontWeight: 500, lineHeight: '22px', color: 'var(--textarea-color)', margin: '0 0 14px' }}>
            What Athena knows
          </p>
          <p style={{ fontSize: 18, fontWeight: 400, lineHeight: '28px', color: 'var(--textarea-color)' }}>
            {INTELLIGENCE_DATA.fullSentence}
          </p>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {INTELLIGENCE_DATA.dataRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', minHeight: 48, background: 'var(--bubble-ai-bg)', borderRadius: 8, border: '0.5px solid var(--input-border)' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bubble-ai-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--placeholder-color)', fontSize: 11 }}>
                  {row.icon === 'clock'    && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.1"/><path d="M5.5 3.5V5.5L7 7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>}
                  {row.icon === 'trend'    && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 8L3.5 5L5.5 7L9.5 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  {row.icon === 'calendar' && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1" y="1.5" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1.1"/><path d="M3.5 1.5V.5M7.5 1.5V.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>}
                </div>
                <span style={{ fontSize: 14, lineHeight: '20px', color: 'var(--textarea-color)', flex: 1 }}>{row.value}</span>
                <span style={{ fontSize: 12, lineHeight: '18px', color: 'var(--placeholder-color)' }}>{row.meta}</span>
              </div>
            ))}
          </div>
          {longHorizonSection}
        </div>

        {/* Right — What Athena recommends */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 16, fontWeight: 500, lineHeight: '22px', color: 'var(--textarea-color)', margin: '0 0 14px' }}>
            What Athena recommends
          </p>

          {INTELLIGENCE_DATA.recommendations
            .filter(rec => !dismissedRecs.includes(rec.title))
            .map((rec, i) => (
              <div key={i} style={{ ...recColors[rec.color], borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: (recTagColors[rec.color] as { color: string }).color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, lineHeight: '18px', fontWeight: 500, ...recTagColors[rec.color] }}>{rec.type}</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, lineHeight: '22px', color: 'var(--textarea-color)', margin: '4px 0' }}>{rec.title}</p>
                <p style={{ fontSize: 14, fontWeight: 400, lineHeight: '20px', color: 'var(--placeholder-color)', margin: '0 0 12px' }}>{rec.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => { onSendMessage(rec.prompt); onClose(); }}
                    style={{ fontSize: 12, fontWeight: 700, lineHeight: '18px', padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', ...recBtnColors[rec.color] }}
                  >
                    {rec.cta}
                  </button>
                  <button
                    onClick={() => setDismissedRecs(prev => [...prev, rec.title])}
                    style={{ fontSize: 12, fontWeight: 400, color: 'var(--placeholder-color)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
                  >
                    Not now
                  </button>
                  <button
                    onClick={() => { onSendMessage(`Why did Athena recommend this: "${rec.title}"? Explain in 2-3 sentences.`); onClose(); }}
                    style={{ fontSize: 12, fontWeight: 400, color: 'var(--placeholder-color)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', textDecoration: 'underline', textUnderlineOffset: 3 }}
                  >
                    Why this
                  </button>
                </div>
              </div>
            ))}

          {/* Automation suggestions */}
          <div>
            <p style={{ fontSize: 16, fontWeight: 500, lineHeight: '22px', color: 'var(--textarea-color)', margin: '0 0 6px' }}>
              Automation suggestions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {INTELLIGENCE_DATA.automations
                .filter(a => !dismissed.includes(a.id))
                .map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', minHeight: 48, background: 'var(--bubble-ai-bg)', border: '0.5px solid var(--input-border)', borderRadius: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 400, lineHeight: '20px', color: 'var(--textarea-color)', flex: 1 }}>
                      {a.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => setDismissed(prev => [...prev, a.id])}
                        style={{ fontSize: 12, fontWeight: 500, color: 'var(--placeholder-color)', background: 'transparent', border: '0.5px solid var(--input-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                      >
                        Not now
                      </button>
                      <button
                        onClick={() => {
                          setAutomations(prev => ({ ...prev, [a.id]: !prev[a.id] }));
                          if (!automations[a.id]) onSendMessage(a.prompt);
                        }}
                        style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: automations[a.id] ? 'rgba(255,255,255,0.06)' : 'rgba(18,183,106,0.12)', color: automations[a.id] ? 'var(--placeholder-color)' : '#34D399' }}
                      >
                        {automations[a.id] ? 'On' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── StickyBanner ─────────────────────────────────────────────────────────────

const StickyBanner = ({ onOpen }: { onOpen: () => void }) => {
  const count = (INTELLIGENCE_DATA as { priorities?: unknown[] }).priorities?.length ?? 3;

  return (
    <div
      onClick={onOpen}
      style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--bubble-ai-bg)',
        border: '0.5px solid var(--window-border)',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'background 150ms ease',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--toolbar-hover-bg)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--bubble-ai-bg)';
      }}
    >
      <span style={{
        fontSize: 14,
        fontWeight: 400,
        color: 'var(--textarea-color)',
        fontFamily: "'Lato', sans-serif",
      }}>
        Athena has {count} priorities for you today
      </span>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--toolbar-icon)', flexShrink: 0 }}>
        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

export default StickyBanner;
