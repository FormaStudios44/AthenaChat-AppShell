import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AthenaChatExperience, { DisplayMode, ChatDisplayMode } from './AthenaChatExperience';
import './AppShell.css';

import zetaLogo from './assets/zetalogo.svg';
import collapseLeftIcon from './assets/collapse/Left.svg';
import applicationsIcon from './assets/sidebar/applications.svg';
import onboardingIcon from './assets/sidebar/onboarding.svg';
import homeIcon from './assets/sidebar/home.svg';
import calendarIcon from './assets/sidebar/calendar.svg';
import opportunitiesIcon from './assets/sidebar/opportunities.svg';
import campaignsIcon from './assets/sidebar/campaigns.svg';
import experiencesIcon from './assets/sidebar/experiences.svg';
import conversationsIcon from './assets/sidebar/conversations.svg';
import audiencesIcon from './assets/sidebar/audiences.svg';
import aiStudioIcon from './assets/sidebar/ai-studio.svg';
import contentIcon from './assets/sidebar/content.svg';
import analyticsIcon from './assets/sidebar/analytics.svg';
import dataIcon from './assets/sidebar/data.svg';
import helpIcon from './assets/topbar/help.svg';
import settingsIcon from './assets/topbar/settings.svg';

// ─── Types ────────────────────────────────────────────────────────────────────

type NavLink = { type?: 'link'; id: string; label: string; icon: string; hasChevron?: boolean; children?: string[] };
type NavDivider = { type: 'divider' };
type NavItem = NavLink | NavDivider;

// ─── Demo accounts ────────────────────────────────────────────────────────────

interface DemoAccount {
  id: string;
  name: string;
  location: string;
  initials: string;
  color: string;
  isDayZero: boolean;
}

const ACCOUNTS: DemoAccount[] = [
  { id: 'zeta-luxury',   name: 'Zeta Luxury Hotels', location: 'Tokyo, Ginza Luxury Towers', initials: 'ZL', color: '#1677FF', isDayZero: false },
  { id: 'zeta-boutique', name: 'Zeta Boutique',       location: 'New York, SoHo District',   initials: 'ZB', color: '#722ED1', isDayZero: true  },
];

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'apps',          label: 'Apps',          icon: applicationsIcon },
  { type: 'divider' },
  { id: 'onboarding',   label: 'Onboarding',    icon: onboardingIcon },
  { id: 'home',         label: 'Home',           icon: homeIcon },
  { id: 'calendar',     label: 'Calendar',       icon: calendarIcon },
  { id: 'opportunities',label: 'Opportunities',  icon: opportunitiesIcon },
  {
    id: 'campaigns', label: 'Campaigns', icon: campaignsIcon, hasChevron: true,
    children: ['Broadcast', 'Triggered', 'Website In-Page', 'Website Overlay', 'Media'],
  },
  {
    id: 'experiences', label: 'Experiences', icon: experiencesIcon, hasChevron: true,
    children: ['Builder', 'Behaviors', 'Events', 'Live Marketer', 'Intelligent Templates'],
  },
  { id: 'conversations', label: 'Conversations', icon: conversationsIcon },
  {
    id: 'audiences', label: 'Audiences', icon: audiencesIcon, hasChevron: true,
    children: ['Segments & Lists', 'Prospect Explorer', 'People', 'Identity Manager', 'Exports'],
  },
  {
    id: 'ai-studio', label: 'AI Studio', icon: aiStudioIcon, hasChevron: true,
    children: ['Agent Studio', 'Performance Advisor', 'Simulator', 'Workflows'],
  },
  {
    id: 'content', label: 'Content', icon: contentIcon, hasChevron: true,
    children: ['Resources', 'Asset Library', 'Visual Composer', 'Email Templates', 'Snippets', 'Feeds'],
  },
  {
    id: 'analytics', label: 'Analytics', icon: analyticsIcon, hasChevron: true,
    children: ['Insights Studio', 'Templates', 'Query Lab', 'Attribution', 'Content', 'Prime Time', 'Embedded Reports'],
  },
  {
    id: 'data', label: 'Data', icon: dataIcon, hasChevron: true,
    children: ['Connectivity', 'Data Flows', 'Data Mappings', 'Clean Room', 'Files'],
  },
];

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const AppShellSidebar: React.FC<{ displayMode: DisplayMode; onDisplayModeChange: (m: DisplayMode) => void; forceCollapsed?: boolean }> = ({ displayMode, onDisplayModeChange, forceCollapsed = false }) => {
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = collapsed || forceCollapsed;
  const [activeId, setActiveId] = useState('home');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleNavClick = (item: NavLink) => {
    if (item.children?.length) {
      setExpandedId(prev => prev === item.id ? null : item.id);
    } else {
      setActiveId(item.id);
      setExpandedId(null);
    }
  };

  return (
    <motion.aside
      className={`sidebar${isCollapsed ? ' collapsed' : ''}`}
      animate={{ width: forceCollapsed ? 0 : collapsed ? 64 : 240 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ flexShrink: 0, overflow: 'hidden' }}
    >
      <div className="sidebar-bg">
        <div className="ellipse ellipse-5" />
        <div className="ellipse ellipse-4" />
        <div className="ellipse ellipse-3" />
        <div className="ellipse ellipse-6" />
        <div className="ellipse ellipse-2" />
      </div>

      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-clip">
            <img src={zetaLogo} alt="Zeta" className="sidebar-zeta-logo" draggable={false} />
          </div>
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={() => {
            setCollapsed(c => !c);
            if (!isCollapsed) setExpandedId(null);
          }}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <img
            src={collapseLeftIcon}
            alt=""
            className={`collapse-icon${isCollapsed ? ' flipped' : ''}`}
            draggable={false}
          />
        </button>
      </div>

      <nav className="sidebar-menu">
        {NAV_ITEMS.map((item, i) => {
          if (item.type === 'divider') {
            return <div key={`d-${i}`} className="sidebar-divider" />;
          }
          const active = item.id === activeId;
          const expanded = expandedId === item.id && !isCollapsed;
          return (
            <div key={item.id} className="nav-item-group">
              <button
                className={`sidebar-nav-item${active ? ' active' : ''}`}
                onClick={() => handleNavClick(item)}
                title={isCollapsed ? item.label : undefined}
              >
                <img src={item.icon} alt="" className="nav-icon" draggable={false} />
                <span className="nav-label">{item.label}</span>
                {item.hasChevron && (
                  <motion.span
                    className="nav-chevron"
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <ChevronIcon />
                  </motion.span>
                )}
              </button>

              {item.children?.length && (
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      className="nav-submenu"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      {item.children.map(child => {
                        const childId = `${item.id}__${child}`;
                        const childActive = activeId === childId;
                        return (
                          <button
                            key={child}
                            className={`nav-sub-item${childActive ? ' active' : ''}`}
                            onClick={() => setActiveId(childId)}
                          >
                            <span className="nav-sub-label">{child}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </nav>

      {/* Chat mode switcher — bottom of sidebar */}
      <div style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: isCollapsed ? '8px 0' : '8px 12px',
        borderTop: '1px solid #303030',
        display: 'flex',
        flexDirection: isCollapsed ? 'column' : 'row',
        gap: 4,
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}>
        {([
          {
            mode: 'fullscreen' as DisplayMode,
            label: 'Full',
            title: 'Fullscreen',
            icon: (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="3.5" y="3.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            ),
          },
          {
            mode: 'floating' as DisplayMode,
            label: 'Float',
            title: 'Floating',
            icon: (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.3"/>
                <rect x="7" y="4" width="5" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            ),
          },
          {
            mode: 'docked' as DisplayMode,
            label: 'Dock',
            title: 'Docked',
            icon: (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M9 2v10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            ),
          },
        ] as const).map(({ mode, label, title, icon }) => {
          const active = displayMode === mode;
          return (
            <button
              key={mode}
              title={title}
              onClick={() => onDisplayModeChange(mode)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: isCollapsed ? '5px' : '4px 8px',
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                fontSize: 11, fontWeight: active ? 600 : 400,
                fontFamily: "'Lato', sans-serif",
                transition: 'background 0.15s, color 0.15s',
                flexShrink: 0,
              }}
            >
              {icon}
              {!isCollapsed && <span>{label}</span>}
            </button>
          );
        })}
      </div>
    </motion.aside>
  );
};

// ─── Top bar ──────────────────────────────────────────────────────────────────

const AppShellTopBar: React.FC<{
  displayMode?: DisplayMode;
  activeAccount: DemoAccount;
  onSwitchAccount: (account: DemoAccount) => void;
}> = ({ displayMode, activeAccount, onSwitchAccount }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
  <div style={{
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '8px 24px',
    gap: 48,
    height: 64,
    marginRight: displayMode === 'docked' ? 464 : 0,
    transition: 'margin-right 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    background: '#000000',
    borderBottom: '1px solid #424242',
    borderRight: displayMode === 'docked' ? '1px solid #424242' : 'none',
    alignSelf: 'stretch',
    flexShrink: 0,
    zIndex: 1,
    position: 'relative',
  }}>

    {/* Title */}
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      padding: '0px 8px 0px 0px',
      gap: 16,
      flex: 1,
      height: 28,
    }}>
      <span style={{
        fontFamily: 'Lato',
        fontStyle: 'normal',
        fontWeight: 700,
        fontSize: 24,
        lineHeight: '28px',
        color: '#FFFFFF',
      }}>Home</span>
    </div>

    {/* Tools */}
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      height: 40,
    }}>

      {/* Actions — 3 icon buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 32,
      }}>
        {/* Search */}
        <button style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: 0, width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M6.5 1C3.46 1 1 3.46 1 6.5C1 9.54 3.46 12 6.5 12C7.75 12 8.9 11.57 9.82 10.86L13.47 14.53C13.76 14.82 14.24 14.82 14.53 14.53C14.82 14.24 14.82 13.76 14.53 13.47L10.88 9.82C11.59 8.9 12 7.75 12 6.5C12 3.46 9.54 1 6.5 1ZM2.5 6.5C2.5 4.29 4.29 2.5 6.5 2.5C8.71 2.5 10.5 4.29 10.5 6.5C10.5 8.71 8.71 10.5 6.5 10.5C4.29 10.5 2.5 8.71 2.5 6.5Z" fill="rgba(255,255,255,0.85)"/>
          </svg>
        </button>

        {/* Help */}
        <button style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: 0, width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer',
          filter: 'brightness(0) invert(1) opacity(0.85)',
        }}>
          <img src={helpIcon} alt="Help" width={16} height={16} draggable={false} />
        </button>

        {/* Settings */}
        <button style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: 0, width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer',
          filter: 'brightness(0) invert(1) opacity(0.85)',
        }}>
          <img src={settingsIcon} alt="Settings" width={16} height={16} draggable={false} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: '#424242', flexShrink: 0 }} />

      {/* Account — clickable tile opens switch modal */}
      <div onClick={() => setModalOpen(prev => !prev)} style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '4px 8px 4px 4px',
        gap: 8,
        maxWidth: 224,
        height: 40,
        borderRadius: 6,
        cursor: 'pointer',
        background: modalOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => { if (!modalOpen) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={e => { if (!modalOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {/* Thumbnail */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          width: 32, height: 32,
          background: activeAccount.color,
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4,
          flexShrink: 0,
          fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Lato, sans-serif',
        }}>{activeAccount.initials}</div>

        {/* Account name */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'flex-start', gap: 4,
        }}>
          <span style={{
            fontFamily: 'Lato', fontStyle: 'normal', fontWeight: 700,
            fontSize: 14, lineHeight: '14px', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap',
          }}>{activeAccount.name}</span>
          <span style={{
            fontFamily: 'Lato', fontStyle: 'normal', fontWeight: 400,
            fontSize: 12, lineHeight: '12px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap',
          }}>{activeAccount.location}</span>
        </div>

        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 4, flexShrink: 0, opacity: 0.45, transform: modalOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Switch Account modal */}
      {modalOpen && (
        <>
          {/* Backdrop */}
          <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          {/* Dropdown */}
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            width: 264, zIndex: 100,
            background: '#1A1A1A', border: '1px solid #2E2E2E',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: '0.5px solid #2E2E2E' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Lato, sans-serif' }}>Switch Account</span>
            </div>
            {ACCOUNTS.map(acc => {
              const isActive = acc.id === activeAccount.id;
              return (
                <button key={acc.id}
                  onClick={() => { onSwitchAccount(acc); setModalOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', border: 'none', background: 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 4, flexShrink: 0,
                    background: acc.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Lato, sans-serif',
                  }}>{acc.initials}</div>
                  {/* Name + location */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isActive ? '#fff' : 'rgba(255,255,255,0.75)', fontFamily: 'Lato, sans-serif', lineHeight: '17px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Lato, sans-serif', lineHeight: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.location}</p>
                  </div>
                  {/* Active checkmark */}
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="#1677FF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

    </div>
  </div>
  );
};

// ─── AppShellChat ─────────────────────────────────────────────────────────────

const NEXT_MODE: Record<DisplayMode, DisplayMode> = { fullscreen: 'floating', floating: 'docked', docked: 'fullscreen' };

const AppShellChat: React.FC = () => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('fullscreen');
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [chatDisplayMode, setChatDisplayMode] = useState<ChatDisplayMode>('default');
  const [activeAccount, setActiveAccount] = useState<DemoAccount>(ACCOUNTS[0]);

  // Ref to expose AthenaChatExperience's handleCompose to the rail header
  const composeRef = useRef<(() => void) | null>(null);

  // ⌘\ / Ctrl\ cycles through modes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setDisplayMode(prev => NEXT_MODE[prev]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Docked-right layout ───────────────────────────────────────────────────
  if (chatDisplayMode === 'docked') {
    const topBarHeight = 64; // matches AppShellTopBar height

    return (
      <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100vh', overflow: 'hidden', background: '#000' }}>

        {/* Sidebar */}
        <AppShellSidebar displayMode={displayMode} onDisplayModeChange={setDisplayMode} forceCollapsed={intelligenceOpen} />

        {/* Center column: topbar + page content */}
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
          <AppShellTopBar activeAccount={activeAccount} onSwitchAccount={setActiveAccount} />
          <div style={{ flex: '1 1 auto', overflow: 'hidden', position: 'relative', background: '#111' }}>
            {/* Page content placeholder when docked */}
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14, fontFamily: 'Lato, sans-serif' }}>Page content</span>
            </div>
          </div>
        </div>

        {/* Chat rail */}
        <div style={{
          width: 430, flexShrink: 0, height: '100%',
          display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid rgba(0,0,0,0.08)',
          background: '#ffffff',
        }}>
          {/* Rail header — same height as topbar */}
          <div style={{
            height: topBarHeight, flexShrink: 0,
            display: 'flex', alignItems: 'center',
            padding: '0 16px 0 20px', gap: 8,
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            background: '#ffffff',
          }}>
            {/* Athena icon */}
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="rail-hdr-grad" x1="23.4448" y1="-11.1367" x2="-11.5792" y2="21.8817" gradientUnits="userSpaceOnUse">
                  <stop offset="24.16%" stopColor="#0FAEFF" />
                  <stop offset="53.98%" stopColor="#BA0090" />
                  <stop offset="85.68%" stopColor="#FFF047" />
                </linearGradient>
              </defs>
              <path fillRule="evenodd" clipRule="evenodd"
                d="M7.01126 0.470228C7.19962 0.327342 7.42956 0.25 7.66598 0.25C7.90241 0.25 8.13234 0.327342 8.32071 0.470228C8.50907 0.613112 8.64552 0.813694 8.70923 1.04137L8.71325 1.05634L9.76721 5.14615C9.79325 5.24709 9.84586 5.3392 9.91957 5.41291C9.99323 5.48658 10.0853 5.53917 10.1861 5.56523L14.2884 6.6224C14.517 6.68545 14.7186 6.82186 14.8622 7.0105C15.0059 7.19915 15.0837 7.42972 15.0837 7.66683C15.0837 7.90395 15.0059 8.13452 14.8622 8.32317C14.7186 8.51181 14.517 8.64812 14.2884 8.71117L14.2762 8.71454L10.1863 9.76839C10.0854 9.79443 9.99328 9.84704 9.91957 9.92075C9.84586 9.99446 9.79325 10.0866 9.76721 10.1875L8.71256 14.2774L8.70857 14.2923C8.64485 14.52 8.5084 14.7206 8.32004 14.8634C8.13168 15.0063 7.90175 15.0837 7.66532 15.0837C7.42889 15.0837 7.19896 15.0063 7.0106 14.8634C6.82224 14.7206 6.68578 14.52 6.62207 14.2923L6.61804 14.2773L5.56409 10.1875C5.53804 10.0867 5.4854 9.99442 5.41173 9.92075C5.33802 9.84704 5.24591 9.79443 5.14497 9.76839L1.05504 8.71374L1.03753 8.709C0.810748 8.64463 0.61115 8.50805 0.469023 8.31996C0.326897 8.13188 0.25 7.90257 0.25 7.66683C0.25 7.43109 0.326897 7.20178 0.469023 7.0137C0.61115 6.82562 0.810748 6.68903 1.03753 6.62467L1.05493 6.61995L5.14493 5.56462C5.24584 5.5386 5.33807 5.486 5.41177 5.41234C5.48541 5.33876 5.53801 5.24682 5.56412 5.14605L6.61874 1.05623L6.62273 1.04137C6.68645 0.813698 6.8229 0.613115 7.01126 0.470228Z"
                fill="url(#rail-hdr-grad)"
              />
            </svg>

            {/* Title */}
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(0,0,0,0.88)', flex: 1, fontFamily: 'Lato, sans-serif' }}>
              Athena
            </span>

            {/* Compose button */}
            <button
              title="New thread"
              onClick={() => composeRef.current?.()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                       width: 32, height: 32, borderRadius: 8, border: 'none',
                       background: 'transparent', cursor: 'pointer', color: 'rgba(0,0,0,0.55)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M11.1828 1.99444L5.92529 7.25259C5.86477 7.313 5.81997 7.38808 5.79583 7.4701L5.49285 8.50636L6.52948 8.20328C6.6117 8.17927 6.68677 8.13489 6.74736 8.07436L12.0047 2.81639C12.1137 2.7074 12.175 2.55955 12.175 2.40541C12.175 2.25127 12.1138 2.10344 12.0048 1.99444C11.8958 1.88545 11.7479 1.82422 11.5938 1.82422C11.4397 1.82422 11.2918 1.88547 11.1828 1.99444ZM10.2548 1.06637C10.6099 0.711232 11.0916 0.511719 11.5938 0.511719C12.096 0.511719 12.5777 0.711232 12.9328 1.06637C13.288 1.4215 13.4875 1.90317 13.4875 2.40541C13.4875 2.90763 13.288 3.38929 12.9329 3.74442L7.67529 9.00259C7.45891 9.21877 7.19139 9.37727 6.8978 9.46304L5.22188 9.95304C5.05875 10.0006 4.88541 10.0036 4.7208 9.96142C4.55619 9.91924 4.40594 9.8336 4.28578 9.71343C4.16562 9.59327 4.07997 9.44302 4.0378 9.27841C3.99562 9.1138 3.99847 8.94088 4.04605 8.77774L4.53618 7.10141C4.62228 6.80816 4.78094 6.54055 4.99716 6.32456L10.2548 1.06637ZM1.62767 1.62684C1.96953 1.28497 2.4332 1.09292 2.91667 1.09292H7C7.36244 1.09292 7.65625 1.38673 7.65625 1.74917C7.65625 2.1116 7.36244 2.40542 7 2.40542H2.91667C2.7813 2.40542 2.65147 2.45919 2.55575 2.55491C2.46003 2.65064 2.40625 2.78046 2.40625 2.91583V11.0825C2.40625 11.2179 2.46003 11.3477 2.55575 11.4434C2.65147 11.5391 2.7813 11.5929 2.91667 11.5929H11.0833C11.2187 11.5929 11.3485 11.5391 11.4443 11.4434C11.54 11.3477 11.5938 11.2179 11.5938 11.0825V6.99917C11.5938 6.63673 11.8876 6.34292 12.25 6.34292C12.6124 6.34292 12.9062 6.63673 12.9062 6.99917V11.0825C12.9062 11.566 12.7142 12.0296 12.3723 12.3715C12.0305 12.7134 11.5668 12.9054 11.0833 12.9054H2.91667C2.4332 12.9054 1.96953 12.7134 1.62767 12.3715C1.28581 12.0296 1.09375 11.566 1.09375 11.0825V2.91583C1.09375 2.43237 1.28581 1.9687 1.62767 1.62684Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* More / undock button */}
            <button
              title="Default view"
              onClick={() => setChatDisplayMode('default')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                       width: 32, height: 32, borderRadius: 8, border: 'none',
                       background: 'transparent', cursor: 'pointer', color: 'rgba(0,0,0,0.55)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M2.91683 7.07227C2.9571 7.07227 2.98975 7.03962 2.98975 6.99935C2.98975 6.95908 2.9571 6.92643 2.91683 6.92643C2.87656 6.92643 2.84391 6.95908 2.84391 6.99935C2.84391 7.03962 2.87656 7.07227 2.91683 7.07227ZM1.67725 6.99935C1.67725 6.31475 2.23223 5.75977 2.91683 5.75977C3.60143 5.75977 4.15641 6.31475 4.15641 6.99935C4.15641 7.68395 3.60143 8.23893 2.91683 8.23893C2.23223 8.23893 1.67725 7.68395 1.67725 6.99935ZM7.00016 7.07227C7.04043 7.07227 7.07308 7.03962 7.07308 6.99935C7.07308 6.95908 7.04043 6.92643 7.00016 6.92643C6.95989 6.92643 6.92725 6.95908 6.92725 6.99935C6.92725 7.03962 6.95989 7.07227 7.00016 7.07227ZM5.76058 6.99935C5.76058 6.31475 6.31556 5.75977 7.00016 5.75977C7.68477 5.75977 8.23975 6.31475 8.23975 6.99935C8.23975 7.68395 7.68477 8.23893 7.00016 8.23893C6.31556 8.23893 5.76058 7.68395 5.76058 6.99935ZM11.0835 7.07227C11.1238 7.07227 11.1564 7.03962 11.1564 6.99935C11.1564 6.95908 11.1238 6.92643 11.0835 6.92643C11.0432 6.92643 11.0106 6.95908 11.0106 6.99935C11.0106 7.03962 11.0432 7.07227 11.0835 7.07227ZM9.84391 6.99935C9.84391 6.31475 10.3989 5.75977 11.0835 5.75977C11.7681 5.75977 12.3231 6.31475 12.3231 6.99935C12.3231 7.68395 11.7681 8.23893 11.0835 8.23893C10.3989 8.23893 9.84391 7.68395 9.84391 6.99935Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Chat content — fills remaining rail height */}
          <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
            <AthenaChatExperience
              hideHeader={true}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              onIntelligenceOpenChange={setIntelligenceOpen}
              chatDisplayMode={chatDisplayMode}
              onChatDisplayModeChange={setChatDisplayMode}
              composeRef={composeRef}
              isDayZero={activeAccount.isDayZero}
              accountId={activeAccount.id}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Default layout (fullscreen / floating / docked-widget) ───────────────
  const showTopBar = displayMode !== 'fullscreen';
  const contentPadding = displayMode === 'fullscreen' ? 24 : 0;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000000' }}>

      {/* Sidebar — always visible */}
      <AppShellSidebar displayMode={displayMode} onDisplayModeChange={setDisplayMode} forceCollapsed={intelligenceOpen} />

      {/* Right side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar — non-fullscreen modes only */}
        {showTopBar && <AppShellTopBar displayMode={displayMode} activeAccount={activeAccount} onSwitchAccount={setActiveAccount} />}

        {/* Content area */}
        <div style={{
          flex: 1,
          position: 'relative',
          padding: contentPadding,
          overflow: 'hidden',
          borderRadius: displayMode === 'fullscreen' ? 16 : 0,
          marginRight: displayMode === 'docked' ? 464 : 0,
          transition: 'margin-right 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {/* Black backdrop when Intelligence overlay is open */}
          <AnimatePresence>
            {intelligenceOpen && (
              <motion.div
                key="intelligence-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 10, borderRadius: 'inherit', pointerEvents: 'none' }}
              />
            )}
          </AnimatePresence>
          <AthenaChatExperience
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            onIntelligenceOpenChange={setIntelligenceOpen}
            chatDisplayMode={chatDisplayMode}
            onChatDisplayModeChange={setChatDisplayMode}
            isDayZero={activeAccount.isDayZero}
            accountId={activeAccount.id}
          />
        </div>

      </div>
    </div>
  );
};

export default AppShellChat;
