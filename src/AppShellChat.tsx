import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AthenaChatExperience, { DisplayMode } from './AthenaChatExperience';
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
      animate={{ width: isCollapsed ? 64 : 240 }}
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

const AppShellTopBar: React.FC = () => (
  <div style={{
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '8px 24px',
    gap: 48,
    height: 64,
    background: '#000000',
    borderBottom: '1px solid #424242',
    alignSelf: 'stretch',
    flexShrink: 0,
    zIndex: 1,
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

      {/* Account */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '4px 8px 4px 4px',
        gap: 8,
        maxWidth: 224,
        height: 40,
        borderRadius: 6,
        cursor: 'pointer',
      }}>
        {/* Thumbnail */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #1677FF, #722ED1)',
          border: '1px solid #424242',
          borderRadius: 4,
          flexShrink: 0,
        }} />

        {/* Account name */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'flex-start', gap: 4,
        }}>
          <span style={{
            fontFamily: 'Lato', fontStyle: 'normal', fontWeight: 700,
            fontSize: 14, lineHeight: '14px', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap',
          }}>Zeta Luxury Hotels</span>
          <span style={{
            fontFamily: 'Lato', fontStyle: 'normal', fontWeight: 400,
            fontSize: 12, lineHeight: '12px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap',
          }}>Tokyo, Ginza Luxury Towers</span>
        </div>
      </div>

    </div>
  </div>
);

// ─── AppShellChat ─────────────────────────────────────────────────────────────

const NEXT_MODE: Record<DisplayMode, DisplayMode> = { fullscreen: 'floating', floating: 'docked', docked: 'fullscreen' };

const AppShellChat: React.FC = () => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('fullscreen');
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);

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

  // Show top bar when not fullscreen; no padding when a panel overlays
  const showTopBar = displayMode !== 'fullscreen';
  const contentPadding = displayMode === 'fullscreen' ? 24 : 0;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000000' }}>

      {/* Sidebar — always visible */}
      <AppShellSidebar displayMode={displayMode} onDisplayModeChange={setDisplayMode} forceCollapsed={intelligenceOpen} />

      {/* Right side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar — non-fullscreen modes only */}
        {showTopBar && <AppShellTopBar />}

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
          />
        </div>

      </div>
    </div>
  );
};

export default AppShellChat;
