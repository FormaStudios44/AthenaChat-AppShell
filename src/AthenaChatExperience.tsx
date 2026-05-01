import React, {
  useState, useEffect, useRef, useCallback, useLayoutEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './AthenaChatExperience.css';
import FloatingChat from './FloatingChat';
import FullscreenChat from './FullscreenChat';
import { IconChatFullscreen, IconChatFloating } from './icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type ArtifactTab = 'preview' | 'about' | 'audience' | 'launch';
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
  audienceName?: string;
  audienceSize?: string;
  audienceDetail?: string;
}

interface Artifact {
  type: ArtifactType;
  name: string;
  data: ArtifactData;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  artifact?: Artifact;
  pendingArtifact?: Artifact;
  isTyping?: boolean;
  participantId?: string | null;
}

interface Participant {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: string;       // avatar background
  textColor: string;   // avatar text
  bubbleColor: string; // message bubble background
  bubbleText: string;  // message bubble text color
  isHost: boolean;
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

interface BannerContext {
  firstSentence: React.ReactNode;
  restSentence: React.ReactNode;
  automations: {
    id: string;
    label: string;
    prompt: string;
  }[];
}

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
}

interface QueuedPrompt {
  id: string;
  text: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_QUEUE = 3;

const CHAT_MIN_WIDTH = 430;

const TEAM_MEMBERS: Participant[] = [
  { id: 'sarah',  name: 'Sarah Chen',  initials: 'SC', role: 'Head of Marketing · Zeta Global', color: '#7F77DD', textColor: '#CECBF6', bubbleColor: '#3C3489', bubbleText: '#CECBF6', isHost: false },
  { id: 'marcus', name: 'Marcus Kim',  initials: 'MK', role: 'Campaign Manager · Zeta Global',  color: '#0F6E56', textColor: '#9FE1CB', bubbleColor: '#085041', bubbleText: '#9FE1CB', isHost: false },
  { id: 'anika',  name: 'Anika Patel', initials: 'AP', role: 'Data Analyst · Zeta Global',      color: '#993C1D', textColor: '#F5C4B3', bubbleColor: '#712B13', bubbleText: '#F5C4B3', isHost: false },
];

const HOST_PARTICIPANT: Participant = {
  id: 'roman', name: 'Roman Gun', initials: 'RG', role: 'Host',
  color: '#1677FF', textColor: '#fff', bubbleColor: '#1677FF', bubbleText: '#fff', isHost: true,
};

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

const GOAL_ITEMS = [
  {
    heading: 'Close your Q2 re-engagement before the window shuts',
    sub: '2,847 lapsed contacts. 47 days quiet. Your Q2 deadline is 18 days out.',
    cta: 'Start the campaign',
    prompt: 'Draft a warm re-engagement campaign for my 2,847 lapsed contacts ahead of the Q2 deadline.',
  },
  {
    heading: "You're 2 campaigns short of your Q2 send goal",
    sub: "You set a target of 6 campaigns this quarter. You've sent 4. Two weeks left.",
    cta: 'Plan the next send',
    prompt: 'Help me plan my next two campaigns to hit my Q2 send goal.',
  },
];

const AUTO_ITEMS = [
  {
    heading: 'Schedule sends for Tuesday mornings automatically',
    sub: 'Athena has learned your audience engages most 9–11am on Tuesdays. Allow Athena to auto-schedule future sends into that window.',
    prompt: 'Yes, let Athena handle scheduling sends for Tuesday mornings automatically.',
  },
  {
    heading: 'Auto-follow up non-openers after 48 hours',
    sub: 'Non-opener follow-ups consistently lift your total reach by 18%. Athena can handle this after every send.',
    prompt: 'Yes, let Athena automatically follow up non-openers 48 hours after every send.',
  },
  {
    heading: 'Surface lapsed contacts before they hit 60 days',
    sub: 'Athena can flag and draft re-engagement for any segment that goes quiet for 45+ days before they go cold.',
    prompt: 'Yes, let Athena surface and handle lapsed contacts before they hit 60 days of silence.',
  },
];

const user = { firstName: 'Roman', lastName: 'Gun', fullName: 'Roman Gun' };

function getWelcomeMessage(name: string): string {
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? `Good morning, ${name}!` :
    hour < 17 ? `Good afternoon, ${name}!` :
                `Good evening, ${name}!`;

  const contextual = [
    `Morning, ${name}. Win-back ready?`,
    `Afternoon, ${name}. Send today?`,
    `Q2's close, ${name}. Ready up?`,
    `47 days dark, ${name}. Fix it?`,
  ];

  // Odd days get time-of-day greeting, even days get a contextual nudge
  const day = new Date().getDate();
  return day % 2 === 0
    ? timeGreeting
    : contextual[Math.floor(day / 2) % contextual.length];
}

const DEFAULT_SYSTEM_PROMPT = `You are Athena, an ambient AI layer embedded in Zeta Global's marketing platform. You work alongside ${user.firstName} — you know their brand, their history, and what's been happening in their account.

When ${user.firstName} greets you or says something casual like "hi", "hey", or "what's up", address them by first name naturally — not every single message, just on the opening greeting. Never introduce yourself with a feature list. Instead respond like a sharp colleague who's been paying attention to the account. Lead with a proactive observation or suggestion. Keep it to 2-3 sentences. End with one specific actionable question.

Examples:
"Hey ${user.firstName} — your lapsed segment hasn't heard from you in 47 days. Want me to draft a win-back before they go fully cold?"
"Good timing, ${user.firstName}. Email engagement has been strongest on Tuesday mornings lately — want to schedule something this week while the window's open?"

Never say 'I am Athena' or list your capabilities. Never use bullet points in a greeting. Never use emoji. Sound like you belong in the room.

When the user asks you to build, create, generate, or write a campaign OR an email (including email campaigns, marketing emails, promotional emails, newsletters, re-engagement emails, or any email-related request), respond with a short confirmation message AND include a JSON block at the end of your response in this exact format (no markdown, just the JSON on its own line):
ARTIFACT:{"type":"campaign","name":"<campaign name>","subjectLine":"<compelling subject line>","description":"<2-3 sentence description>","broadcast":"at a specific time","send":"Immediate","status":"Draft","owner":"You","emailHeadline":"<punchy email headline, 6-10 words>","emailBody1":"<opening paragraph, 2-3 sentences, warm and direct>","emailBody2":"<second paragraph, 2-3 sentences, value-focused>","emailCta":"<CTA button label, 2-4 words>","audienceName":"<segment name, e.g. Lapsed Contacts>","audienceSize":"<estimated contact count as formatted number, e.g. 2,847>","audienceDetail":"<one line explaining why this audience fits, e.g. Last active 47+ days ago>"}

STRICT RULE — CAMPAIGN EDITS: When the user's message includes one or more [Attached — ...] blocks containing campaign content (headline, body copy, subject line, CTA, etc.), treat the request as a campaign modification. You MUST respond with an updated campaign ARTIFACT that incorporates the requested change. Never respond with a code artifact for these requests. Apply the change to the attached content and regenerate the full campaign JSON with all fields populated.

When the user asks for code explicitly (not a campaign modification), respond with a short message AND include:
ARTIFACT:{"type":"code","name":"<snippet name>","code":"<the actual code>"}

STRICT RULE: If the user's request is vague, broad, or missing any of the following — campaign type, audience, goal, or tone — you MUST respond with CONTEXT_PROMPT before doing anything else. Do not attempt to generate a campaign or artifact until you have asked at least one clarifying question. Never skip this step for short or ambiguous messages like "create a campaign", "help me with email", "build something", or "I need a campaign".
CONTEXT_PROMPT:{"question":"<one clear question>","options":["<option 1>","<option 2>","<option 3>","<option 4>"]}

For all other requests, respond normally without any special block.`;

const SAMPLE_AGENTS: Agent[] = [
  {
    id: 'athena',
    name: 'Athena',
    description: 'Your ambient AI layer for Zeta Global',
    avatar: '✦',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  },
  {
    id: 'campaign-strategist',
    name: 'Campaign Strategist',
    description: 'Specializes in campaign planning and optimization',
    avatar: '🎯',
    systemPrompt: `You are a Campaign Strategist AI embedded in Zeta Global's marketing platform. You specialize in campaign planning, A/B testing strategies, and conversion optimization. Help ${user.firstName} design high-performing campaigns with clear goals, target audiences, and measurable KPIs. When the user asks to build a campaign, generate a campaign ARTIFACT. Always ask about campaign objectives before suggesting strategies if the intent is unclear.`,
  },
  {
    id: 'audience-builder',
    name: 'Audience Builder',
    description: 'Builds and refines audience segments',
    avatar: '👥',
    systemPrompt: `You are an Audience Builder AI embedded in Zeta Global's marketing platform. You specialize in audience segmentation, lookalike modeling, and behavioral targeting. Help ${user.firstName} identify, refine, and activate the right audience segments. When asked to build or define an audience, respond with ARTIFACT:{"type":"audience","name":"<segment name>","audienceName":"<segment name>","audienceSize":"<estimated count>","audienceDetail":"<one-line rationale>"}. Never use bullet points in greetings.`,
  },
  {
    id: 'email-writer',
    name: 'Email Writer',
    description: 'Crafts compelling email copy and subject lines',
    avatar: '✉️',
    systemPrompt: `You are an Email Writer AI embedded in Zeta Global's marketing platform. You specialize in crafting compelling email copy, subject lines, and CTAs that convert. Help ${user.firstName} write emails that feel personal and drive action. Always generate a campaign ARTIFACT when writing email content. Focus on clarity, emotional resonance, and a single strong CTA.`,
  },
  {
    id: 'analytics-advisor',
    name: 'Analytics Advisor',
    description: 'Interprets data and surfaces actionable insights',
    avatar: '📊',
    systemPrompt: `You are an Analytics Advisor AI embedded in Zeta Global's marketing platform. You specialize in interpreting marketing performance data, surfacing actionable insights, and recommending optimizations. Help ${user.firstName} understand what the numbers mean and what to do next. Be concise, data-driven, and specific. Always tie insights back to a recommended action.`,
  },
];

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

// Athena icon: sparkle + small cross (top-right) + small dot (bottom-left), gradient fill
const ATHENA_ICON_PATH = 'M7.01126 0.470228C7.19962 0.327342 7.42956 0.25 7.66598 0.25C7.90241 0.25 8.13234 0.327342 8.32071 0.470228C8.50907 0.613112 8.64552 0.813694 8.70923 1.04137L8.71325 1.05634L9.76721 5.14615C9.79325 5.24709 9.84586 5.3392 9.91957 5.41291C9.99323 5.48658 10.0853 5.53917 10.1861 5.56523C10.1861 5.56521 10.1862 5.56524 10.1861 5.56523L14.2884 6.6224C14.517 6.68545 14.7186 6.82186 14.8622 7.0105C15.0059 7.19915 15.0837 7.42972 15.0837 7.66683C15.0837 7.90395 15.0059 8.13452 14.8622 8.32317C14.7186 8.51181 14.517 8.64812 14.2884 8.71117L14.2762 8.71454L10.1863 9.76839C10.0854 9.79443 9.99328 9.84704 9.91957 9.92075C9.84586 9.99446 9.79325 10.0866 9.76721 10.1875L8.71256 14.2774L8.70857 14.2923C8.64485 14.52 8.5084 14.7206 8.32004 14.8634C8.13168 15.0063 7.90175 15.0837 7.66532 15.0837C7.42889 15.0837 7.19896 15.0063 7.0106 14.8634C6.82224 14.7206 6.68578 14.52 6.62207 14.2923L6.61804 14.2773L5.56409 10.1875C5.56408 10.1875 5.56411 10.1876 5.56409 10.1875C5.53804 10.0867 5.4854 9.99442 5.41173 9.92075C5.33802 9.84704 5.24591 9.79443 5.14497 9.76839L1.05504 8.71374L1.03753 8.709C0.810748 8.64463 0.61115 8.50805 0.469023 8.31996C0.326897 8.13188 0.25 7.90257 0.25 7.66683C0.25 7.43109 0.326897 7.20178 0.469023 7.0137C0.61115 6.82562 0.810748 6.68903 1.03753 6.62467L1.05493 6.61995L5.14493 5.56462C5.24584 5.5386 5.33807 5.486 5.41177 5.41234C5.48541 5.33876 5.53801 5.24682 5.56412 5.14605C5.56409 5.14615 5.56415 5.14595 5.56412 5.14605L6.61874 1.05623L6.62273 1.04137C6.68645 0.813698 6.8229 0.613115 7.01126 0.470228ZM7.66586 3.0028L8.31471 5.52066C8.40771 5.88115 8.59566 6.21032 8.85891 6.47357C9.12216 6.73683 9.45114 6.92473 9.81164 7.01772L12.3305 7.66683L9.81182 8.31589C9.45133 8.40889 9.12216 8.59684 8.85891 8.86009C8.59566 9.12334 8.40776 9.45233 8.31476 9.81282L7.66544 12.3309L7.01659 9.813C6.92359 9.45251 6.73564 9.12334 6.47239 8.86009C6.20914 8.59684 5.88016 8.40894 5.51967 8.31594L3.00192 7.6667L5.51956 7.01708C5.51952 7.0171 5.51961 7.01707 5.51956 7.01708C5.87987 6.92416 6.20886 6.7364 6.47206 6.47337C6.7353 6.21032 6.92328 5.88155 7.01644 5.52125L7.66586 3.0028ZM12.999 0.916829C13.4132 0.916829 13.749 1.25262 13.749 1.66683V2.25016H14.3324C14.7466 2.25016 15.0824 2.58595 15.0824 3.00016C15.0824 3.41438 14.7466 3.75016 14.3324 3.75016H13.749V4.3335C13.749 4.74771 13.4132 5.0835 12.999 5.0835C12.5848 5.0835 12.249 4.74771 12.249 4.3335V3.75016H11.6657C11.2515 3.75016 10.9157 3.41438 10.9157 3.00016C10.9157 2.58595 11.2515 2.25016 11.6657 2.25016H12.249V1.66683C12.249 1.25262 12.5848 0.916829 12.999 0.916829ZM1.58649 12.4127C1.62606 12.7897 1.94489 13.0835 2.33236 13.0835C2.71982 13.0835 3.03866 12.7897 3.07822 12.4127C3.45521 12.3731 3.74902 12.0543 3.74902 11.6668C3.74902 11.2794 3.45521 10.9605 3.07822 10.921C3.03866 10.544 2.71982 10.2502 2.33236 10.2502C1.94489 10.2502 1.62605 10.544 1.58649 10.921C1.2095 10.9605 0.91569 11.2794 0.91569 11.6668C0.91569 12.0543 1.20951 12.3731 1.58649 12.4127Z';

// Generic agent icon (all non-Athena agents)
const AGENT_ICON_PATH = 'M4.92535 0.443122C5.09053 0.317823 5.29216 0.25 5.49949 0.25C5.70681 0.25 5.90844 0.317824 6.07362 0.443122C6.2388 0.568419 6.35845 0.744312 6.41433 0.94397L6.41835 0.958935L7.05069 3.41269C7.05292 3.42133 7.05743 3.42923 7.06374 3.43554C7.07006 3.44186 7.07795 3.44637 7.0866 3.4486L9.55264 4.0841C9.75309 4.13939 9.92983 4.25903 10.0558 4.42445C10.1818 4.58988 10.25 4.79207 10.25 5C10.25 5.20793 10.1818 5.41012 10.0558 5.57555C9.92983 5.74098 9.75306 5.86051 9.55261 5.91579L9.54037 5.91917L7.0866 6.5514C7.07795 6.55363 7.07006 6.55814 7.06374 6.56446C7.05743 6.57077 7.05292 6.57866 7.05069 6.58731L6.41792 9.04118L6.41393 9.05603C6.35806 9.25569 6.2384 9.43158 6.07322 9.55688C5.90805 9.68217 5.70642 9.75 5.49909 9.75C5.29175 9.75 5.09012 9.68217 4.92495 9.55688C4.75977 9.43158 4.64012 9.25569 4.58424 9.05603L4.58022 9.04107L3.94788 6.58731C3.94564 6.5787 3.94112 6.57075 3.93483 6.56446C3.92853 6.55816 3.92067 6.55366 3.91205 6.55142M3.91205 6.55142L1.45811 5.91864L1.4406 5.9139C1.24173 5.85745 1.0667 5.73767 0.942065 5.57274C0.817432 5.40781 0.75 5.20673 0.75 5C0.75 4.79327 0.817432 4.59219 0.942065 4.42726C1.0667 4.26233 1.24173 4.14255 1.4406 4.0861L1.458 4.08139L3.91194 3.44821C3.92058 3.44598 3.92861 3.44144 3.93493 3.43513C3.94121 3.42885 3.9457 3.42101 3.94795 3.41242L4.58065 0.958824L4.58464 0.94397C4.64051 0.744319 4.76017 0.568423 4.92535 0.443122M5.49932 3.40351L5.59819 3.7872C5.66738 4.0554 5.80722 4.30035 6.00308 4.4962C6.19894 4.69206 6.4437 4.83185 6.7119 4.90104L7.09589 5L6.71209 5.09891C6.44389 5.1681 6.19894 5.30794 6.00308 5.5038C5.80722 5.69965 5.66743 5.94441 5.59824 6.21262L5.49925 6.59649L5.40038 6.2128C5.33119 5.9446 5.19135 5.69965 4.99549 5.5038C4.79963 5.30794 4.55487 5.16815 4.28667 5.09896L3.90227 4.99983L4.28657 4.90067C4.55462 4.83153 4.79941 4.69183 4.99522 4.49616C5.19107 4.30044 5.33092 4.05584 5.40023 3.78778L5.49932 3.40351ZM8.27452 1.66398C8.27603 1.24977 8.61304 0.915208 9.02725 0.916716C10.5912 0.922414 12.1142 1.41829 13.2566 2.33088C14.4029 3.24656 15.0906 4.52773 15.0833 5.90966V10.3372C15.0833 10.3642 15.0818 10.3911 15.0789 10.418C15.0072 11.0799 14.6405 11.6567 14.1128 12.062C13.5877 12.4654 12.9216 12.6885 12.2415 12.7185C12.2098 12.7199 12.178 12.7192 12.1463 12.7166L11.0931 12.6288V15C11.0931 15.4142 10.7573 15.75 10.3431 15.75C9.9289 15.75 9.59312 15.4142 9.59312 15V11.8138C9.59312 11.604 9.68094 11.4039 9.83528 11.2618C9.98962 11.1198 10.1964 11.0489 10.4054 11.0663L12.2197 11.2175C12.6078 11.1923 12.9528 11.0616 13.1991 10.8724C13.4382 10.6888 13.5534 10.4772 13.5833 10.2891V5.90317C13.5883 5.04679 13.1647 4.17729 12.3204 3.50285C11.4717 2.82483 10.2868 2.42131 9.02178 2.41671C8.60757 2.4152 8.27301 2.07819 8.27452 1.66398ZM4.88764 10.8282C5.28517 10.9445 5.51312 11.3611 5.39678 11.7586L4.38647 15.2107C4.27012 15.6082 3.85354 15.8362 3.456 15.7198C3.05846 15.6035 2.83051 15.1869 2.94686 14.7893L3.95717 11.3373C4.07351 10.9398 4.4901 10.7118 4.88764 10.8282Z';

function SparkleGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="23.4448" y1="-11.1367" x2="-11.5792" y2="21.8817" gradientUnits="userSpaceOnUse">
        <stop offset="24.16%" stopColor="#0FAEFF" />
        <stop offset="53.98%" stopColor="#BA0090" />
        <stop offset="85.68%" stopColor="#FFF047" />
      </linearGradient>
    </defs>
  );
}

function SparkleHeaderIcon() {
  return (
    <svg className="chat-header-sparkle" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d={ATHENA_ICON_PATH} fill="url(#sg-header)" />
      <SparkleGradient id="sg-header" />
    </svg>
  );
}

function AgentRowIcon({ isAthena }: { isAthena: boolean }) {
  if (isAthena) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <defs>
          <linearGradient id="athena-agent-row-grad" x1="23.4448" y1="-11.1367" x2="-11.5792" y2="21.8817" gradientUnits="userSpaceOnUse">
            <stop offset="24.16%" stopColor="#0FAEFF" />
            <stop offset="53.98%" stopColor="#BA0090" />
            <stop offset="85.68%" stopColor="#FFF047" />
          </linearGradient>
        </defs>
        <path fillRule="evenodd" clipRule="evenodd" d={ATHENA_ICON_PATH} fill="url(#athena-agent-row-grad)" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d={AGENT_ICON_PATH} fill="white" fillOpacity={0.65} />
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

function RegenerateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.99718 1.25001L8 1.25C9.79021 1.25001 11.5071 1.96116 12.773 3.22703C14.0388 4.49291 14.75 6.20979 14.75 8.00001C14.75 8.41422 14.4142 8.75001 14 8.75001C13.5858 8.75001 13.25 8.41422 13.25 8.00001C13.25 6.60762 12.6969 5.27226 11.7123 4.28769C10.7281 3.30346 9.39329 2.75038 8.00141 2.75001C6.52014 2.75594 5.09837 3.3333 4.03237 4.36163L3.81066 4.58334H5.33333C5.74755 4.58334 6.08333 4.91913 6.08333 5.33334C6.08333 5.74755 5.74755 6.08334 5.33333 6.08334H2C1.58579 6.08334 1.25 5.74755 1.25 5.33334V2.00001C1.25 1.58579 1.58579 1.25001 2 1.25001C2.41421 1.25001 2.75 1.58579 2.75 2.00001V3.52268L2.98531 3.28737C4.33044 1.987 6.12627 1.25705 7.99718 1.25001ZM2 7.25001C2.41421 7.25001 2.75 7.58579 2.75 8.00001C2.75 9.39239 3.30312 10.7277 4.28769 11.7123C5.27195 12.6966 6.60678 13.2497 7.99869 13.25C9.47991 13.244 10.9016 12.6667 11.9676 11.6384L12.1893 11.4167H10.6667C10.2525 11.4167 9.91667 11.0809 9.91667 10.6667C9.91667 10.2525 10.2525 9.91667 10.6667 9.91667H14C14.4142 9.91667 14.75 10.2525 14.75 10.6667V14C14.75 14.4142 14.4142 14.75 14 14.75C13.5858 14.75 13.25 14.4142 13.25 14V12.4773L13.0147 12.7126C11.6696 14.013 9.87373 14.743 8.00282 14.75L8 14.75C6.20979 14.75 4.4929 14.0388 3.22703 12.773C1.96116 11.5071 1.25 9.79022 1.25 8.00001C1.25 7.58579 1.58579 7.25001 2 7.25001Z" fill="currentColor"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.66634 2.08301C2.34722 2.08301 2.08301 2.34722 2.08301 2.66634V9.33301C2.08301 9.65213 2.34722 9.91634 2.66634 9.91634C3.08055 9.91634 3.41634 10.2521 3.41634 10.6663C3.41634 11.0806 3.08055 11.4163 2.66634 11.4163C1.51879 11.4163 0.583008 10.4806 0.583008 9.33301V2.66634C0.583008 1.51879 1.51879 0.583008 2.66634 0.583008H9.33301C10.4806 0.583008 11.4163 1.51879 11.4163 2.66634C11.4163 3.08055 11.0806 3.41634 10.6663 3.41634C10.2521 3.41634 9.91634 3.08055 9.91634 2.66634C9.91634 2.34722 9.65213 2.08301 9.33301 2.08301H2.66634ZM6.66634 6.08301C6.34418 6.08301 6.08301 6.34418 6.08301 6.66634V13.333C6.08301 13.6552 6.34418 13.9163 6.66634 13.9163H13.333C13.6552 13.9163 13.9163 13.6552 13.9163 13.333V6.66634C13.9163 6.34418 13.6552 6.08301 13.333 6.08301H6.66634ZM4.58301 6.66634C4.58301 5.51575 5.51575 4.58301 6.66634 4.58301H13.333C14.4836 4.58301 15.4163 5.51575 15.4163 6.66634V13.333C15.4163 14.4836 14.4836 15.4163 13.333 15.4163H6.66634C5.51575 15.4163 4.58301 14.4836 4.58301 13.333V6.66634Z" fill="currentColor"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ThumbsUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.24604 0.914201C7.37466 0.657333 7.63871 0.496501 7.92595 0.500058C8.35334 0.50535 8.774 0.607152 9.15651 0.797859C9.53902 0.988565 9.87349 1.26324 10.1349 1.60138C10.3964 1.93951 10.578 2.33235 10.6663 2.75054C10.7545 3.16823 10.7473 3.60042 10.6452 4.01491C10.6451 4.01542 10.6449 4.01593 10.6448 4.01644L10.2038 5.83333H13.1367C13.4601 5.83333 13.7791 5.90864 14.0684 6.05328C14.3576 6.19792 14.6093 6.40792 14.8033 6.66667C14.9974 6.92541 15.1285 7.22578 15.1864 7.54399C15.2443 7.8622 15.2272 8.18951 15.1367 8.5L13.5834 13.8331C13.4572 14.2658 13.194 14.6462 12.8333 14.9167C12.4727 15.1871 12.0341 15.3333 11.5833 15.3333H2.58333C2.0308 15.3333 1.50089 15.1138 1.11019 14.7231C0.719493 14.3324 0.5 13.8025 0.5 13.25V7.91667C0.5 7.36413 0.719493 6.83423 1.11019 6.44353C1.50089 6.05283 2.0308 5.83333 2.58333 5.83333H4.42294C4.53146 5.83328 4.63782 5.80295 4.73005 5.74575C4.82228 5.68856 4.89673 5.60677 4.94502 5.50958L4.94604 5.50753L7.24604 0.914201ZM3.83333 7.33333H2.58333C2.42862 7.33333 2.28025 7.39479 2.17085 7.50419C2.06146 7.61358 2 7.76196 2 7.91667V13.25C2 13.4047 2.06146 13.5531 2.17085 13.6625C2.28025 13.7719 2.42862 13.8333 2.58333 13.8333H3.83333V7.33333ZM5.33333 13.8333H11.5833C11.7096 13.8333 11.8324 13.7924 11.9333 13.7167C12.0343 13.6409 12.108 13.5345 12.1433 13.4133L13.6966 8.08028C13.7219 7.99334 13.7268 7.90142 13.7106 7.81232C13.6944 7.72322 13.6577 7.63911 13.6033 7.56667C13.549 7.49422 13.4785 7.43542 13.3975 7.39492C13.3165 7.35442 13.2272 7.33333 13.1367 7.33333H9.25C9.01995 7.33333 8.80263 7.22776 8.66043 7.04692C8.51824 6.86608 8.4669 6.62999 8.52116 6.40643L9.18783 3.65976L9.18853 3.6569C9.2368 3.46137 9.24027 3.25745 9.19867 3.06039C9.15706 2.86334 9.07147 2.67823 8.94827 2.5189C8.82508 2.35956 8.66747 2.23013 8.48723 2.14027C8.43961 2.11653 8.39074 2.09571 8.34089 2.07789L6.28831 6.17708C6.28812 6.17748 6.28792 6.17789 6.28772 6.17829C6.11522 6.52486 5.84957 6.81652 5.52056 7.02054C5.45978 7.05823 5.39728 7.09266 5.33333 7.12374V13.8333Z" fill="currentColor"/>
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.72396 15.1691C8.59534 15.426 8.3313 15.5868 8.04405 15.5833C7.61666 15.578 7.196 15.4762 6.81349 15.2855C6.43098 15.0948 6.09651 14.8201 5.83507 14.482C5.57363 14.1438 5.39197 13.751 5.30368 13.3328C5.2155 12.9151 5.22273 12.4829 5.32482 12.0684L5.3252 12.0669L5.76618 10.25H2.83333C2.50991 10.25 2.19092 10.1747 1.90164 10.0301C1.61236 9.88542 1.36072 9.67541 1.16667 9.41667C0.972609 9.15792 0.841461 8.85755 0.783604 8.53934C0.725749 8.22113 0.742773 7.89382 0.833333 7.58333L2.38659 2.25028C2.5128 1.81754 2.77605 1.43713 3.13667 1.16667C3.49728 0.896203 3.9359 0.75 4.38667 0.75H13.3867C13.9392 0.75 14.4691 0.969494 14.8598 1.36019C15.2505 1.75089 15.47 2.2808 15.47 2.83333V8.16667C15.47 8.7192 15.2505 9.2491 14.8598 9.6398C14.4691 10.0305 13.9392 10.25 13.3867 10.25H11.5471C11.4385 10.2501 11.3322 10.2804 11.24 10.3376C11.1477 10.3948 11.0733 10.4766 11.025 10.5737L11.024 10.5758L8.72396 15.1691ZM12.1367 8.75H13.3867C13.5414 8.75 13.6897 8.68854 13.7991 8.57914C13.9085 8.46975 13.97 8.32137 13.97 8.16667V2.83333C13.97 2.67862 13.9085 2.53025 13.7991 2.42085C13.6897 2.31146 13.5414 2.25 13.3867 2.25H12.1367V8.75ZM10.6367 2.25H4.38667C4.26045 2.25 4.13764 2.29094 4.03667 2.36667C3.93569 2.44239 3.86201 2.54883 3.82667 2.67L2.27341 8.00306C2.24806 8.08999 2.24321 8.18191 2.25941 8.27102C2.27561 8.36012 2.31233 8.44422 2.36667 8.51666C2.421 8.58911 2.49146 8.64791 2.57246 8.68841C2.65346 8.72891 2.74277 8.75 2.83333 8.75H6.72C6.95005 8.75 7.16737 8.85558 7.30957 9.03641C7.45176 9.21725 7.5031 9.45334 7.44884 9.6769L6.78217 12.4236L6.78147 12.4264C6.7332 12.622 6.72973 12.8259 6.77133 13.0229C6.81294 13.22 6.89853 13.4051 7.02173 13.5644C7.14492 13.7238 7.30253 13.8532 7.48277 13.9431C7.53039 13.9668 7.57926 13.9876 7.62911 14.0054L9.68169 9.90625L9.68228 9.90504C9.85478 9.55848 10.1204 9.26682 10.4494 9.06279C10.5102 9.0251 10.5727 8.99067 10.6367 8.95959V2.25Z" fill="currentColor"/>
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

const PLACEHOLDER_SUGGESTIONS = [
  'Find high-intent accounts in the Northeast',
  "Which segments responded to last quarter's email push?",
  'Show me campaigns with the highest CTR this month',
  'Identify customers at risk of churn',
  'Which audiences are ready for re-engagement?',
  'Summarize performance of my last 5 campaigns',
  "What's the best time to send to my B2B segment?",
  "Create a segment of users who haven't purchased in 90 days",
  'Which content is driving the most conversions?',
  'Show me my top-performing email subject lines',
];

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
  const [suggIndex, setSuggIndex] = useState(0);
  const [suggVisible, setSuggVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setSuggVisible(false);
      setTimeout(() => {
        setSuggIndex(i => (i + 1) % PLACEHOLDER_SUGGESTIONS.length);
        setSuggVisible(true);
      }, 350);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="input-container">
      <AttachmentChips chips={chips} onRemove={onRemoveChip} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder=""
          value={inputText}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          style={{ flex: 1 }}
        />
        {inputText === '' && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0,
              fontFamily: "'Lato', sans-serif",
              fontSize: 'inherit',
              fontWeight: 400,
              lineHeight: 1.6,
              color: 'var(--placeholder-color)',
              pointerEvents: 'none',
              userSelect: 'none',
              opacity: suggVisible ? 1 : 0,
              transition: 'opacity 0.35s ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {PLACEHOLDER_SUGGESTIONS[suggIndex]}
          </div>
        )}
      </div>
      <div className="input-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" title="Attach file">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M7.99992 2.58398C8.41413 2.58398 8.74992 2.91977 8.74992 3.33398V7.25065H12.6666C13.0808 7.25065 13.4166 7.58644 13.4166 8.00065C13.4166 8.41486 13.0808 8.75065 12.6666 8.75065H8.74992V12.6673C8.74992 13.0815 8.41413 13.4173 7.99992 13.4173C7.58571 13.4173 7.24992 13.0815 7.24992 12.6673V8.75065H3.33325C2.91904 8.75065 2.58325 8.41486 2.58325 8.00065C2.58325 7.58644 2.91904 7.25065 3.33325 7.25065H7.24992V3.33398C7.24992 2.91977 7.58571 2.58398 7.99992 2.58398Z" fill="currentColor"/>
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

// ─── Nudge carousel ───────────────────────────────────────────────────────────

const NUDGE_DATA = [
  {
    text: "2,847 contacts haven't heard from you in 47 days — Q2 re-engagement window is closing.",
    highlight: '2,847 contacts',
    cta: 'Draft campaign',
    prompt: "Draft a re-engagement campaign for my 2,847 lapsed contacts. Warm and friendly tone, Q2 deadline.",
  },
  {
    text: "Email engagement peaks Tuesday mornings 9–11am — you haven't sent anything this week.",
    highlight: 'Tuesday mornings 9–11am',
    cta: 'Schedule send',
    prompt: 'Help me schedule an email send for Tuesday morning to hit peak engagement.',
  },
  {
    text: "Spring Promo had a 34% open rate — the non-openers haven't been followed up with yet.",
    highlight: '34% open rate',
    cta: 'Create follow-up',
    prompt: 'Create a follow-up campaign targeting non-openers from the Spring Promo campaign.',
  },
];

const NudgeCarousel = ({
  containerWidth,
  onDismissAll,
  onSend,
}: {
  containerWidth: number;
  onDismissAll: () => void;
  onSend?: (text: string) => void;
}) => {
  const [currentOriginalIdx, setCurrentOriginalIdx] = useState(0);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [direction, setDirection] = useState(1);

  const visibleIndices = NUDGE_DATA.map((_, i) => i).filter(i => !dismissed.includes(i));
  const nudge = NUDGE_DATA[currentOriginalIdx];
  const isNarrow = containerWidth > 0 && containerWidth < 560;

  useEffect(() => {
    if (dismissed.length === NUDGE_DATA.length) onDismissAll();
  }, [dismissed, onDismissAll]);

  const goTo = (dir: number) => {
    setDirection(dir);
    const pos = visibleIndices.indexOf(currentOriginalIdx);
    const nextPos = (pos + dir + visibleIndices.length) % visibleIndices.length;
    setCurrentOriginalIdx(visibleIndices[nextPos]);
  };

  const dismiss = () => {
    const newDismissed = [...dismissed, currentOriginalIdx];
    setDismissed(newDismissed);
    const newVisible = NUDGE_DATA.map((_, i) => i).filter(i => !newDismissed.includes(i));
    if (newVisible.length > 0) {
      const pos = visibleIndices.indexOf(currentOriginalIdx);
      const nextPos = Math.min(pos, newVisible.length - 1);
      setCurrentOriginalIdx(newVisible[nextPos]);
    }
  };

  const renderText = (text: string, highlight: string) => {
    const idx = text.indexOf(highlight);
    if (idx === -1) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 500 }}>{highlight}</span>
        {text.slice(idx + highlight.length)}
      </>
    );
  };

  if (!nudge || visibleIndices.length === 0) return null;

  const currentPos = visibleIndices.indexOf(currentOriginalIdx);
  const dotsToShow = isNarrow
    ? visibleIndices.filter((_, i) => Math.abs(i - currentPos) <= 1)
    : visibleIndices;

  return (
    <div style={{ width: '100%', maxWidth: 840, marginTop: 10 }}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${currentOriginalIdx}-${dismissed.length}`}
          custom={direction}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: d > 0 ? 14 : -14 }),
            center: { opacity: 1, x: 0 },
            exit: (d: number) => ({ opacity: 0, x: d > 0 ? -14 : 14 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Card */}
          <div
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: isNarrow ? '10px 12px' : '11px 14px',
              cursor: 'default',
              transition: 'background 0.15s, border-color 0.15s',
              boxSizing: 'border-box',
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: isNarrow ? 'flex-start' : 'center', gap: 10 }}>
              {/* Text */}
              <div style={{
                fontSize: isNarrow ? 12 : 13,
                color: 'rgba(255,255,255,0.62)',
                lineHeight: 1.5,
                flex: 1,
                ...(isNarrow ? {
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                } : {}),
              }}>
                {renderText(nudge.text, nudge.highlight)}
              </div>
              {/* CTA — wide only */}
              {!isNarrow && (
                <button
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#1677FF',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'inherit',
                  }}
                  onClick={() => onSend?.(nudge.prompt)}
                >
                  {nudge.cta} →
                </button>
              )}
              {/* Dismiss */}
              <button
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', fontSize: 16,
                  padding: '0 0 0 4px', flexShrink: 0, lineHeight: 1,
                  fontFamily: 'inherit',
                }}
                onClick={dismiss}
              >×</button>
            </div>
            {/* CTA — narrow only */}
            {isNarrow && (
              <button
                style={{
                  display: 'block',
                  marginTop: 6,
                  marginLeft: 16,
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#1677FF',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
                onClick={() => onSend?.(nudge.prompt)}
              >
                {nudge.cta} →
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

    </div>
  );
};

// ─── Processing bar ───────────────────────────────────────────────────────────

function ProcessingBar({ isLoading }: { isLoading: boolean }) {
  const { phrase, opacity } = useProcessingPhrase(isLoading);
  return (
    <div style={{
      width: '100%',
      maxWidth: 840,
      display: isLoading ? 'flex' : 'none',
      alignItems: 'center',
      gap: 8,
      marginBottom: 24,
      position: 'relative',
      zIndex: 10,
    }}>
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

// ─── Message actions ──────────────────────────────────────────────────────────

function MessageActions({ text, onThumbsDown }: { text: string; onThumbsDown?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="message-actions">
      <div className="message-actions-left">
        <button className="action-btn" title="Regenerate">
          <RegenerateIcon />
        </button>
        <button className="action-btn" title="Copy" onClick={handleCopy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <div className="message-actions-right">
        <button
          className={`action-btn${feedback === 'up' ? ' active' : ''}`}
          title="Helpful"
          onClick={() => setFeedback(f => f === 'up' ? null : 'up')}
        >
          <ThumbsUpIcon />
        </button>
        <button
          className={`action-btn${feedback === 'down' ? ' active' : ''}`}
          title="Not helpful"
          onClick={() => {
            setFeedback(f => f === 'down' ? null : 'down');
            onThumbsDown?.();
          }}
        >
          <ThumbsDownIcon />
        </button>
      </div>
    </div>
  );
}

// ─── Feedback modal ───────────────────────────────────────────────────────────

const FEEDBACK_OPTIONS = [
  'UI bug',
  'Overactive refusal',
  'Poor image understanding',
  'Did not fully follow my request',
  'Not factually correct',
  'Incomplete response',
  'Should have searched the web',
  'Memory not applied correctly',
  'Report content',
  "Not in keeping with Claude's Constitution",
  'Other',
];

function FeedbackSelect({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openDrop = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`feedback-select-trigger field-input${open ? ' focused' : ''}`}
        onClick={openDrop}
      >
        <span className={value ? 'feedback-select-value' : 'feedback-select-placeholder'}>
          {value || placeholder}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <svg width="10" height="10" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.span>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              className="feedback-dropdown"
              style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width }}
              initial={{ opacity: 0, scaleY: 0.95, y: -4 }}
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              exit={{ opacity: 0, scaleY: 0.95, y: -4 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            >
              {FEEDBACK_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`chat-menu-item${value === opt ? ' selected' : ''}`}
                  onClick={() => { onChange(opt); setOpen(false); }}
                >
                  {opt}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function FeedbackModal({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const [issueType, setIssueType] = useState('');
  const [context, setContext] = useState('');

  function handleSubmit() {
    console.log({ messageId, issueType, context });
    onClose();
  }

  return createPortal(
    <div className="feedback-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="feedback-modal">
        <h2 className="feedback-title">Give negative feedback</h2>
        <p className="feedback-subtitle">What type of issue do you wish to report? (optional)</p>
        <FeedbackSelect
          value={issueType}
          onChange={setIssueType}
          placeholder="Select an issue type"
        />
        <textarea
          className="feedback-textarea field-input"
          placeholder="Add more context (optional)"
          rows={4}
          value={context}
          onChange={e => setContext(e.target.value)}
        />
        <div className="feedback-actions">
          <button className="feedback-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="feedback-btn-submit" onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Artifact card ────────────────────────────────────────────────────────────

const ARTIFACT_ICONS: Record<string, string> = { campaign: '📣', code: '</>', audience: '👥' };
const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  campaign: 'Campaign · Draft', code: 'Code · Snippet', audience: 'Audience · Segment',
};

function ArtifactCard({ artifact, onClick }: { artifact: Artifact; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 0,
      position: 'relative',
      width: '100%',
      maxWidth: 309,
      minWidth: 232,
      height: 64,
      minHeight: 64,
      maxHeight: 64,
      background: 'var(--field-bg)',
      border: '1px solid var(--field-border)',
      borderRadius: 16,
      cursor: 'pointer',
      overflow: 'hidden',
    }}>

      {/* Prefix — left icon column */}
      <div style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
        width: 64,
        height: 64,
        background: 'var(--bubble-ai-bg)',
        borderRight: '1px solid var(--field-border)',
        flexShrink: 0,
      }}>
        {/* Thumbnail */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 7,
          width: 32,
          height: 32,
          background: 'var(--field-bg)',
          border: '1px solid var(--field-border)',
          borderRadius: 4,
        }}>
          <span style={{ fontSize: 13, lineHeight: 1 }}>
            {ARTIFACT_ICONS[artifact.type] || '📄'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
        flex: 1,
        height: 64,
        background: 'var(--field-bg)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: 0,
          flex: 1,
          height: 24,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{
              fontFamily: 'Lato',
              fontStyle: 'normal',
              fontWeight: 700,
              fontSize: 16,
              lineHeight: '24px',
              color: 'var(--textarea-color)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 213,
            }}>
              {artifact.name}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Message item ─────────────────────────────────────────────────────────────

function MessageItem({ message, onTypingComplete, onArtifactClick, messagesEl, onThumbsDown, editingMessageId, editingText, onEditStart, onEditChange, onResend, onEditCancel, isLoading, participants }: {
  message: Message;
  onTypingComplete: ((id: string) => void) | null;
  onArtifactClick: (a: Artifact) => void;
  messagesEl: HTMLDivElement | null;
  onThumbsDown: (id: string) => void;
  editingMessageId: string | null;
  editingText: string;
  onEditStart: (id: string, currentText: string) => void;
  onEditChange: (text: string) => void;
  onResend: (id: string) => void;
  onEditCancel: () => void;
  isLoading: boolean;
  participants: Participant[];
}) {
  // ── System message ──
  if (message.role === 'system') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', margin: '4px 0' }}>
        <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap' }}>
          {message.text}
        </span>
        <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
      </div>
    );
  }

  // ── Participant bubble (left-aligned, colored) ──
  const sender = message.participantId
    ? participants.find(p => p.id === message.participantId) ?? null
    : null;

  if (sender) {
    return (
      <div className="message user" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', paddingLeft: 33 }}>
            {sender.name} · just now
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: sender.color, color: sender.textColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, flexShrink: 0,
            }}>
              {sender.initials}
            </div>
            <div style={{
              background: sender.bubbleColor,
              borderRadius: '10px 10px 10px 3px',
              padding: '9px 13px',
              fontSize: 15, lineHeight: 1.6,
              color: sender.bubbleText,
              maxWidth: '78%',
            }}>
              {message.text}
            </div>
          </div>
        </div>
        <div className="message-label">{message.timestamp}</div>
      </div>
    );
  }

  const bubbleContent = message.isTyping ? (
    <TypewriterBubble
      text={message.text}
      scrollEl={messagesEl}
      onComplete={onTypingComplete ? () => onTypingComplete(message.id) : undefined}
    />
  ) : message.text;

  return (
    <div className={`message ${message.role}`}>
      {message.role === 'assistant' ? (
        <>
          <div className="assistant-bubble-group">
            <div className="bubble">{bubbleContent}</div>
            {!message.isTyping && !message.artifact && (
              <MessageActions text={message.text} onThumbsDown={() => onThumbsDown(message.id)} />
            )}
          </div>
          {message.artifact && (
            <div className="artifact-with-actions">
              <ArtifactCard
                artifact={message.artifact}
                onClick={() => message.artifact && onArtifactClick(message.artifact)}
              />
              {!message.isTyping && (
                <MessageActions text={message.text} onThumbsDown={() => onThumbsDown(message.id)} />
              )}
            </div>
          )}
        </>
      ) : (
        // ── User bubble — always visible, click opens edit field below ──
        <>
          <div
            className="bubble"
            onClick={() => !isLoading && onEditStart(message.id, message.text)}
            style={{
              cursor: isLoading ? 'default' : 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {bubbleContent}
          </div>
          {editingMessageId === message.id && (
            <div style={{
              alignSelf: 'flex-end',
              width: '80%',
              background: 'var(--input-bg)',
              border: '1.5px solid #1677FF',
              borderRadius: '12px 12px 4px 12px',
              overflow: 'hidden',
              boxShadow: '0 0 0 3px var(--input-focus-shadow)',
              marginTop: 4,
            }}>
              <textarea
                autoFocus
                value={editingText}
                onChange={e => onEditChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onResend(message.id); }
                  if (e.key === 'Escape') onEditCancel();
                }}
                style={{
                  width: '100%', border: 'none', outline: 'none',
                  background: 'transparent',
                  fontFamily: 'Lato, sans-serif',
                  fontSize: 15, lineHeight: 1.6,
                  color: 'var(--textarea-color)',
                  padding: '12px 16px 8px',
                  resize: 'none', minHeight: 60,
                }}
              />
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'flex-end', gap: 6,
                padding: '6px 10px 8px',
                borderTop: '0.5px solid var(--input-border)',
              }}>
                <button onClick={onEditCancel}
                  style={{ fontSize: 12, fontWeight: 500, color: 'var(--placeholder-color)', background: 'transparent', border: '0.5px solid var(--input-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => onResend(message.id)}
                  style={{ fontSize: 12, fontWeight: 500, color: '#fff', background: '#1677FF', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                  Resend
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <div className="message-label">{message.timestamp}</div>
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
          <div className="preview-block" style={{ background: '#1677FF', padding: '20px 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d={SPARKLE_PATH} fill="white" opacity="0.9" />
              </svg>
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 15, fontWeight: 700, color: '#ffffff' }}>{senderDisplay}</span>
            </div>
            <button className="add-to-chat-btn" onClick={() => onAddToChat('Header band', senderDisplay)}>Add to chat</button>
          </div>
          {/* Hero image */}
          <img
            src="https://picsum.photos/seed/emailhero/800/280"
            alt="Hero"
            style={{ display: 'block', width: '100%', height: 180, objectFit: 'cover' }}
          />
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
              <a href="#" onClick={e => e.preventDefault()} style={{ display: 'inline-block', background: '#1677FF', color: '#ffffff', fontFamily: "'Lato', sans-serif", fontSize: 14, fontWeight: 700, textDecoration: 'none', padding: '12px 28px', borderRadius: 8 }}>{cta}</a>
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

// ─── Artifact panel: Audience tab ────────────────────────────────────────────

function AudienceTab({ artifact }: { artifact: Artifact }) {
  const d = artifact.data;
  const recName   = d.audienceName   || 'Lapsed Contacts';
  const recSize   = d.audienceSize   || '2,847';
  const recDetail = d.audienceDetail || 'Last active 47+ days ago';

  const segments = [
    { id: 'lapsed',   name: recName,             count: recSize,   detail: recDetail,                    recommended: true },
    { id: 'all',      name: 'All Subscribers',   count: '48,291',  detail: 'Full list including actives',recommended: false },
    { id: 'engaged',  name: 'Highly Engaged',    count: '12,440',  detail: 'Opened in last 30 days',     recommended: false },
    { id: 'new',      name: 'New Subscribers',   count: '3,102',   detail: 'Joined in last 60 days',     recommended: false },
  ];

  const [selectedSegments, setSelectedSegments] = useState<string[]>(['lapsed']);

  const toggleSegment = (id: string) => {
    setSelectedSegments(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const totalReach = segments
    .filter(s => selectedSegments.includes(s.id))
    .reduce((sum, s) => sum + parseInt(s.count.replace(/,/g, ''), 10), 0);
  const formattedReach = totalReach.toLocaleString();

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
    marginBottom: 10,
  };

  return (
    <div>
      {/* ── Athena's recommendation ── */}
      <div style={sectionLabel}>Athena recommends</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: 'rgba(22,119,255,0.08)',
        border: '0.5px solid rgba(22,119,255,0.35)',
        borderRadius: 10,
        marginBottom: 20,
      }}>
        {/* Icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(22,119,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M8 2a3 3 0 1 0 0 6A3 3 0 0 0 8 2zM6.5 5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zM3 13c0-2.21 2.239-4 5-4s5 1.79 5 4H3z" fill="#1677FF"/>
          </svg>
        </div>
        {/* Info */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.88)', margin: '0 0 2px' }}>{recName}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{recSize} contacts · {recDetail}</p>
        </div>
        {/* Athena badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px',
          background: 'rgba(22,119,255,0.12)',
          borderRadius: 6,
          flexShrink: 0,
        }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M7.01126 0.470228C7.19962 0.327342 7.42956 0.25 7.66598 0.25C7.90241 0.25 8.13234 0.327342 8.32071 0.470228C8.50907 0.613112 8.64552 0.813694 8.70923 1.04137L9.76721 5.14615C9.79325 5.24709 9.84586 5.3392 9.91957 5.41291C9.99323 5.48658 10.0853 5.53917 10.1861 5.56523L14.2884 6.6224C14.517 6.68545 14.7186 6.82186 14.8622 7.0105C15.0059 7.19915 15.0837 7.42972 15.0837 7.66683C15.0837 7.90395 15.0059 8.13452 14.8622 8.32317C14.7186 8.51181 14.517 8.64812 14.2884 8.71117L10.1863 9.76839C10.0854 9.79443 9.99328 9.84704 9.91957 9.92075C9.84586 9.99446 9.79325 10.0866 9.76721 10.1875L8.71256 14.2774C8.64485 14.52 8.5084 14.7206 8.32004 14.8634C8.13168 15.0063 7.90175 15.0837 7.66532 15.0837C7.42889 15.0837 7.19896 15.0063 7.0106 14.8634C6.82224 14.7206 6.68578 14.52 6.62207 14.2923L5.56409 10.1875C5.53804 10.0867 5.4854 9.99442 5.41173 9.92075C5.33802 9.84704 5.24591 9.79443 5.14497 9.76839L1.05504 8.71374C0.810748 8.64463 0.61115 8.50805 0.469023 8.31996C0.326897 8.13188 0.25 7.90257 0.25 7.66683C0.25 7.43109 0.326897 7.20178 0.469023 7.0137C0.61115 6.82562 0.810748 6.68903 1.03753 6.62467L5.14493 5.56462C5.24584 5.5386 5.33807 5.486 5.41177 5.41234C5.48541 5.33876 5.53801 5.24682 5.56412 5.14605L6.61874 1.05623C6.68645 0.813698 6.8229 0.613115 7.01126 0.470228Z" fill="#1677FF"/>
          </svg>
          <span style={{ fontSize: 10, color: '#1677FF', fontWeight: 600 }}>Athena pick</span>
        </div>
      </div>

      {/* ── All segments ── */}
      <div style={sectionLabel}>All segments</div>
      <div style={{ marginBottom: 20 }}>
        {segments.map((s, i) => (
          <div
            key={s.id}
            onClick={() => toggleSegment(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0',
              borderBottom: i < segments.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
              cursor: 'pointer',
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: selectedSegments.includes(s.id) ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
              background: selectedSegments.includes(s.id) ? '#1677FF' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, border 0.15s',
            }}>
              {selectedSegments.includes(s.id) && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            {/* Labels */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.85)', margin: '0 0 1px' }}>{s.name}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{s.count} contacts · {s.detail}</p>
            </div>
            {s.recommended && (
              <span style={{ fontSize: 10, color: '#1677FF', fontWeight: 600 }}>Recommended</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Estimated reach ── */}
      <div style={sectionLabel}>Estimated reach</div>
      <div style={{
        display: 'flex',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {[
          { label: 'Estimated reach', value: formattedReach },
          { label: 'Suppressed',      value: '0' },
          { label: 'Net send size',   value: formattedReach },
        ].map((stat, i) => (
          <div key={stat.label} style={{
            flex: 1,
            padding: '12px 14px',
            borderLeft: i > 0 ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
          }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>
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
    ? [{ key: 'preview', label: 'Preview' }, { key: 'about', label: 'About' }, { key: 'audience', label: 'Audience' }, { key: 'launch', label: 'Launch' }]
    : [{ key: 'preview', label: 'Preview' }];

  const title = artifact && artifact.type === 'campaign' ? 'About Campaign' : (artifact && artifact.name) || '';

  function renderBody() {
    if (!artifact) return null;
    if (activeTab === 'about') return <AboutTab artifact={artifact} />;
    if (activeTab === 'audience') return <AudienceTab artifact={artifact} />;
    if (activeTab === 'launch') return <p style={{ fontSize: 14, color: 'var(--meta-key)', padding: '8px 0' }}>Launch — coming soon.</p>;
    if (artifact.type === 'code') return <div className="code-viewer">{artifact.data.code || ''}</div>;
    return <EmailPreview artifact={artifact} onAddToChat={onAddToChat} />;
  }

  return (
    <motion.div
      className="artifact-panel"
      initial={{ maxWidth: 0, opacity: 0 }}
      animate={{ maxWidth: isOpen ? 1400 : 0, opacity: isOpen ? 1 : 0 }}
      transition={{
        maxWidth: { duration: 0.9, ease: [0.25, 1, 0.3, 1] },
        opacity:  { duration: 0.7, ease: [0.25, 1, 0.3, 1] },
      }}
      style={{
        pointerEvents: isOpen ? 'all' : 'none',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
      }}
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

// ─── Guidance Cards ───────────────────────────────────────────────────────────
// Renders two side-by-side cards below the caption on the pre-submission canvas.
// Card 1 — Goal: cycles through account-level priorities, lets the user fire a prompt.
// Card 2 — Automation: proposes an Athena automation; toggles an enabled state.
// Receives a key tied to threadId so internal state resets on every new thread.

const GuidanceCards = ({ onSendMessage }: { onSendMessage: (text: string) => void }) => {
  const [goalCur, setGoalCur] = useState(0);
  const [autoCur, setAutoCur] = useState(0);
  const [autoEnabled, setAutoEnabled] = useState(false);

  return (
    <div style={{
      width: '100%',
      maxWidth: 840,
      display: 'flex',
      gap: 10,
      marginTop: 14,
    }}>

      {/* ── Card 1: Goal ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: 'rgba(22,119,255,0.14)',
        border: '1px solid rgba(22,119,255,0.40)',
        borderRadius: 12,
        padding: '13px 13px 11px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: 'rgba(255,255,255,0.88)', margin: 0 }}>
          {GOAL_ITEMS[goalCur].heading}
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: 'rgba(255,255,255,0.42)', margin: 0, flex: 1 }}>
          {GOAL_ITEMS[goalCur].sub}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <button
            onClick={() => onSendMessage(GOAL_ITEMS[goalCur].prompt)}
            style={{
              fontSize: 12, fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 6, border: 'none',
              background: 'rgba(22,119,255,0.15)',
              color: '#5AA9FF',
              cursor: 'pointer',
              fontFamily: "'Lato', sans-serif",
            }}
          >
            {GOAL_ITEMS[goalCur].cta}
          </button>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {GOAL_ITEMS.map((_, i) => (
              <div
                key={i}
                onClick={() => setGoalCur(i)}
                style={{
                  height: 4,
                  width: i === goalCur ? 10 : 4,
                  borderRadius: 3,
                  background: i === goalCur ? 'rgba(90,169,255,0.7)' : 'rgba(90,169,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Card 2: Automation ───────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: 'rgba(22,119,255,0.14)',
        border: '1px solid rgba(22,119,255,0.40)',
        borderRadius: 12,
        padding: '13px 13px 11px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
      }}>
        {/* Enabled badge */}
        {autoEnabled && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 600, color: '#34D399',
            background: 'rgba(18,183,106,0.12)',
            padding: '3px 8px', borderRadius: 5,
            alignSelf: 'flex-start',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399' }} />
            Athena is handling this
          </div>
        )}
        <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: 'rgba(255,255,255,0.88)', margin: 0 }}>
          {AUTO_ITEMS[autoCur].heading}
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: 'rgba(255,255,255,0.4)', margin: 0, flex: 1 }}>
          {AUTO_ITEMS[autoCur].sub}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {autoEnabled ? (
            <>
              <button
                onClick={() => setAutoEnabled(false)}
                style={{
                  fontSize: 12, fontWeight: 600,
                  padding: '5px 10px', borderRadius: 6, border: 'none',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', flex: 1,
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                Turn off
              </button>
              <button
                onClick={() => { setAutoEnabled(false); setAutoCur((autoCur + 1) % AUTO_ITEMS.length); }}
                style={{
                  fontSize: 12, fontWeight: 600,
                  padding: '5px 10px', borderRadius: 6, border: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                Next
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setAutoEnabled(true);
                  onSendMessage(AUTO_ITEMS[autoCur].prompt);
                }}
                style={{
                  fontSize: 12, fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 6, border: 'none',
                  background: 'rgba(18,183,106,0.15)',
                  color: '#34D399',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                Let Athena handle it
              </button>
              <button
                onClick={() => setAutoCur((autoCur + 1) % AUTO_ITEMS.length)}
                style={{
                  fontSize: 12, fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 6, border: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                Not now
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  );
};

// ─── Agent Menu ───────────────────────────────────────────────────────────────

// Athena-specific avatar — used in the agent list instead of an emoji.
function AthenaAgentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.92535 0.443122C5.09053 0.317823 5.29216 0.25 5.49949 0.25C5.70681 0.25 5.90844 0.317824 6.07362 0.443122C6.2388 0.568419 6.35845 0.744312 6.41433 0.94397L6.41835 0.958935L7.05069 3.41269C7.05292 3.42133 7.05743 3.42923 7.06374 3.43554C7.07006 3.44186 7.07795 3.44637 7.0866 3.4486L9.55264 4.0841C9.75309 4.13939 9.92983 4.25903 10.0558 4.42445C10.1818 4.58988 10.25 4.79207 10.25 5C10.25 5.20793 10.1818 5.41012 10.0558 5.57555C9.92983 5.74098 9.75306 5.86051 9.55261 5.91579L9.54037 5.91917L7.0866 6.5514C7.07795 6.55363 7.07006 6.55814 7.06374 6.56446C7.05743 6.57077 7.05292 6.57866 7.05069 6.58731L6.41792 9.04118L6.41393 9.05603C6.35806 9.25569 6.2384 9.43158 6.07322 9.55688C5.90805 9.68217 5.70642 9.75 5.49909 9.75C5.29175 9.75 5.09012 9.68217 4.92495 9.55688C4.75977 9.43158 4.64012 9.25569 4.58424 9.05603L4.58022 9.04107L3.94788 6.58731C3.94564 6.5787 3.94112 6.57075 3.93483 6.56446C3.92853 6.55816 3.92067 6.55366 3.91205 6.55142M3.91205 6.55142L1.45811 5.91864L1.4406 5.9139C1.24173 5.85745 1.0667 5.73767 0.942065 5.57274C0.817432 5.40781 0.75 5.20673 0.75 5C0.75 4.79327 0.817432 4.59219 0.942065 4.42726C1.0667 4.26233 1.24173 4.14255 1.4406 4.0861L1.458 4.08139L3.91194 3.44821C3.92058 3.44598 3.92861 3.44144 3.93493 3.43513C3.94121 3.42885 3.9457 3.42101 3.94795 3.41242L4.58065 0.958824L4.58464 0.94397C4.64051 0.744319 4.76017 0.568423 4.92535 0.443122M5.49932 3.40351L5.59819 3.7872C5.66738 4.0554 5.80722 4.30035 6.00308 4.4962C6.19894 4.69206 6.4437 4.83185 6.7119 4.90104L7.09589 5L6.71209 5.09891C6.44389 5.1681 6.19894 5.30794 6.00308 5.5038C5.80722 5.69965 5.66743 5.94441 5.59824 6.21262L5.49925 6.59649L5.40038 6.2128C5.33119 5.9446 5.19135 5.69965 4.99549 5.5038C4.79963 5.30794 4.55487 5.16815 4.28667 5.09896L3.90227 4.99983L4.28657 4.90067C4.55462 4.83153 4.79941 4.69183 4.99522 4.49616C5.19107 4.30044 5.33092 4.05584 5.40023 3.78778L5.49932 3.40351ZM8.27452 1.66398C8.27603 1.24977 8.61304 0.915208 9.02725 0.916716C10.5912 0.922414 12.1142 1.41829 13.2566 2.33088C14.4029 3.24656 15.0906 4.52773 15.0833 5.90966V10.3372C15.0833 10.3642 15.0818 10.3911 15.0789 10.418C15.0072 11.0799 14.6405 11.6567 14.1128 12.062C13.5877 12.4654 12.9216 12.6885 12.2415 12.7185C12.2098 12.7199 12.178 12.7192 12.1463 12.7166L11.0931 12.6288V15C11.0931 15.4142 10.7573 15.75 10.3431 15.75C9.9289 15.75 9.59312 15.4142 9.59312 15V11.8138C9.59312 11.604 9.68094 11.4039 9.83528 11.2618C9.98962 11.1198 10.1964 11.0489 10.4054 11.0663L12.2197 11.2175C12.6078 11.1923 12.9528 11.0616 13.1991 10.8724C13.4382 10.6888 13.5534 10.4772 13.5833 10.2891V5.90317C13.5883 5.04679 13.1647 4.17729 12.3204 3.50285C11.4717 2.82483 10.2868 2.42131 9.02178 2.41671C8.60757 2.4152 8.27301 2.07819 8.27452 1.66398ZM4.88764 10.8282C5.28517 10.9445 5.51312 11.3611 5.39678 11.7586L4.38647 15.2107C4.27012 15.6082 3.85354 15.8362 3.456 15.7198C3.05846 15.6035 2.83051 15.1869 2.94686 14.7893L3.95717 11.3373C4.07351 10.9398 4.4901 10.7118 4.88764 10.8282Z"
        fill="white"
        fillOpacity="0.65"
      />
    </svg>
  );
}

interface AgentMenuProps {
  isOpen: boolean;
  query: string;
  activeAgentId: string;
  onSelect: (agent: Agent) => void;
  onQueryChange: (q: string) => void;
}

function AgentMenu({ isOpen, query, activeAgentId, onSelect, onQueryChange }: AgentMenuProps) {
  const filtered = SAMPLE_AGENTS.filter(a =>
    a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.description.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      data-agent-menu="true"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 8,
        background: 'rgba(18,18,20,0.97)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.48)',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      {/* Search row */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <input
          autoFocus
          placeholder="Search agents…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            color: 'rgba(255,255,255,0.88)',
            fontFamily: "'Lato', sans-serif",
          }}
        />
      </div>

      {/* Agent list */}
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '12px 14px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            No agents found
          </div>
        ) : (
          filtered.map(agent => (
            <button
              key={agent.id}
              data-agent-menu="true"
              onClick={() => onSelect(agent)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                background: activeAgentId === agent.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Agent icon — Athena gets gradient sparkle, others get agent icon */}
              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
                <AgentRowIcon isAthena={agent.id === 'athena'} />
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name + Active badge */}
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.88)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: "'Lato', sans-serif",
                }}>
                  {agent.name}
                  {activeAgentId === agent.id && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: '#0FAEFF',
                      color: '#fff',
                      borderRadius: 4,
                      padding: '1px 5px',
                      letterSpacing: '0.03em',
                    }}>
                      Active
                    </span>
                  )}
                </div>
                {/* Description */}
                <div style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.38)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Lato', sans-serif",
                }}>
                  {agent.description}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
// Generic hover tooltip. Delay prevents flicker on quick mouse passes.
// wrapperStyle lets callers promote position/z-index to the wrapper div
// (needed when the trigger button itself used position:absolute).

function Tooltip({
  label,
  children,
  wrapperStyle,
}: {
  label: string;
  children: React.ReactNode;
  wrapperStyle?: React.CSSProperties;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => { timerRef.current = setTimeout(() => setVisible(true), 450); };
  const hide = () => { if (timerRef.current) clearTimeout(timerRef.current); setVisible(false); };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', ...wrapperStyle }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.span
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 7px)',
              right: 0,
              background: 'rgba(18,18,18,0.92)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "'Lato', sans-serif",
              letterSpacing: '0.01em',
              padding: '4px 9px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 200,
              border: '0.5px solid rgba(255,255,255,0.1)',
            }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Chat header ──────────────────────────────────────────────────────────────

function ChatHeader({ isSubmitted, title, onCompose, isFloating, isDark, onToggleTheme, onToggleDisplay, facePile }: {
  isSubmitted: boolean;
  title: string;
  onCompose: () => void;
  isFloating?: boolean;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onToggleDisplay?: () => void;
  facePile?: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setMenuOpen(o => !o);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <motion.div
      layout="position"
      className="chat-header"
      initial={{ clipPath: 'inset(0 0 100% 0)' }}
      animate={{ clipPath: isSubmitted ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{
        pointerEvents: isSubmitted ? 'all' : 'none',
        cursor: isFloating ? 'grab' : 'default',
      }}
    >
      <div className="chat-header-left">
        <SparkleHeaderIcon />
        <span className="chat-header-title">{title}</span>
        {facePile && <div style={{ marginLeft: 8 }}>{facePile}</div>}
      </div>
      <div className="chat-header-right">
        <button className="chat-header-btn" onClick={onCompose} title="New thread">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M11.1828 1.99444L5.92529 7.25259C5.86477 7.313 5.81997 7.38808 5.79583 7.4701L5.49285 8.50636L6.52948 8.20328C6.6117 8.17927 6.68677 8.13489 6.74736 8.07436L12.0047 2.81639C12.1137 2.7074 12.175 2.55955 12.175 2.40541C12.175 2.25127 12.1138 2.10344 12.0048 1.99444C11.8958 1.88545 11.7479 1.82422 11.5938 1.82422C11.4397 1.82422 11.2918 1.88547 11.1828 1.99444ZM10.2548 1.06637C10.6099 0.711232 11.0916 0.511719 11.5938 0.511719C12.096 0.511719 12.5777 0.711232 12.9328 1.06637C13.288 1.4215 13.4875 1.90317 13.4875 2.40541C13.4875 2.90763 13.288 3.38929 12.9329 3.74442L7.67529 9.00259C7.45891 9.21877 7.19139 9.37727 6.8978 9.46304L5.22188 9.95304C5.05875 10.0006 4.88541 10.0036 4.7208 9.96142C4.55619 9.91924 4.40594 9.8336 4.28578 9.71343C4.16562 9.59327 4.07997 9.44302 4.0378 9.27841C3.99562 9.1138 3.99847 8.94088 4.04605 8.77774L4.53618 7.10141C4.62228 6.80816 4.78094 6.54055 4.99716 6.32456L10.2548 1.06637ZM1.62767 1.62684C1.96953 1.28497 2.4332 1.09292 2.91667 1.09292H7C7.36244 1.09292 7.65625 1.38673 7.65625 1.74917C7.65625 2.1116 7.36244 2.40542 7 2.40542H2.91667C2.7813 2.40542 2.65147 2.45919 2.55575 2.55491C2.46003 2.65064 2.40625 2.78046 2.40625 2.91583V11.0825C2.40625 11.2179 2.46003 11.3477 2.55575 11.4434C2.65147 11.5391 2.7813 11.5929 2.91667 11.5929H11.0833C11.2187 11.5929 11.3485 11.5391 11.4443 11.4434C11.54 11.3477 11.5938 11.2179 11.5938 11.0825V6.99917C11.5938 6.63673 11.8876 6.34292 12.25 6.34292C12.6124 6.34292 12.9062 6.63673 12.9062 6.99917V11.0825C12.9062 11.566 12.7142 12.0296 12.3723 12.3715C12.0305 12.7134 11.5668 12.9054 11.0833 12.9054H2.91667C2.4332 12.9054 1.96953 12.7134 1.62767 12.3715C1.28581 12.0296 1.09375 11.566 1.09375 11.0825V2.91583C1.09375 2.43237 1.28581 1.9687 1.62767 1.62684Z" fill="currentColor"/>
          </svg>
        </button>
        <div className="chat-header-menu-wrap">
          <button
            ref={btnRef}
            className={`chat-header-btn${menuOpen ? ' active' : ''}`}
            title="More options"
            onClick={openMenu}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M2.91683 7.07227C2.9571 7.07227 2.98975 7.03962 2.98975 6.99935C2.98975 6.95908 2.9571 6.92643 2.91683 6.92643C2.87656 6.92643 2.84391 6.95908 2.84391 6.99935C2.84391 7.03962 2.87656 7.07227 2.91683 7.07227ZM1.67725 6.99935C1.67725 6.31475 2.23223 5.75977 2.91683 5.75977C3.60143 5.75977 4.15641 6.31475 4.15641 6.99935C4.15641 7.68395 3.60143 8.23893 2.91683 8.23893C2.23223 8.23893 1.67725 7.68395 1.67725 6.99935ZM7.00016 7.07227C7.04043 7.07227 7.07308 7.03962 7.07308 6.99935C7.07308 6.95908 7.04043 6.92643 7.00016 6.92643C6.95989 6.92643 6.92725 6.95908 6.92725 6.99935C6.92725 7.03962 6.95989 7.07227 7.00016 7.07227ZM5.76058 6.99935C5.76058 6.31475 6.31556 5.75977 7.00016 5.75977C7.68477 5.75977 8.23975 6.31475 8.23975 6.99935C8.23975 7.68395 7.68477 8.23893 7.00016 8.23893C6.31556 8.23893 5.76058 7.68395 5.76058 6.99935ZM11.0835 7.07227C11.1238 7.07227 11.1564 7.03962 11.1564 6.99935C11.1564 6.95908 11.1238 6.92643 11.0835 6.92643C11.0432 6.92643 11.0106 6.95908 11.0106 6.99935C11.0106 7.03962 11.0432 7.07227 11.0835 7.07227ZM9.84391 6.99935C9.84391 6.31475 10.3989 5.75977 11.0835 5.75977C11.7681 5.75977 12.3231 6.31475 12.3231 6.99935C12.3231 7.68395 11.7681 8.23893 11.0835 8.23893C10.3989 8.23893 9.84391 7.68395 9.84391 6.99935Z" fill="currentColor"/>
            </svg>
          </button>
          {createPortal(
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  ref={menuRef}
                  className="chat-header-menu"
                  style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  <button className="chat-menu-item" onClick={() => setMenuOpen(false)}>
                    Rename
                  </button>
                  <button className="chat-menu-item" onClick={() => { setDisplayOptionsOpen(true); setMenuOpen(false); }}>
                    Display options
                  </button>
                  <button className="chat-menu-item" onClick={() => setMenuOpen(false)}>
                    Thread History
                  </button>
                  <button className="chat-menu-item" onClick={() => setMenuOpen(false)}>
                    Artifacts
                  </button>
                  <button className="chat-menu-item" onClick={() => setMenuOpen(false)}>
                    Context Center
                  </button>
                  <div className="chat-menu-divider" />
                  <button className="chat-menu-item" onClick={() => { onToggleTheme?.(); setMenuOpen(false); }}>
                    {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>
        <AnimatePresence>
          {onToggleDisplay && !isSubmitted && (
            <motion.div
              key="display-toggle"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 1, 1] }}
              style={{ marginLeft: 4 }}
            >
              <Tooltip
                label={isFloating ? 'Dock to page' : 'Float window'}
              >
                <button
                  className="chat-header-btn"
                  onClick={onToggleDisplay}
                  style={{ color: 'var(--toolbar-hover-icon)', border: '0.5px solid var(--window-border)' }}
                >
                  {isFloating ? <IconChatFullscreen /> : <IconChatFloating />}
                </button>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── MentionMenu ─────────────────────────────────────────────────────────────

const MentionMenu = ({
  search,
  onSearch,
  participants,
  onSelect,
}: {
  search: string;
  onSearch: (val: string) => void;
  participants: Participant[];
  onSelect: (p: Participant) => void;
}) => {
  const alreadyIds = participants.map(p => p.id);
  const filtered = TEAM_MEMBERS
    .filter(m => !alreadyIds.includes(m.id))
    .filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div
      data-mention-menu
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 6px)',
        left: 0, right: 0,
        background: '#1a1a1a',
        border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 30,
      }}
    >
      {/* Search input */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="5" cy="5" r="3.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.1"/>
          <path d="M8 8L10.5 10.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
        <input
          autoFocus
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search teammates…"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'Lato, sans-serif', fontSize: 12,
            color: 'rgba(255,255,255,0.7)', flex: 1,
          }}
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          No teammates found
        </div>
      ) : (
        filtered.map(m => (
          <div
            key={m.id}
            onClick={() => onSelect(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', cursor: 'pointer',
              borderBottom: '0.5px solid rgba(255,255,255,0.05)',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: m.color, color: m.textColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {m.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{m.name}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{m.role}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ─── FacePile ─────────────────────────────────────────────────────────────────

const FacePile = ({
  participants,
  onRemove,
}: {
  participants: Participant[];
  onRemove: (id: string) => void;
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {participants.map((p, i) => (
        <div
          key={p.id}
          style={{ position: 'relative', marginLeft: i > 0 ? -8 : 0, zIndex: hoveredId === p.id ? 20 : participants.length - i }}
          title={p.isHost ? `${p.name} · Host` : `Remove ${p.name}`}
          onMouseEnter={() => setHoveredId(p.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div
            onClick={!p.isHost ? () => onRemove(p.id) : undefined}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: p.color, color: p.textColor,
              border: '2px solid var(--window-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              cursor: p.isHost ? 'default' : 'pointer',
              transform: hoveredId === p.id ? 'scale(1.12)' : 'scale(1)',
              transition: 'transform 0.15s',
              position: 'relative',
            }}
          >
            {p.initials}
          </div>

          {/* Red × — only visible on hover, only for non-host */}
          {!p.isHost && (
            <div style={{
              position: 'absolute', top: -3, right: -3,
              width: 14, height: 14, borderRadius: '50%',
              background: '#E24B4A',
              border: '1.5px solid var(--window-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: '#fff', fontWeight: 700,
              pointerEvents: 'none',
              opacity: hoveredId === p.id ? 1 : 0,
              transform: hoveredId === p.id ? 'scale(1)' : 'scale(0.6)',
              transition: 'opacity 0.15s, transform 0.15s',
            }}>
              ✕
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── StickyBanner + AthenaIntelligenceOverlay ────────────────────────────────
// Moved to StickyBanner.tsx — currently hidden from the UI.
// ─── API ──────────────────────────────────────────────────────────────────────

async function callAthena(messages: HistoryItem[], systemPrompt = DEFAULT_SYSTEM_PROMPT): Promise<string> {
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
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return (data.content && data.content[0] && data.content[0].text) || 'Sorry, I could not get a response.';
}

// ─── OverflowToast ────────────────────────────────────────────────────────────

function OverflowToast({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  // Auto-dismiss after 3 s
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="overflow-toast"
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 14px',
            background: 'var(--window-bg)',
            border: '0.5px solid var(--input-border)',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: '#E24B4A' }}>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 4v4M7 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 13, color: 'var(--textarea-color)', lineHeight: '18px' }}>
            Queue is full ({MAX_QUEUE}/{MAX_QUEUE}). Wait for Athena to respond.
          </span>
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--placeholder-color)', display: 'flex', alignItems: 'center', padding: 2,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── QueueBanner ──────────────────────────────────────────────────────────────

function QueueBanner({
  queue,
  onRemove,
  onEdit,
}: {
  queue: QueuedPrompt[];
  onRemove: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  if (queue.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="queue-banner"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '8px 0',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 4px',
          marginBottom: 2,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--placeholder-color)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Queued ({queue.length}/{MAX_QUEUE})
          </span>
          <div style={{ flex: 1, height: '0.5px', background: 'var(--input-border)' }} />
        </div>

        {queue.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              background: 'var(--bubble-ai-bg)',
              border: '0.5px solid var(--input-border)',
              borderRadius: 8,
            }}
          >
            {/* Position number */}
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--placeholder-color)', minWidth: 14, flexShrink: 0 }}>
              {idx + 1}
            </span>

            {/* Text or edit field */}
            {editingId === item.id ? (
              <input
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onEdit(item.id, editText); setEditingId(null); }
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => { onEdit(item.id, editText); setEditingId(null); }}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13, color: 'var(--textarea-color)', fontFamily: "'Lato', sans-serif",
                  lineHeight: '18px',
                }}
              />
            ) : (
              <span style={{
                flex: 1, fontSize: 13, color: 'var(--textarea-color)',
                lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.text}
              </span>
            )}

            {/* Edit button */}
            <button
              onClick={() => { setEditingId(item.id); setEditText(item.text); }}
              title="Edit"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--placeholder-color)', display: 'flex', alignItems: 'center',
                padding: 3, borderRadius: 4, flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Remove button */}
            <button
              onClick={() => onRemove(item.id)}
              title="Remove"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--placeholder-color)', display: 'flex', alignItems: 'center',
                padding: 3, borderRadius: 4, flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AthenaChatExperienceProps {
  isFloating?: boolean;
  onFloatingChange?: (v: boolean) => void;
}

export default function AthenaChatExperience({ isFloating: isFloatingProp, onFloatingChange }: AthenaChatExperienceProps = {}) {
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [headerTitle, setHeaderTitle] = useState('Athena');
  const [headerTypewriterSrc, setHeaderTypewriterSrc] = useState<string | null>(null);
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ArtifactTab>('preview');
  const [chatWidth, setChatWidth] = useState(CHAT_MIN_WIDTH);
  const [attachmentChips, setAttachmentChips] = useState<AttachmentChip[]>([]);
  const [footerMode, setFooterMode] = useState<FooterMode>('normal');
  const [contextConfig, setContextConfig] = useState<ContextConfig | null>(null);
  const [scrollDist, setScrollDist] = useState(0);
  const [messagesBottom, setMessagesBottom] = useState(280);
  const [scrollAnchorBottom, setScrollAnchorBottom] = useState(16);
  const [isFloatingInternal, setIsFloatingInternal] = useState(false);
  const isFloating = isFloatingProp !== undefined ? isFloatingProp : isFloatingInternal;
  const setIsFloating = useCallback((v: boolean) => {
    if (onFloatingChange !== undefined) onFloatingChange(v);
    else setIsFloatingInternal(v);
  }, [onFloatingChange]);
  const [nudgesVisible, setNudgesVisible] = useState(true);
  const [inputWrapperWidth, setInputWrapperWidth] = useState(0);
  const [activeAgentId, setActiveAgentId] = useState('athena');
  const [activeSystemPrompt, setActiveSystemPrompt] = useState<string | null>(null);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [agentQuery, setAgentQuery] = useState('');
  const [showBackToAthena, setShowBackToAthena] = useState(false);
  // threadId — bumped on every handleCompose so GuidanceCards resets its internal state
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  // centerOffset — negative px value that lifts input-wrapper to vertical center
  const [centerOffset, setCenterOffset] = useState(0);
  // inline edit state for user bubbles
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  // intelligence overlay
  // group chat participants
  const [participants, setParticipants] = useState<Participant[]>([HOST_PARTICIPANT]);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  // prompt queue
  const [promptQueue, setPromptQueue] = useState<QueuedPrompt[]>([]);
  const [queueBannerOpen, setQueueBannerOpen] = useState(false);
  const [overflowToastVisible, setOverflowToastVisible] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const footerSlotRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const voiceContainerRef = useRef<HTMLDivElement>(null);
  const chatWidthRef = useRef(CHAT_MIN_WIDTH);

  // Theme: sync html class
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    html.classList.add(isDark ? 'dark' : 'light');
  }, [isDark]);

  // ⌘\ / Ctrl\ toggle — only when uncontrolled (no onFloatingChange prop)
  useEffect(() => {
    if (onFloatingChange !== undefined) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsFloatingInternal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFloatingChange]);

  // Close agent menu on outside click
  useEffect(() => {
    if (!agentMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-agent-menu]')) {
        setAgentMenuOpen(false);
        setAgentQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [agentMenuOpen]);

  // Close mention menu on outside click
  useEffect(() => {
    if (!mentionMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-mention-menu]')) {
        setMentionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mentionMenuOpen]);

  // Typewriter for header title
  const typedHeaderTitle = useTypewriter(headerTypewriterSrc, 38);
  useEffect(() => {
    if (headerTypewriterSrc && typedHeaderTitle) setHeaderTitle(typedHeaderTitle);
  }, [typedHeaderTitle, headerTypewriterSrc]);

  // Voice caption cycling
  const captionLine = useVoiceCaption(isVoiceMode);

  // Waveform animation
  useWaveform(isVoiceMode, waveCanvasRef, voiceContainerRef);

  // Measure the full input-wrapper height for messages bottom clearance.
  // Using inputWrapperRef directly ensures ProcessingBar and StickyBanner
  // are included — slotH + capH alone misses those variable-height elements.
  const updateLayout = useCallback(() => {
    const iwH = inputWrapperRef.current ? inputWrapperRef.current.offsetHeight : 0;
    // 8px breathing room so the last message isn't flush against the wrapper
    setMessagesBottom(iwH + 4);
    setScrollAnchorBottom(iwH + 4);
  }, []);

  useLayoutEffect(() => { updateLayout(); });

  useEffect(() => {
    const ro = new ResizeObserver(updateLayout);
    // Observe the full input-wrapper so messagesBottom updates whenever
    // ProcessingBar, StickyBanner, or the footer slot changes height
    if (inputWrapperRef.current) ro.observe(inputWrapperRef.current);
    return () => ro.disconnect();
  }, [updateLayout]);

  // Measure input wrapper width for NudgeCarousel responsive layout
  useEffect(() => {
    if (!inputWrapperRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setInputWrapperWidth(entry.contentRect.width);
    });
    ro.observe(inputWrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute centerOffset — keeps input-wrapper vertically centered before submit
  useLayoutEffect(() => {
    const compute = () => {
      const cw = chatWindowRef.current;
      const iw = inputWrapperRef.current;
      if (!cw || !iw) return;
      setCenterOffset(-(cw.offsetHeight / 2 - iw.offsetHeight / 2));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (chatWindowRef.current) ro.observe(chatWindowRef.current);
    if (inputWrapperRef.current) ro.observe(inputWrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Scroll to bottom when new message appended or typing completes (artifact card appears)
  useEffect(() => {
    const el = messagesAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
    const ARTIFACT_MARKER = 'ARTIFACT:';
    const artifactIndex = raw.indexOf(ARTIFACT_MARKER);
    if (artifactIndex === -1) return { artifact: null, cleanText: raw };

    const afterMarker = raw.slice(artifactIndex + ARTIFACT_MARKER.length);
    const openIdx = afterMarker.indexOf('{');
    if (openIdx === -1) return { artifact: null, cleanText: raw };

    // Bracket-match to find the exact end of the JSON object
    let depth = 0, inStr = false, escape = false, closeIdx = -1;
    for (let i = openIdx; i < afterMarker.length; i++) {
      const ch = afterMarker[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inStr) { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { closeIdx = i; break; } }
    }
    if (closeIdx === -1) return { artifact: null, cleanText: raw };

    try {
      const parsed = JSON.parse(afterMarker.slice(openIdx, closeIdx + 1));
      const before = raw.slice(0, artifactIndex).trim();
      const after = afterMarker.slice(closeIdx + 1).trim();
      const cleanText = [before, after].filter(Boolean).join('\n\n');
      return {
        artifact: { type: parsed.type, name: parsed.name, data: parsed },
        cleanText,
      };
    } catch {
      return { artifact: null, cleanText: raw };
    }
  }

  // ── Fetch Athena reply (shared by submit, resend, and context answer) ──

  async function fetchAthenaReply(histToUse: HistoryItem[], systemPromptOverride?: string) {
    setIsLoading(true);
    try {
      const reply = await callAthena(histToUse, systemPromptOverride || activeSystemPrompt || DEFAULT_SYSTEM_PROMPT);
      const cleanedReply = reply
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const CONTEXT_MARKER = 'CONTEXT_PROMPT:';
      const ctxIndex = cleanedReply.indexOf(CONTEXT_MARKER);
      if (ctxIndex !== -1) {
        try {
          const ctx = JSON.parse(cleanedReply.slice(ctxIndex + CONTEXT_MARKER.length).trim()) as ContextConfig;
          const cleanReply = cleanedReply.slice(0, ctxIndex).trim();
          if (cleanReply) addAssistantMessage(cleanReply, null, histToUse);
          else setHistory([...histToUse, { role: 'assistant', content: 'I need a bit more context.' }]);
          setContextConfig(ctx);
          setFooterMode('context');
        } catch { /* ignore parse failure */ }
      } else {
        const { artifact, cleanText } = parseArtifact(cleanedReply);
        addAssistantMessage(cleanText, artifact, histToUse);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        text: 'Something went wrong. Please try again.', timestamp: getTimestamp(),
      }]);
    }
    setIsLoading(false);
    if (textareaRef.current) textareaRef.current.focus();

    // Drain one item from the queue (if any)
    setPromptQueue(prev => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setTimeout(() => handleSubmit(next.text), 300);
      return rest;
    });
  }

  // ── Prompt queue helpers ──

  function showOverflowToast() {
    setOverflowToastVisible(true);
  }

  function handleQueueRemove(id: string) {
    setPromptQueue(prev => prev.filter(q => q.id !== id));
  }

  function handleQueueEdit(id: string, newText: string) {
    if (!newText.trim()) { handleQueueRemove(id); return; }
    setPromptQueue(prev => prev.map(q => q.id === id ? { ...q, text: newText.trim() } : q));
  }

  // ── Submit ──

  async function handleSubmit(overrideText?: string) {
    const text = (overrideText ?? inputText).trim();
    if (!text) return;

    // If Athena is busy, route to queue
    if (isLoading) {
      if (promptQueue.length < MAX_QUEUE) {
        setPromptQueue(prev => [...prev, { id: `q-${Date.now()}`, text }]);
        setQueueBannerOpen(true);
        setInputText('');
      } else {
        showOverflowToast();
      }
      return;
    }

    const chips = attachmentChips;
    const wasSubmitted = isSubmitted;

    setInputText('');
    setAttachmentChips([]);
    if (!isSubmitted) setIsSubmitted(true);

    // Bubble shows only what the user typed
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text, timestamp: getTimestamp() };
    setMessages(prev => [...prev, userMsg]);

    // LLM receives typed text + chip content appended
    const chipSuffix = chips.length
      ? '\n\n' + chips.map(c => `[Attached — ${c.label}]:\n${c.content}`).join('\n\n')
      : '';
    const llmContent = text + chipSuffix;

    const newHistory: HistoryItem[] = [...history, { role: 'user', content: llmContent }];
    setHistory(newHistory);

    // Typewriter header title on first message
    if (history.filter(m => m.role === 'user').length === 0) {
      setHeaderTypewriterSrc(text.length > 55 ? text.slice(0, 55) + '…' : text);
    }

    // On the first send of a group thread, prepend participant context to the system prompt
    let effectiveSysPrompt: string | undefined;
    if (!wasSubmitted && participants.length > 1) {
      const groupContext = `This is a group thread. Participants: ${participants.map(p => `${p.name} (${p.role})`).join(', ')}. Roman is the host. Acknowledge all participants naturally in your first response if they haven't been greeted yet.`;
      effectiveSysPrompt = `${groupContext}\n\n${activeSystemPrompt || DEFAULT_SYSTEM_PROMPT}`;
    }

    await fetchAthenaReply(newHistory, effectiveSysPrompt);
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

    await fetchAthenaReply(newHistory);
  }

  // ── Resend (edit user bubble and re-prompt) ──

  async function handleResend(messageId: string) {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    const newText = editingText.trim();
    if (!newText) return;

    // Keep messages up to and including the edited one, with updated text
    const updatedMessages: Message[] = messages
      .slice(0, msgIndex + 1)
      .map(m => m.id === messageId ? { ...m, text: newText } : m);
    setMessages(updatedMessages);
    setEditingMessageId(null);
    setEditingText('');

    // Rebuild history from updated messages — skip system messages, they're not LLM context
    const updatedHistory: HistoryItem[] = updatedMessages
      .filter((m): m is Message & { role: 'user' | 'assistant' } => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.text }));
    setHistory(updatedHistory);

    await fetchAthenaReply(updatedHistory);
  }

  function handleEditStart(id: string, currentText: string) {
    if (isLoading) return;
    setEditingMessageId(id);
    setEditingText(currentText);
  }

  function handleEditCancel() {
    setEditingMessageId(null);
    setEditingText('');
  }

  // ── Compose (reset) ──

  // ── Compose ──
  // COMPOSE RULE: This function resets the thread only.
  // It must NEVER call setIsFloating, setDisplayMode, or setFloatPos.
  // Display mode is controlled exclusively by the ⌘\ shortcut (and drag-to-float).
  // Do not add display mode changes here under any circumstances.

  function handleCompose() {
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
    // COMPOSE RULE: reset agent state alongside thread reset
    setActiveAgentId('athena');
    setActiveSystemPrompt(null);
    setShowBackToAthena(false);
    // Bump threadId so GuidanceCards resets its cursor + enabled state
    setThreadId(crypto.randomUUID());
    // Reset participants to host only
    setParticipants([HOST_PARTICIPANT]);
    setMentionMenuOpen(false);
    setMentionSearch('');
    // Reset prompt queue
    setPromptQueue([]);
    setQueueBannerOpen(false);
    setOverflowToastVisible(false);
    setTimeout(() => textareaRef.current && textareaRef.current.focus(), 50);
  }

  // ── Agent switching ──

  function handleInputChange(value: string) {
    setInputText(value);
    if (value.startsWith('/')) {
      setAgentMenuOpen(true);
      setAgentQuery(value.slice(1));
    } else if (agentMenuOpen) {
      setAgentMenuOpen(false);
      setAgentQuery('');
    }
    // Detect @ mention trigger
    const lastAt = value.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || value[lastAt - 1] === ' ')) {
      setMentionSearch(value.slice(lastAt + 1));
      setMentionMenuOpen(true);
    } else {
      setMentionMenuOpen(false);
      setMentionSearch('');
    }
  }

  function handleAgentSelect(agent: Agent) {
    setActiveAgentId(agent.id);
    setActiveSystemPrompt(agent.id === 'athena' ? null : agent.systemPrompt);
    setShowBackToAthena(agent.id !== 'athena');
    setAgentMenuOpen(false);
    setAgentQuery('');
    setInputText('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // ── Participant management ──

  function handleAddParticipant(participant: Participant) {
    // Always: add to participants list
    setParticipants(prev => [...prev, participant]);
    setMentionMenuOpen(false);
    setMentionSearch('');
    // Always: strip the @mention from the input field
    setInputText(prev => prev.replace(/@\S*$/, '').trim());
    // Always: show system message in thread
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system' as const,
      text: `${HOST_PARTICIPANT.name} added ${participant.name} to this thread`,
      timestamp: getTimestamp(),
    }]);
    // Only if thread is already active — trigger Athena acknowledgment
    if (isSubmitted) {
      const ackPrompt = `A new participant just joined the thread: ${participant.name}, ${participant.role}. Briefly acknowledge them, summarize the conversation context in 2 sentences, and tell them what context ${HOST_PARTICIPANT.name} needs from them. Be concise and natural.`;
      void fetchAthenaReply([
        ...history,
        { role: 'user', content: ackPrompt },
      ]);
    }
    // If !isSubmitted — draft mode. Participant is silently added.
    // Athena will acknowledge on the first message send via group context in the system prompt.
  }

  function handleRemoveParticipant(participantId: string) {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system' as const,
      text: `${HOST_PARTICIPANT.name} removed ${participant.name} from this thread`,
      timestamp: getTimestamp(),
    }]);
  }

  // ── Artifact panel ──

  function openArtifact(artifact: Artifact) {
    if (isFloating) {
      setIsFloating(false);
    } else {
      const shell = shellRef.current;
      if (!shell || shell.offsetWidth - CHAT_MIN_WIDTH - 4 < CHAT_MIN_WIDTH) return;
    }
    setCurrentArtifact(artifact);
    setIsArtifactOpen(true);
    setActiveTab('preview');
    chatWidthRef.current = CHAT_MIN_WIDTH;
    setChatWidth(CHAT_MIN_WIDTH);
  }

  function closeArtifact() {
    setIsArtifactOpen(false);
    setCurrentArtifact(null);
    chatWidthRef.current = CHAT_MIN_WIDTH;
    setChatWidth(CHAT_MIN_WIDTH);
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
      const newWidth = Math.max(CHAT_MIN_WIDTH, startWidth + (ev.clientX - startX));
      if (shell.offsetWidth - newWidth - 4 < CHAT_MIN_WIDTH) { closeArtifact(); cleanup(); return; }
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


      <div className="canvas" style={{ background: 'transparent' }}>
        {(() => {
          // Inner shell content — shared between FloatingChat and FullscreenChat
          const shellContent = (
            <div
              ref={shellRef}
              className={`shell${isArtifactOpen ? ' artifact-open' : ''}`}
            >
              {/* ── Chat window ── */}
              <div
                ref={chatWindowRef}
                className={`chat-window${isSubmitted ? ' submitted' : ''}`}
                style={{
                  width: isArtifactOpen ? chatWidth : '100%',
                  minWidth: isArtifactOpen ? CHAT_MIN_WIDTH : undefined,
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {/* Display mode toggle — upper-right corner, pre-submission only.
                    In submitted state the same toggle lives inside ChatHeader.
                    position:absolute is on the Tooltip wrapper so the tooltip
                    itself still stacks correctly within the wrapper. */}
                {!isSubmitted && (
                  <Tooltip
                    label={isFloating ? 'Dock to page' : 'Float window'}
                    wrapperStyle={{ position: 'absolute', top: 14, right: 14, zIndex: 20 }}
                  >
                    <button
                      className="chat-header-btn"
                      onClick={() => setIsFloating(!isFloating)}
                      style={{
                        // Use hover-level opacity so button is discoverable on the empty canvas
                        color: 'var(--toolbar-hover-icon)',
                        border: '0.5px solid var(--window-border)',
                      }}
                    >
                      {isFloating ? <IconChatFullscreen /> : <IconChatFloating />}
                    </button>
                  </Tooltip>
                )}

                {/* Header */}
                {!isVoiceMode && (() => {
                  const threadTitle = participants.length > 1
                    ? participants.filter(p => !p.isHost).map(p => p.name.split(' ')[0]).join(' & ')
                    : headerTitle;
                  return (
                    <ChatHeader
                      isSubmitted={isSubmitted}
                      title={threadTitle}
                      onCompose={handleCompose}
                      isFloating={isFloating}
                      isDark={isDark}
                      onToggleTheme={() => setIsDark(d => !d)}
                      onToggleDisplay={() => setIsFloating(!isFloating)}
                      facePile={
                        participants.length > 1 ? (
                          <FacePile
                            participants={participants}
                            onRemove={handleRemoveParticipant}
                          />
                        ) : undefined
                      }
                    />
                  );
                })()}

                {/* Messages */}
                <motion.div
                  layout="position"
                  className="messages-area"
                  ref={messagesAreaRef}
                  initial={{ opacity: 0, top: 24 }}
                  animate={{ opacity: isSubmitted ? 1 : 0, top: isSubmitted ? 80 : 24 }}
                  transition={{
                    opacity: { duration: 0.4, delay: isSubmitted ? 0.3 : 0 },
                    top: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                  }}
                  style={{ bottom: messagesBottom, pointerEvents: isSubmitted ? 'all' : 'none', paddingBottom: 8 }}
                  onScroll={handleScroll}
                >
                  {messages.map(msg => (
                    <MessageItem
                      key={msg.id}
                      message={msg}
                      onTypingComplete={handleTypingComplete}
                      onArtifactClick={openArtifact}
                      messagesEl={messagesAreaRef.current}
                      onThumbsDown={setFeedbackMessageId}
                      editingMessageId={editingMessageId}
                      editingText={editingText}
                      onEditStart={handleEditStart}
                      onEditChange={setEditingText}
                      onResend={handleResend}
                      onEditCancel={handleEditCancel}
                      isLoading={isLoading}
                      participants={participants}
                    />
                  ))}
                </motion.div>

                {/* Bottom thread fade mask */}
                {isSubmitted && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: messagesBottom,
                      height: 80,
                      background: 'linear-gradient(to bottom, transparent, var(--window-bg))',
                      pointerEvents: 'none',
                      zIndex: 2,
                    }}
                  />
                )}

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

                {/* Input wrapper — FM animates y: centerOffset → 0 on submit */}
                <motion.div
                  className="input-wrapper"
                  ref={inputWrapperRef}
                  animate={{ y: isSubmitted ? 0 : centerOffset }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  style={{ willChange: 'auto', zIndex: 20 }}
                >
                  <AnimatePresence>
                    {!isSubmitted && (
                      <motion.div
                        key="welcome"
                        className="welcome"
                        initial={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <h1>{getWelcomeMessage(user.firstName)}</h1>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* StickyBanner hidden — see StickyBanner.tsx */}

                  {/* Back to Athena — shown when a non-default agent is active */}
                  {showBackToAthena && (
                    <button
                      onClick={() => handleAgentSelect(SAMPLE_AGENTS[0])}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 8,
                        padding: '5px 10px',
                        background: 'transparent',
                        border: '0.5px solid var(--input-border)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: 'var(--toolbar-hover-icon)',
                        fontFamily: "'Lato', sans-serif",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Back to Athena
                    </button>
                  )}

                  {/* Processing bar — always mounted, display:flex/none toggled by isLoading */}
                  <ProcessingBar isLoading={isLoading} />

                  {/* Prompt queue banner */}
                  {promptQueue.length > 0 && (
                    <div style={{ padding: '0 4px 0' }}>
                      <QueueBanner
                        queue={promptQueue}
                        onRemove={handleQueueRemove}
                        onEdit={handleQueueEdit}
                      />
                    </div>
                  )}

                  {/* Footer slot: normal input ↔ context prompt — zIndex:2 so it overlaps banner */}
                  <div className="footer-slot" ref={footerSlotRef} style={{ position: 'relative', zIndex: 2 }}>
                    {/* Overflow toast — floats above input when queue is full */}
                    <OverflowToast
                      visible={overflowToastVisible}
                      onDismiss={() => setOverflowToastVisible(false)}
                    />
                    <AnimatePresence mode="wait">
                      {footerMode === 'normal' ? (
                        <motion.div
                          key="normal"
                          layout="position"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 12 }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        >
                          {!isVoiceMode && (
                            <div style={{ position: 'relative' }}>
                              <AgentMenu
                                isOpen={agentMenuOpen}
                                query={agentQuery}
                                activeAgentId={activeAgentId}
                                onSelect={handleAgentSelect}
                                onQueryChange={setAgentQuery}
                              />
                              {mentionMenuOpen && (
                                <MentionMenu
                                  search={mentionSearch}
                                  onSearch={setMentionSearch}
                                  participants={participants}
                                  onSelect={handleAddParticipant}
                                />
                              )}
                              <FooterNormal
                                chips={attachmentChips}
                                onRemoveChip={removeAttachmentChip}
                                inputText={inputText}
                                onChange={handleInputChange}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                                onSend={handleSubmit}
                                onVoice={() => { if (!isSubmitted) setIsSubmitted(true); setIsVoiceMode(true); }}
                                disabled={isLoading}
                                textareaRef={textareaRef}
                              />
                            </div>
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
                          layout="position"
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

                  {/* Caption */}
                  <p className="caption" ref={captionRef} style={{ willChange: 'auto' }}>Athena may make mistakes. Review important info.</p>
                </motion.div>

                {/* AthenaIntelligenceOverlay hidden — see StickyBanner.tsx */}

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
          );

          return isFloating
            ? <FloatingChat>{shellContent}</FloatingChat>
            : <FullscreenChat>{shellContent}</FullscreenChat>;
        })()}
      </div>

      {feedbackMessageId && (
        <FeedbackModal
          messageId={feedbackMessageId}
          onClose={() => setFeedbackMessageId(null)}
        />
      )}
    </>
  );
}
