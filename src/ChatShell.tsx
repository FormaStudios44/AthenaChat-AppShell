// ChatShell.tsx
// Single source of truth for chat window chrome.
// Every visual feature applied here is automatically inherited by
// FloatingChat and FullscreenChat — never duplicate styles in those files.
//
// Owns:
// - border radius
// - background color
// - overflow hidden
// - box shadow (passed as prop — floating vs fullscreen differ)
// - layout spring animation config
// - isTransitioning content fade (hides content during resize, fades back in)
// - onLayoutAnimationStart / onLayoutAnimationComplete callbacks
//
// Does NOT own:
// - positioning (left, top, fixed, absolute) — that belongs to FloatingChat/FullscreenChat
// - drag activation decision — FloatingChat passes draggable=true; FullscreenChat never does
// - width/height — belongs to FloatingChat/FullscreenChat

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface ChatShellProps {
  children: React.ReactNode;
  boxShadow?: string;
  style?: React.CSSProperties;
  /** When true, renders the drag handle over the header area. Only FloatingChat sets this. */
  draggable?: boolean;
  /** Required when draggable is true. Called on mousedown of the drag handle. */
  onDragStart?: (e: React.MouseEvent) => void;
}

// SPRING CONFIG — single source of truth for all layout animations.
// Change here and both FloatingChat and FullscreenChat get the update.
export const CHAT_SPRING = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 32,
  mass: 0.9,
  restDelta: 0.001,
};

// CHAT DIMENSIONS — single source of truth.
export const CHAT_MIN_WIDTH = 432;
export const FLOAT_WIDTH = 432;
export const FLOAT_HEIGHT = 640;
export const FLOAT_DEFAULT_X = () => window.innerWidth - FLOAT_WIDTH - 24;
export const FLOAT_DEFAULT_Y = () => window.innerHeight - FLOAT_HEIGHT - 56;

const ChatShell = ({ children, boxShadow = 'none', style, draggable = false, onDragStart }: ChatShellProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);

  const handleDragMouseDown = (e: React.MouseEvent) => {
    setIsDraggingHandle(true);
    const onUp = () => {
      setIsDraggingHandle(false);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mouseup', onUp);
    onDragStart?.(e);
  };

  return (
    <motion.div
      layout="size"
      layoutId="athena-chat-window"
      onLayoutAnimationStart={() => setIsTransitioning(true)}
      onLayoutAnimationComplete={() => setIsTransitioning(false)}
      transition={{ layout: CHAT_SPRING }}
      style={{
        width: '100%',
        height: '100%',
        minWidth: 432,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'var(--window-bg)',
        boxShadow,
        position: 'relative',
        ...style,
      }}
    >
      {/* Drag handle — only rendered when draggable=true (FloatingChat only) */}
      {draggable && (
        <div
          onMouseDown={handleDragMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            cursor: isDraggingHandle ? 'grabbing' : 'grab',
            zIndex: 10,
          }}
        />
      )}

      {/* Content fade — hides layout-shift flicker during spring transitions */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          opacity: isTransitioning ? 0 : 1,
          transition: isTransitioning ? 'none' : 'opacity 0.2s ease',
          pointerEvents: isTransitioning ? 'none' : 'all',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
};

export default ChatShell;
