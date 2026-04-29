import React, {
  useState, useEffect, useRef, useCallback, useLayoutEffect,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AthenaChatExperience.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ArtifactTab = 'preview' | 'about' | 'segments' | 'trends';
type ArtifactType = 'campaign' | 'code' | 'audience';
type FooterMode = 'normal' | 'context';

interface ArtifactData {
  name?: string;
  subjectLine?: string;
  description?: string;
  broadcast?: string;
  send?: string;
  status?: string;
  owner?: string;
  emailHeadline?: string;
  emailBody1?: string;
  emailBody2?: string;
  emailCta?: string;
  code?: string;
  summary?: string;
}

interface Artifact {
  type: ArtifactType;
  name: string;
  data: ArtifactData;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  artifact?: Artifact;
  pendingArtifact?: Artifact;
  isTyping?: boolean;
}

interface ContextConfig {
  question: string;
  options: string[];
}

interface AttachmentChip {
  id: string;
  label: string;
  content: string;
}

interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHRASES = [
  'Hang tight…','Just a sec…','On it…','Give me a moment…','Cooking something up…',
  'Let me think…','Working my magic…','One moment while I sort this out…','Getting things ready…',
  'Almost there…','Just putting this together…','Making some sense of things…',
  'Pulling this together…','Give me a beat…','Wrapping this up…','In the works…',
  'Let me take a look…','Crunching a few things…','Lining this up…','Just about done…',
];

const SIMULATED_CONVO = [
  { speaker: 'You',    text: 'I want to create a re-engagement campaign for lapsed customers.' },
  { speaker: 'Athena', text: 'Got it. What tone are you going for — warm and friendly, or more direct?' },
  { speaker: 'You',    text: 'Warm and friendly. We want them to feel missed, not pressured.' },
  { speaker: 'Athena', text: "Perfect. I'll lead with empathy and keep the ask low-pressure." },
  { speaker: 'You',    text: "Can you suggest a CTA that doesn't feel pushy?" },
  { speaker: 'Athena', text: 'Something like "See what\'s new" works well — it invites without demanding.' },
];

const WAVE_COLORS = ['#0FAEFF','#BA0090','#FFF047','#FF4D4F','#52C41A','#722ED1','#FA8C16'];

const SYSTEM_PROMPT = `You are Athena, an intelligent AI assistant built into the Zeta Marketing Platform. You help marketers with campaign creation, audience targeting, insights, and data-driven decisions. Be concise and professional.

When the user asks you to build, create, generate, or write a campaign OR an email (including email campaigns, marketing emails, promotional emails, newsletters, re-engagement emails, or any email-related request), respond with a short confirmation message AND include a JSON block at the end of your response in this exact format (no markdown, just the JSON on its own line):
ARTIFACT:{"type":"campaign","name":"<campaign name>","subjectLine":"<compelling subject line>","description":"<2-3 sentence description>","broadcast":"at a specific time","send":"Immediate","status":"Draft","owner":"You","emailHeadline":"<punchy email headline, 6-10 words>","emailBody1":"<opening paragraph, 2-3 sentences, warm and direct>","emailBody2":"<second paragraph, 2-3 sentences, value-focused>","emailCta":"<CTA button label, 2-4 words>"}

When the user asks for code, respond with a short message AND include:
ARTIFACT:{"type":"code","name":"<snippet name>","code":"<the actual code>"}

When you need more context before you can help (e.g. the user's request is vague or you need to know the audience, tone, goal, etc.), instead of guessing, respond with a short message AND include a context prompt block in this exact format:
CONTEXT_PROMPT:{"question":"<one clear question>","options":["<option 1>","<option 2>","<option 3>","<option 4>"]}

For all other requests, respond normally without any special block.`;

// ─── Utility ─────────────────────────────────────────────────────────────────

function getTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useTypewriter(text: string | null, speed = 38): string {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!text) { setDisplayed(''); return; }
    const t = text;
    let cancelled = false;
    let i = 0;
    setDisplayed('');
    function tick() {
      if (cancelled) return;
      if (i < t.length) { i++; setDisplayed(t.slice(0, i)); setTimeout(tick, speed); }
    }
    setTimeout(tick, speed);
    return () => { cancelled = true; };
  }, [text, speed]);
  return displayed;
}

function useProcessingPhrase(isActive: boolean): { phrase: string; opacity: number } {
  const [phrase, setPhrase] = useState(PHRASES[0]);
  const [opacity, setOpacity] = useState(1);
  const idxRef = useRef(0);
  useEffect(() => {
    if (!isActive) { idxRef.current = 0; return; }
    setPhrase(PHRASES[0]);
    setOpacity(1);
    idxRef.current = 0;
    let tid: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setOpacity(0);
      tid = setTimeout(() => {
        idxRef.current = (idxRef.current + 1) % PHRASES.length;
        setPhrase(PHRASES[idxRef.current]);
        setOpacity(1);
      }, 300);
    }, 2200);
    return () => { clearInterval(interval); clearTimeout(tid); };
  }, [isActive]);
  return { phrase, opacity };
}

function useVoiceCaption(isActive: boolean): typeof SIMULATED_CONVO[0] | null {
  const [line, setLine] = useState<typeof SIMULATED_CONVO[0] | null>(null);
  const idxRef = useRef(0);
  useEffect(() => {
    if (!isActive) { setLine(null); idxRef.current = 0; return; }
    idxRef.current = 0;
    setLine(SIMULATED_CONVO[0]);
    const interval = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % SIMULATED_CONVO.length;
      setLine(SIMULATED_CONVO[idxRef.current]);
    }, 3200);
    return () => clearInterval(interval);
  }, [isActive]);
  return line;
}

function useWaveform(
  isActive: boolean,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>,
) {
  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = Math.max(10, rect.width - 20 - 36 - 20 - 64 - 20);
    canvas.height = rect.height || 148;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId: number;
    let cancelled = false;
    function drawIdleWave() {
      const W = canvas!.width, H = canvas!.height;
      ctx!.clearRect(0, 0, W, H);
      WAVE_COLORS.forEach((color, w) => {
        ctx!.beginPath();
        ctx!.strokeStyle = color;
        ctx!.lineWidth = 1.5;
        ctx!.globalAlpha = 0.4;
        const phaseShift = (w / WAVE_COLORS.length) * Math.PI * 2;
        const freqMult = 1 + w * 0.3;
        for (let x = 0; x < W; x++) {
          const y = H / 2 + Math.sin((x / W) * Math.PI * 2 * freqMult * 3 + phaseShift + Date.now() / 800) * H * 0.06;
          x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
        }
        ctx!.stroke();
      });
      ctx!.globalAlpha = 1;
    }
    function animate() {
      if (cancelled) return;
      drawIdleWave();
      rafId = requestAnimationFrame(animate);
    }
    animate();
    return () => { cancelled = true; cancelAnimationFrame(rafId); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  }, [isActive, canvasRef, containerRef]);
}

// ─── SVG Components ───────────────────────────────────────────────────────────

const SPARKLE_PATH = 'M7.01126 0.470228C7.19962 0.327342 7.42956 0.25 7.66598 0.25C7.90241 0.25 8.13234 0.327342 8.32071 0.470228C8.50907 0.613112 8.64552 0.813694 8.70923 1.04137L8.71325 1.05634L9.76721 5.14615C9.79325 5.24709 9.84586 5.3392 9.91957 5.41291C9.99323 5.48658 10.0853 5.53917 10.1861 5.56523L14.2884 6.6224C14.517 6.68545 14.7186 6.82186 14.8622 7.0105C15.0059 7.19915 15.0837 7.42972 15.0837 7.66683C15.0837 7.90395 15.0059 8.13452 14.8622 8.32317C14.7186 8.51181 14.517 8.64812 14.2884 8.71117L14.2762 8.71454L10.1863 9.76839C10.0854 9.79443 9.99328 9.84704 9.91957 9.92075C9.84586 9.99446 9.79325 10.0866 9.76721 10.1875L8.71256 14.2774L8.70857 14.2923C8.64485 14.52 8.5084 14.7206 8.32004 14.8634C8.13168 15.0063 7.90175 15.0837 7.66532 15.0837C7.42889 15.0837 7.19896 15.0063 7.0106 14.8634C6.82224 14.7206 6.68578 14.52 6.62207 14.2923L6.61804 14.2773L5.56409 10.1875C5.53804 10.0867 5.4854 9.99442 5.41173 9.92075C5.33802 9.84704 5.24591 9.79443 5.14497 9.76839L1.05504 8.71374L1.03753 8.709C0.810748 8.64463 0.61115 8.50805 0.469023 8.31996C0.326897 8.13188 0.25 7.90257 0.25 7.66683C0.25 7.43109 0.326897 7.20178 0.469023 7.0137C0.61115 6.82562 0.810748 6.68903 1.03753 6.62467L1.05493 6.61995L5.14493 5.56462C5.24584 5.5386 5.33807 5.486 5.41177 5.41234C5.48541 5.33876 5.53801 5.24682 5.56412 5.14605L6.61874 1.05623L6.62273 1.04137C6.68645 0.813698 6.8229 0.613115 7.01126 0.470228ZM7.66586 3.0028L8.31471 5.52066C8.40771 5.88115 8.59566 6.21032 8.85891 6.47357C9.12216 6.73683 9.45114 6.92473 9.81164 7.01772L12.3305 7.66683L9.81182 8.31589C9.45133 8.40889 9.12216 8.59684 8.85891 8.86009C8.59566 9.12334 8.40776 9.45233 8.31476 9.81282L7.66544 12.3309L7.01659 9.813C6.92359 9.45251 6.73564 9.12334 6.47239 8.86009C6.20914 8.59684 5.88016 8.40894 5.51967 8.31594L3.00192 7.6667L5.51956 7.01708C5.87987 6.92416 6.20886 6.7364 6.47206 6.47337C6.7353 6.21032 6.92328 5.88155 7.01644 5.52125L7.66586 3.0028Z';

function SparkleGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0FAEFF" />
        <stop offset="60%" stopColor="#BA0090" />
        <stop offset="100%" stopColor="#FFF047" />
      </linearGradient>
    </defs>
  );
}

function SparkleHeaderIcon() {
  return (
    <svg className="chat-header-sparkle" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d={SPARKLE_PATH} fill="url(#sg-header)" />
      <SparkleGradient id="sg-header" />
    </svg>
  );
}

function SparkleAnimIcon() {
  return (
    <svg className="sparkle-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d={SPARKLE_PATH} />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M5.72212 1.05546C6.23785 0.539731 6.93732 0.25 7.66667 0.25C8.39601 0.25 9.09549 0.539731 9.61121 1.05546C10.1269 1.57118 10.4167 2.27065 10.4167 3V7.66667C10.4167 8.39601 10.1269 9.09548 9.61121 9.61121C9.09548 10.1269 8.39601 10.4167 7.66667 10.4167C6.93732 10.4167 6.23785 10.1269 5.72212 9.61121C5.2064 9.09548 4.91667 8.39601 4.91667 7.66667V3C4.91667 2.27065 5.2064 1.57118 5.72212 1.05546ZM7.66667 1.75C7.33515 1.75 7.0172 1.8817 6.78278 2.11612C6.54836 2.35054 6.41667 2.66848 6.41667 3V7.66667C6.41667 7.99819 6.54836 8.31613 6.78278 8.55055C7.0172 8.78497 7.33515 8.91667 7.66667 8.91667C7.99819 8.91667 8.31613 8.78497 8.55055 8.55055C8.78497 8.31613 8.91667 7.99819 8.91667 7.66667V3C8.91667 2.66848 8.78497 2.35054 8.55055 2.11612C8.31613 1.8817 7.99819 1.75 7.66667 1.75ZM3 5.58333C3.41421 5.58333 3.75 5.91912 3.75 6.33333V7.66667C3.75 8.70543 4.16265 9.70165 4.89716 10.4362C5.63168 11.1707 6.6279 11.5833 7.66667 11.5833C8.70543 11.5833 9.70165 11.1707 10.4362 10.4362C11.1707 9.70165 11.5833 8.70543 11.5833 7.66667V6.33333C11.5833 5.91912 11.9191 5.58333 12.3333 5.58333C12.7475 5.58333 13.0833 5.91912 13.0833 6.33333V7.66667C13.0833 9.10326 12.5126 10.481 11.4968 11.4968C10.6595 12.3342 9.57614 12.8691 8.41667 13.0312V14.3333C8.41667 14.7475 8.08088 15.0833 7.66667 15.0833C7.25245 15.0833 6.91667 14.7475 6.91667 14.3333V13.0312C5.75719 12.8691 4.67388 12.3342 3.8365 11.4968C2.82068 10.481 2.25 9.10326 2.25 7.66667V6.33333C2.25 5.91912 2.58579 5.58333 3 5.58333Z" fill="currentColor" fillOpacity="0.88"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 12V3M3 6.5L7.5 2L12 6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Attachment Chips ─────────────────────────────────────────────────────────

function AttachmentChips({ chips, onRemove }: {
  chips: AttachmentChip[];
  onRemove: (id: string) => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="attachment-chips">
      {chips.map(chip => (
        <div key={chip.id} className="attachment-chip">
          <span className="attachment-chip-icon">📄</span>
          <span className="attachment-chip-label" title={chip.content}>{chip.label}</span>
          <button className="attachment-chip-remove" onClick={() => onRemove(chip.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Footer: Normal input ─────────────────────────────────────────────────────

function FooterNormal({ chips, onRemoveChip, inputText, onChange, onKeyDown, onSend, onVoice, disabled, textareaRef }: {
  chips: AttachmentChip[];
  onRemoveChip: (id: string) => void;
  inputText: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onVoice: () => void;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <div className="input-container">
      <AttachmentChips chips={chips} onRemove={onRemoveChip} />
      <textarea
        ref={textareaRef}
        className="chat-textarea"
        placeholder="Ask Athena anything…"
        value={inputText}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      <div className="input-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" title="Attach file">
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M12.5 6.5L6.5 12.5C5.1 13.9 2.9 13.9 1.5 12.5C0.1 11.1 0.1 8.9 1.5 7.5L7.5 1.5C8.4 0.6 9.8 0.6 10.7 1.5C11.6 2.4 11.6 3.8 10.7 4.7L5 10.4C4.6 10.8 3.9 10.8 3.5 10.4C3.1 10 3.1 9.3 3.5 8.9L8.5 3.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="toolbar-btn" onClick={onVoice} title="Voice input"><MicIcon /></button>
          <button className="send-btn" onClick={onSend} disabled={disabled} title="Send"><SendIcon /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Footer: Context prompt ───────────────────────────────────────────────────

function FooterContext({ config, onAnswer }: {
  config: ContextConfig;
  onAnswer: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');

  function submitAnswer(answer: string) {
    if (!answer) return;
    onAnswer(answer);
  }

  return (
    <div>
      <div className="ctx-question">{config.question}</div>
      <div style={{ border: '0.5px solid var(--input-border)', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 840 }}>
        <div className="ctx-pills">
          {config.options.map(opt => (
            <button
              key={opt}
              className={`ctx-pill${selected === opt ? ' selected' : ''}`}
              onClick={() => { setSelected(opt); submitAnswer(opt); }}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className={`ctx-freetext-row${selected ? ' pill-selected' : ''}`}>
          <input
            className="ctx-input"
            placeholder="Or type something else…"
            value={freeText}
            onChange={e => { setFreeText(e.target.value); if (e.target.value) setSelected(null); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAnswer(freeText.trim()); } }}
          />
          <button
            className={`ctx-send${freeText.trim() ? ' active' : ''}`}
            onClick={() => submitAnswer(freeText.trim())}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Voice mode ───────────────────────────────────────────────────────────────

function VoiceMode({ captionLine, onEnd, onMute, isMuted, canvasRef, containerRef }: {
  captionLine: typeof SIMULATED_CONVO[0] | null;
  onEnd: () => void;
  onMute: () => void;
  isMuted: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <>
      {captionLine && (
        <div className="voice-caption">
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
            color: captionLine.speaker === 'You' ? '#1677FF' : 'var(--processing-color)',
            marginRight: 8, textTransform: 'uppercase',
          }}>
            {captionLine.speaker}
          </span>
          {captionLine.text}
        </div>
      )}
      <div className="voice-container" ref={containerRef}>
        <canvas className="waveform-canvas" ref={canvasRef} />
        <button className={`voice-mute-btn${isMuted ? ' muted' : ''}`} onClick={onMute} title="Toggle mute">
          <MicIcon />
        </button>
        <button className="voice-end-btn" onClick={onEnd}>End</button>
      </div>
    </>
  );
}

// ─── Processing bar ───────────────────────────────────────────────────────────

function ProcessingBar({ isLoading }: { isLoading: boolean }) {
  const { phrase, opacity } = useProcessingPhrase(isLoading);
  if (!isLoading) return null;
  return (
    <div className="processing-bar">
      <SparkleAnimIcon />
      <span className="processing-text" style={{ opacity }}>{phrase}</span>
    </div>
  );
}

// ─── Typewriter bubble ────────────────────────────────────────────────────────

function TypewriterBubble({ text, speed = 18, onComplete, scrollEl }: {
  text: string;
  speed?: number;
  onComplete?: () => void;
  scrollEl?: HTMLElement | null;
}) {
  const [displayed, setDisplayed] = useState('');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;
    let i = 0;
    setDisplayed('');
    function tick() {
      if (cancelled) return;
      if (i < text.length) {
        i++;
        setDisplayed(text.slice(0, i));
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
        setTimeout(tick, speed);
      } else {
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }
    setTimeout(tick, speed);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <>{displayed}</>;
}

// ─── Artifact card ────────────────────────────────────────────────────────────

const ARTIFACT_ICONS: Record<string, string> = { campaign: '📣', code: '</>', audience: '👥' };
const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  campaign: 'Campaign · Draft', code: 'Code · Snippet', audience: 'Audience · Segment',
};

function ArtifactCard({ artifact, onClick }: { artifact: Artifact; onClick: () => void }) {
  return (
    <div className="artifact-card" onClick={onClick}>
      <div className="artifact-card-icon">{ARTIFACT_ICONS[artifact.type] || '📄'}</div>
      <div className="artifact-card-info">
        <div className="artifact-card-name">{artifact.name}</div>
        <div className="artifact-card-type">{ARTIFACT_TYPE_LABELS[artifact.type] || 'Artifact'}</div>
      </div>
      <div className="artifact-card-arrow">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

// ─── Message item ─────────────────────────────────────────────────────────────

function MessageItem({ message, onTypingComplete, onArtifactClick, messagesEl }: {
  message: Message;
  onTypingComplete: ((id: string) => void) | null;
  onArtifactClick: (a: Artifact) => void;
  messagesEl: HTMLDivElement | null;
}) {
  return (
    <div className={`message ${message.role}`}>
      <div className="bubble">
        {message.isTyping ? (
          <TypewriterBubble
            text={message.text}
            scrollEl={messagesEl}
            onComplete={onTypingComplete ? () => onTypingComplete(message.id) : undefined}
          />
        ) : message.text}
      </div>
      <div className="message-label">{message.timestamp}</div>
      {message.artifact && (
        <ArtifactCard
          artifact={message.artifact}
          onClick={() => message.artifact && onArtifactClick(message.artifact)}
        />
      )}
    </div>
  );
}

// ─── Artifact panel: preview block ───────────────────────────────────────────

function PreviewBlock({ children, label, content, onAddToChat }: {
  children: React.ReactNode;
  label: string;
  content: string;
  onAddToChat: (label: string, content: string) => void;
}) {
  return (
    <div className="preview-block">
      {children}
      <button className="add-to-chat-btn" onClick={() => onAddToChat(label, content)}>Add to chat</button>
    </div>
  );
}

// ─── Artifact panel: email preview tab ───────────────────────────────────────

function EmailPreview({ artifact, onAddToChat }: {
  artifact: Artifact;
  onAddToChat: (label: string, content: string) => void;
}) {
  const d = artifact.data;
  const subject = d.subjectLine || '';
  const headline = d.emailHeadline || subject;
  const body1 = d.emailBody1 || d.description || '';
  const body2 = d.emailBody2 || '';
  const cta = d.emailCta || 'Learn More';
  const sender = d.name || 'Campaign';
  const senderDisplay = sender.length > 40 ? sender.slice(0, 40) + '…' : sender;

  return (
    <div>
      <div style={{ background: 'var(--field-bg)', border: '0.5px solid var(--field-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--field-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--meta-key)', flexShrink: 0 }}>Subject</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--field-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subject}</span>
        </div>
        <div style={{ background: '#ffffff' }}>
          {/* Header band */}
          <div className="preview-block" style={{ background: 'linear-gradient(135deg,#0FAEFF,#BA0090)', padding: '28px 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d={SPARKLE_PATH} fill="white" opacity="0.9" />
              </svg>
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 15, fontWeight: 700, color: '#ffffff' }}>{senderDisplay}</span>
            </div>
            <button className="add-to-chat-btn" onClick={() => onAddToChat('Header band', senderDisplay)}>Add to chat</button>
          </div>
          {/* Body */}
          <div style={{ padding: '28px 32px', fontFamily: "'Lato', sans-serif" }}>
            <PreviewBlock label="Headline" content={headline} onAddToChat={onAddToChat}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111111', lineHeight: 1.25, margin: '0 0 14px', letterSpacing: '-0.02em' }}>{headline}</h2>
            </PreviewBlock>
            {body1 && (
              <PreviewBlock label="Opening paragraph" content={body1} onAddToChat={onAddToChat}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#444444', margin: '0 0 16px' }}>{body1}</p>
              </PreviewBlock>
            )}
            <div style={{ height: 1, background: '#eeeeee', margin: '0 0 16px' }} />
            {body2 && (
              <PreviewBlock label="Body paragraph" content={body2} onAddToChat={onAddToChat}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#555555', margin: '0 0 24px' }}>{body2}</p>
              </PreviewBlock>
            )}
            <div className="preview-block" style={{ textAlign: 'center', margin: '0 0 24px' }}>
              <a href="#" onClick={e => e.preventDefault()} style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0FAEFF,#BA0090)', color: '#ffffff', fontFamily: "'Lato', sans-serif", fontSize: 14, fontWeight: 700, textDecoration: 'none', padding: '12px 28px', borderRadius: 8 }}>{cta}</a>
              <button className="add-to-chat-btn" onClick={() => onAddToChat('CTA button', cta)}>Add to chat</button>
            </div>
            <div style={{ height: 1, background: '#eeeeee', margin: '0 0 16px' }} />
            <p style={{ fontSize: 11, lineHeight: 1.6, color: '#aaaaaa', textAlign: 'center', margin: 0 }}>
              You're receiving this because you opted in. &nbsp;·&nbsp; <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Unsubscribe</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Artifact panel: About tab (campaign form) ────────────────────────────────

function AboutTab({ artifact }: { artifact: Artifact }) {
  const d = artifact.data;
  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  return (
    <div>
      <div className="campaign-hero"><div className="campaign-thumb" /></div>
      <div className="field-group">
        <div className="field-label">Campaign name</div>
        <input className="field-input" defaultValue={d.name || ''} />
      </div>
      <div className="field-group">
        <div className="field-label">Subject line</div>
        <input className="field-input" defaultValue={d.subjectLine || ''} />
      </div>
      <div className="field-group">
        <div className="field-label">Description <span>(optional)</span></div>
        <textarea className="field-input" defaultValue={d.description || ''} />
      </div>
      <div className="field-group">
        <div className="field-label">Tags</div>
        <div className="field-tags">Type to add tags <span style={{ color: 'rgba(0,0,0,0.25)' }}>▾</span></div>
      </div>
      <div className="versions-row">
        <span className="versions-label">Versions</span>
        <span className="versions-badge">1</span>
      </div>
      <div className="ab-label">A/B</div>
      <div className="stepper">
        <div className="stepper-line" />
        {['Preparing', 'Sending', 'Sent'].map((label, i) => (
          <div key={label} className="stepper-step">
            <div className={`stepper-dot${i === 0 ? ' active' : ''}`} />
            <div className="stepper-step-label">{label}</div>
          </div>
        ))}
      </div>
      <div className="meta-divider" />
      {[
        { key: 'Broadcast:', val: d.broadcast || 'at a specific time' },
        { key: 'Send:', val: d.send || 'Immediate' },
        { key: 'Status:', val: d.status || 'Draft', hasDot: true },
        { key: 'Owned by:', val: d.owner || 'You' },
        { key: 'Created:', val: now },
        { key: 'Last Modified:', val: now },
      ].map(row => (
        <div key={row.key} className="meta-row">
          <span className="meta-key">{row.key}</span>
          <span className="meta-val">
            {row.hasDot && <span className="status-dot" />}
            {row.val}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Artifact panel ───────────────────────────────────────────────────────────

function ArtifactPanel({ isOpen, artifact, activeTab, onTabChange, onClose, onAddToChat }: {
  isOpen: boolean;
  artifact: Artifact | null;
  activeTab: ArtifactTab;
  onTabChange: (tab: ArtifactTab) => void;
  onClose: () => void;
  onAddToChat: (label: string, content: string) => void;
}) {
  const tabs: { key: ArtifactTab; label: string }[] = artifact && artifact.type === 'campaign'
    ? [{ key: 'preview', label: 'Preview' }, { key: 'about', label: 'About' }, { key: 'segments', label: 'Segments' }, { key: 'trends', label: 'Trends' }]
    : [{ key: 'preview', label: 'Preview' }];

  const title = artifact && artifact.type === 'campaign' ? 'About Campaign' : (artifact && artifact.name) || '';

  function renderBody() {
    if (!artifact) return null;
    if (activeTab === 'about') return <AboutTab artifact={artifact} />;
    if (activeTab === 'segments' || activeTab === 'trends') {
      const name = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      return <p style={{ fontSize: 14, color: 'var(--meta-key)', padding: '8px 0' }}>{name} — coming soon.</p>;
    }
    if (artifact.type === 'code') return <div className="code-viewer">{artifact.data.code || ''}</div>;
    return <EmailPreview artifact={artifact} onAddToChat={onAddToChat} />;
  }

  return (
    <motion.div
      className="artifact-panel"
      initial={{ maxWidth: 0, opacity: 0 }}
      animate={{ maxWidth: isOpen ? 800 : 0, opacity: isOpen ? 1 : 0 }}
      transition={{
        maxWidth: { duration: 0.9, ease: [0.25, 1, 0.3, 1] },
        opacity:  { duration: 0.7, ease: [0.25, 1, 0.3, 1] },
      }}
      style={{ pointerEvents: isOpen ? 'all' : 'none' }}
    >
      <div className="ap-header">
        <div className="ap-title-row">
          <span className="ap-title">{title}</span>
          <div className="ap-header-actions">
            <button className="ap-more-btn" title="More options">···</button>
            <button className="ap-close" onClick={onClose} title="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="ap-tabs">
          {tabs.map(tab => (
            <button key={tab.key} className={`ap-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => onTabChange(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ap-body">{renderBody()}</div>
    </motion.div>
  );
}

// ─── Chat header ──────────────────────────────────────────────────────────────

function ChatHeader({ isSubmitted, title, onCompose }: {
  isSubmitted: boolean;
  title: string;
  onCompose: () => void;
}) {
  return (
    <motion.div
      className="chat-header"
      initial={{ clipPath: 'inset(0 0 100% 0)' }}
      animate={{ clipPath: isSubmitted ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{ pointerEvents: isSubmitted ? 'all' : 'none' }}
    >
      <div className="chat-header-left">
        <SparkleHeaderIcon />
        <span className="chat-header-title">{title}</span>
      </div>
      <div className="chat-header-right">
        <button className="chat-header-btn" onClick={onCompose} title="New thread">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M11.1828 1.99444L5.92529 7.25259C5.86477 7.313 5.81997 7.38808 5.79583 7.4701L5.49285 8.50636L6.52948 8.20328C6.6117 8.17927 6.68677 8.13489 6.74736 8.07436L12.0047 2.81639C12.1137 2.7074 12.175 2.55955 12.175 2.40541C12.175 2.25127 12.1138 2.10344 12.0048 1.99444C11.8958 1.88545 11.7479 1.82422 11.5938 1.82422C11.4397 1.82422 11.2918 1.88547 11.1828 1.99444ZM10.2548 1.06637C10.6099 0.711232 11.0916 0.511719 11.5938 0.511719C12.096 0.511719 12.5777 0.711232 12.9328 1.06637C13.288 1.4215 13.4875 1.90317 13.4875 2.40541C13.4875 2.90763 13.288 3.38929 12.9329 3.74442L7.67529 9.00259C7.45891 9.21877 7.19139 9.37727 6.8978 9.46304L5.22188 9.95304C5.05875 10.0006 4.88541 10.0036 4.7208 9.96142C4.55619 9.91924 4.40594 9.8336 4.28578 9.71343C4.16562 9.59327 4.07997 9.44302 4.0378 9.27841C3.99562 9.1138 3.99847 8.94088 4.04605 8.77774L4.53618 7.10141C4.62228 6.80816 4.78094 6.54055 4.99716 6.32456L10.2548 1.06637ZM1.62767 1.62684C1.96953 1.28497 2.4332 1.09292 2.91667 1.09292H7C7.36244 1.09292 7.65625 1.38673 7.65625 1.74917C7.65625 2.1116 7.36244 2.40542 7 2.40542H2.91667C2.7813 2.40542 2.65147 2.45919 2.55575 2.55491C2.46003 2.65064 2.40625 2.78046 2.40625 2.91583V11.0825C2.40625 11.2179 2.46003 11.3477 2.55575 11.4434C2.65147 11.5391 2.7813 11.5929 2.91667 11.5929H11.0833C11.2187 11.5929 11.3485 11.5391 11.4443 11.4434C11.54 11.3477 11.5938 11.2179 11.5938 11.0825V6.99917C11.5938 6.63673 11.8876 6.34292 12.25 6.34292C12.6124 6.34292 12.9062 6.63673 12.9062 6.99917V11.0825C12.9062 11.566 12.7142 12.0296 12.3723 12.3715C12.0305 12.7134 11.5668 12.9054 11.0833 12.9054H2.91667C2.4332 12.9054 1.96953 12.7134 1.62767 12.3715C1.28581 12.0296 1.09375 11.566 1.09375 11.0825V2.91583C1.09375 2.43237 1.28581 1.9687 1.62767 1.62684Z" fill="currentColor"/>
          </svg>
        </button>
        <button className="chat-header-btn" title="More options">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M2.91683 7.07227C2.9571 7.07227 2.98975 7.03962 2.98975 6.99935C2.98975 6.95908 2.9571 6.92643 2.91683 6.92643C2.87656 6.92643 2.84391 6.95908 2.84391 6.99935C2.84391 7.03962 2.87656 7.07227 2.91683 7.07227ZM1.67725 6.99935C1.67725 6.31475 2.23223 5.75977 2.91683 5.75977C3.60143 5.75977 4.15641 6.31475 4.15641 6.99935C4.15641 7.68395 3.60143 8.23893 2.91683 8.23893C2.23223 8.23893 1.67725 7.68395 1.67725 6.99935ZM7.00016 7.07227C7.04043 7.07227 7.07308 7.03962 7.07308 6.99935C7.07308 6.95908 7.04043 6.92643 7.00016 6.92643C6.95989 6.92643 6.92725 6.95908 6.92725 6.99935C6.92725 7.03962 6.95989 7.07227 7.00016 7.07227ZM5.76058 6.99935C5.76058 6.31475 6.31556 5.75977 7.00016 5.75977C7.68477 5.75977 8.23975 6.31475 8.23975 6.99935C8.23975 7.68395 7.68477 8.23893 7.00016 8.23893C6.31556 8.23893 5.76058 7.68395 5.76058 6.99935ZM11.0835 7.07227C11.1238 7.07227 11.1564 7.03962 11.1564 6.99935C11.1564 6.95908 11.1238 6.92643 11.0835 6.92643C11.0432 6.92643 11.0106 6.95908 11.0106 6.99935C11.0106 7.03962 11.0432 7.07227 11.0835 7.07227ZM9.84391 6.99935C9.84391 6.31475 10.3989 5.75977 11.0835 5.75977C11.7681 5.75977 12.3231 6.31475 12.3231 6.99935C12.3231 7.68395 11.7681 8.23893 11.0835 8.23893C10.3989 8.23893 9.84391 7.68395 9.84391 6.99935Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function callAthena(messages: HistoryItem[]): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string || '';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  const data = await res.json();
  return (data.content && data.content[0] && data.content[0].text) || 'Sorry, I could not get a response.';
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AthenaChatExperience() {
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [headerTitle, setHeaderTitle] = useState('Athena');
  const [headerTypewriterSrc, setHeaderTypewriterSrc] = useState<string | null>(null);
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ArtifactTab>('preview');
  const [chatWidth, setChatWidth] = useState(328);
  const [attachmentChips, setAttachmentChips] = useState<AttachmentChip[]>([]);
  const [footerMode, setFooterMode] = useState<FooterMode>('normal');
  const [contextConfig, setContextConfig] = useState<ContextConfig | null>(null);
  const [scrollDist, setScrollDist] = useState(0);
  const [messagesBottom, setMessagesBottom] = useState(280);
  const [scrollAnchorBottom, setScrollAnchorBottom] = useState(16);

  const shellRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const footerSlotRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const voiceContainerRef = useRef<HTMLDivElement>(null);
  const chatWidthRef = useRef(328);

  // Theme: sync html class
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    html.classList.add(isDark ? 'dark' : 'light');
  }, [isDark]);

  // Typewriter for header title
  const typedHeaderTitle = useTypewriter(headerTypewriterSrc, 38);
  useEffect(() => {
    if (headerTypewriterSrc && typedHeaderTitle) setHeaderTitle(typedHeaderTitle);
  }, [typedHeaderTitle, headerTypewriterSrc]);

  // Voice caption cycling
  const captionLine = useVoiceCaption(isVoiceMode);

  // Waveform animation
  useWaveform(isVoiceMode, waveCanvasRef, voiceContainerRef);

  // Measure footer + caption height for messages bottom clearance
  const updateLayout = useCallback(() => {
    const slotH = footerSlotRef.current ? footerSlotRef.current.offsetHeight : 0;
    const capH = captionRef.current ? captionRef.current.offsetHeight : 0;
    setMessagesBottom(slotH + capH + 48);
    setScrollAnchorBottom(slotH + 16);
  }, []);

  useLayoutEffect(() => { updateLayout(); });

  useEffect(() => {
    const ro = new ResizeObserver(updateLayout);
    if (footerSlotRef.current) ro.observe(footerSlotRef.current);
    if (captionRef.current) ro.observe(captionRef.current);
    return () => ro.disconnect();
  }, [updateLayout, footerMode, isVoiceMode]);

  // Scroll to bottom when new message appended
  useEffect(() => {
    const el = messagesAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ── Helpers ──

  function addAssistantMessage(text: string, artifact: Artifact | null, newHistory: HistoryItem[]) {
    const id = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id, role: 'assistant', text, timestamp: getTimestamp(),
      isTyping: true,
      pendingArtifact: artifact || undefined,
    }]);
    setHistory([...newHistory, { role: 'assistant', content: text }]);
  }

  const handleTypingComplete = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      return { ...m, isTyping: false, artifact: m.pendingArtifact, pendingArtifact: undefined };
    }));
  }, []);

  function parseArtifact(raw: string): { artifact: Artifact | null; cleanText: string } {
    const match = raw.match(/ARTIFACT:(\{.*\})/s);
    if (!match) return { artifact: null, cleanText: raw };
    try {
      const parsed = JSON.parse(match[1]);
      return {
        artifact: { type: parsed.type, name: parsed.name, data: parsed },
        cleanText: raw.replace(/ARTIFACT:\{.*\}/s, '').trim(),
      };
    } catch {
      return { artifact: null, cleanText: raw };
    }
  }

  // ── Submit ──

  async function handleSubmit() {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setInputText('');
    setAttachmentChips([]);
    if (!isSubmitted) setIsSubmitted(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text, timestamp: getTimestamp() };
    setMessages(prev => [...prev, userMsg]);

    const newHistory: HistoryItem[] = [...history, { role: 'user', content: text }];
    setHistory(newHistory);

    // Typewriter header title on first message
    if (history.filter(m => m.role === 'user').length === 0) {
      setHeaderTypewriterSrc(text.length > 55 ? text.slice(0, 55) + '…' : text);
    }

    try {
      const reply = await callAthena(newHistory);

      const ctxMatch = reply.match(/CONTEXT_PROMPT:(\{.*?\})/s);
      if (ctxMatch) {
        try {
          const ctx = JSON.parse(ctxMatch[1]) as ContextConfig;
          const cleanReply = reply.replace(/CONTEXT_PROMPT:\{.*?\}/s, '').trim();
          if (cleanReply) addAssistantMessage(cleanReply, null, newHistory);
          else setHistory([...newHistory, { role: 'assistant', content: 'I need a bit more context.' }]);
          setContextConfig(ctx);
          setFooterMode('context');
        } catch { /* ignore parse failure */ }
      } else {
        const { artifact, cleanText } = parseArtifact(reply);
        addAssistantMessage(cleanText, artifact, newHistory);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        text: 'Something went wrong. Please try again.', timestamp: getTimestamp(),
      }]);
    }

    setIsLoading(false);
    if (textareaRef.current) textareaRef.current.focus();
  }

  // ── Context answer ──

  async function handleContextAnswer(answer: string) {
    if (!answer) return;
    setFooterMode('normal');
    setContextConfig(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: answer, timestamp: getTimestamp() };
    setMessages(prev => [...prev, userMsg]);
    const newHistory: HistoryItem[] = [...history, { role: 'user', content: answer }];
    setHistory(newHistory);
    setIsLoading(true);

    try {
      const reply = await callAthena(newHistory);
      const { artifact, cleanText } = parseArtifact(reply);
      addAssistantMessage(cleanText, artifact, newHistory);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        text: 'Something went wrong. Please try again.', timestamp: getTimestamp(),
      }]);
    }

    setIsLoading(false);
    if (textareaRef.current) textareaRef.current.focus();
  }

  // ── Compose (reset) ──

  function handleComposeNew() {
    if (isVoiceMode) setIsVoiceMode(false);
    setIsSubmitted(false);
    setMessages([]);
    setHistory([]);
    setInputText('');
    setIsLoading(false);
    setHeaderTitle('Athena');
    setHeaderTypewriterSrc(null);
    setFooterMode('normal');
    setContextConfig(null);
    setAttachmentChips([]);
    setIsArtifactOpen(false);
    setCurrentArtifact(null);
    setTimeout(() => textareaRef.current && textareaRef.current.focus(), 50);
  }

  // ── Artifact panel ──

  function openArtifact(artifact: Artifact) {
    const shell = shellRef.current;
    if (!shell || shell.offsetWidth - 328 - 4 < 430) return;
    setCurrentArtifact(artifact);
    setIsArtifactOpen(true);
    setActiveTab('preview');
    chatWidthRef.current = 328;
    setChatWidth(328);
  }

  function closeArtifact() {
    setIsArtifactOpen(false);
    setCurrentArtifact(null);
    chatWidthRef.current = 328;
    setChatWidth(328);
  }

  // ── Attachment chips ──

  function addAttachmentChip(label: string, content: string) {
    setAttachmentChips(prev => {
      if (prev.find(c => c.label === label)) return prev;
      return [...prev, { id: crypto.randomUUID(), label, content }];
    });
  }

  function removeAttachmentChip(id: string) {
    setAttachmentChips(prev => prev.filter(c => c.id !== id));
  }

  // ── Drag resize ──

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidthRef.current;

    function onMove(ev: MouseEvent) {
      const shell = shellRef.current;
      if (!shell) return;
      const newWidth = Math.max(328, startWidth + (ev.clientX - startX));
      if (shell.offsetWidth - newWidth - 4 < 430) { closeArtifact(); cleanup(); return; }
      chatWidthRef.current = newWidth;
      setChatWidth(newWidth);
    }
    function cleanup() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', cleanup);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', cleanup);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scroll anchor ──

  function handleScroll() {
    const el = messagesAreaRef.current;
    if (!el) return;
    setScrollDist(el.scrollHeight - el.scrollTop - el.clientHeight);
  }

  function scrollToBottom() {
    const el = messagesAreaRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  // ── Render ──

  return (
    <>
      {/* Mode toggle */}
      <button className="mode-toggle" onClick={() => setIsDark(d => !d)} title="Toggle light/dark">
        <svg className="icon-sun" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <svg className="icon-moon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="canvas">
        <div
          ref={shellRef}
          className={`shell${isArtifactOpen ? ' artifact-open' : ''}`}
        >
          {/* ── Chat window ── */}
          <div
            className={`chat-window${isSubmitted ? ' submitted' : ''}`}
            style={{ width: isArtifactOpen ? chatWidth : '100%' }}
          >
            {/* Header */}
            {!isVoiceMode && (
              <ChatHeader isSubmitted={isSubmitted} title={headerTitle} onCompose={handleComposeNew} />
            )}

            {/* Messages */}
            <motion.div
              className="messages-area"
              ref={messagesAreaRef}
              initial={{ opacity: 0, top: 24 }}
              animate={{ opacity: isSubmitted ? 1 : 0, top: isSubmitted ? 80 : 24 }}
              transition={{
                opacity: { duration: 0.4, delay: isSubmitted ? 0.3 : 0 },
                top: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
              }}
              style={{ bottom: messagesBottom, pointerEvents: isSubmitted ? 'all' : 'none' }}
              onScroll={handleScroll}
            >
              {messages.map(msg => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onTypingComplete={handleTypingComplete}
                  onArtifactClick={openArtifact}
                  messagesEl={messagesAreaRef.current}
                />
              ))}
            </motion.div>

            {/* Scroll anchor */}
            <motion.button
              className="scroll-anchor"
              animate={{ opacity: scrollDist > 80 ? 1 : 0, scale: scrollDist > 80 ? 1 : 0.8, x: '-50%' }}
              transition={{ duration: 0.2 }}
              style={{ bottom: scrollAnchorBottom, pointerEvents: scrollDist > 80 ? 'all' : 'none' }}
              onClick={scrollToBottom}
              title="Scroll to bottom"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v8M3 7l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>

            {/* Input wrapper — CSS handles centering → bottom animation */}
            <div className="input-wrapper">
              <div className="welcome">
                <h1>How can I help you today?</h1>
              </div>

              <ProcessingBar isLoading={isLoading} />

              {/* Footer slot: normal input ↔ context prompt */}
              <div className="footer-slot" ref={footerSlotRef}>
                <AnimatePresence mode="wait">
                  {footerMode === 'normal' ? (
                    <motion.div
                      key="normal"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {!isVoiceMode && (
                        <FooterNormal
                          chips={attachmentChips}
                          onRemoveChip={removeAttachmentChip}
                          inputText={inputText}
                          onChange={setInputText}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                          onSend={handleSubmit}
                          onVoice={() => { if (!isSubmitted) setIsSubmitted(true); setIsVoiceMode(true); }}
                          disabled={isLoading}
                          textareaRef={textareaRef}
                        />
                      )}
                      {isVoiceMode && (
                        <VoiceMode
                          captionLine={captionLine}
                          onEnd={() => setIsVoiceMode(false)}
                          onMute={() => setIsMuted(m => !m)}
                          isMuted={isMuted}
                          canvasRef={waveCanvasRef}
                          containerRef={voiceContainerRef}
                        />
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="context"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {contextConfig && (
                        <FooterContext config={contextConfig} onAnswer={handleContextAnswer} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="caption" ref={captionRef}>Athena may make mistakes. Review important info.</p>
            </div>
          </div>

          {/* Drag handle */}
          <div className="drag-handle" onMouseDown={handleDragMouseDown} />

          {/* Artifact panel */}
          <ArtifactPanel
            isOpen={isArtifactOpen}
            artifact={currentArtifact}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onClose={closeArtifact}
            onAddToChat={addAttachmentChip}
          />
        </div>
      </div>
    </>
  );
}
