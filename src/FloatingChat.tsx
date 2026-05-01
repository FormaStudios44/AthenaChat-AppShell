// FloatingChat.tsx
// Responsible for: fixed positioning, drag overlay, float position state,
// and clamp-to-viewport logic on resize.
//
// CONSISTENCY RULE:
// Do NOT add visual styles (colors, radius, shadows, animations, transitions) to this file.
// All chat window chrome lives in ChatShell.tsx.
// This file is responsible for POSITIONING AND DRAG ONLY.
// Adding a feature to ChatShell.tsx automatically applies it to both FloatingChat and FullscreenChat.

import React, { useRef, useState, useEffect } from 'react';
import ChatShell, { FLOAT_WIDTH, FLOAT_HEIGHT, FLOAT_DEFAULT_X, FLOAT_DEFAULT_Y } from './ChatShell';

interface FloatingChatProps {
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
}

const FloatingChat = ({ children, initialX, initialY }: FloatingChatProps) => {
  const [pos, setPos] = useState({
    x: initialX ?? FLOAT_DEFAULT_X(),
    y: initialY ?? FLOAT_DEFAULT_Y(),
  });
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // Clamp position when the viewport resizes
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => ({
        x: Math.min(prev.x, window.innerWidth - FLOAT_WIDTH),
        y: Math.min(prev.y, window.innerHeight - FLOAT_HEIGHT),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;

    const onMove = (ev: MouseEvent) => {
      setPos({
        x: Math.max(0, Math.min(ev.clientX - startX, window.innerWidth - FLOAT_WIDTH)),
        y: Math.max(0, Math.min(ev.clientY - startY, window.innerHeight - FLOAT_HEIGHT)),
      });
    };
    const onUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: FLOAT_WIDTH,
        minWidth: 432,
        height: FLOAT_HEIGHT,
        zIndex: 999,
        willChange: isDragging ? 'transform' : 'auto',
      }}
    >
      {/* Drag handle lives in ChatShell (draggable prop), not here.
          FloatingChat owns position + willChange; ChatShell owns the handle UI. */}
      <ChatShell
        draggable
        onDragStart={handleDragStart}
        boxShadow="0 32px 96px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(0,0,0,0.12)"
      >
        {children}
      </ChatShell>
    </div>
  );
};

export default FloatingChat;
