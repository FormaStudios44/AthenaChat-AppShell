import { useState } from 'react';
import { motion } from 'framer-motion';
import AthenaChatExperience from './AthenaChatExperience';
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

type NavLink = { type?: 'link'; id: string; label: string; icon: string; hasChevron?: boolean };
type NavDivider = { type: 'divider' };
type NavItem = NavLink | NavDivider;

const NAV_ITEMS: NavItem[] = [
  { id: 'apps',          label: 'Apps',          icon: applicationsIcon },
  { type: 'divider' },
  { id: 'onboarding',   label: 'Onboarding',    icon: onboardingIcon },
  { id: 'home',         label: 'Home',           icon: homeIcon },
  { id: 'calendar',     label: 'Calendar',       icon: calendarIcon },
  { id: 'opportunities',label: 'Opportunities',  icon: opportunitiesIcon },
  { id: 'campaigns',    label: 'Campaigns',      icon: campaignsIcon,    hasChevron: true },
  { id: 'experiences',  label: 'Experiences',    icon: experiencesIcon,  hasChevron: true },
  { id: 'conversations',label: 'Conversations',  icon: conversationsIcon },
  { id: 'audiences',    label: 'Audiences',      icon: audiencesIcon,    hasChevron: true },
  { id: 'ai-studio',    label: 'AI Studio',      icon: aiStudioIcon,     hasChevron: true },
  { id: 'content',      label: 'Content',        icon: contentIcon,      hasChevron: true },
  { id: 'analytics',    label: 'Analytics',      icon: analyticsIcon,    hasChevron: true },
  { id: 'data',         label: 'Data',           icon: dataIcon,         hasChevron: true },
];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState('home');

  return (
    <div className="app-shell">
      <motion.aside
        className={`sidebar${collapsed ? ' collapsed' : ''}`}
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <img
              src={collapseLeftIcon}
              alt=""
              className={`collapse-icon${collapsed ? ' flipped' : ''}`}
              draggable={false}
            />
          </button>
        </div>

        <nav className="sidebar-menu">
          {NAV_ITEMS.map((item, i) => {
            if (item.type === 'divider') {
              return <div key={`divider-${i}`} className="sidebar-divider" />;
            }
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item${active ? ' active' : ''}`}
                onClick={() => setActiveId(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <img src={item.icon} alt="" className="nav-icon" draggable={false} />
                <span className="nav-label">{item.label}</span>
                {item.hasChevron && <ChevronIcon />}
              </button>
            );
          })}
        </nav>
      </motion.aside>

      <main className="app-main">
        <AthenaChatExperience />
      </main>
    </div>
  );
}


function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="nav-chevron" aria-hidden="true">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
