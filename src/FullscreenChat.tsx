// FullscreenChat.tsx
// Responsible for: filling the parent content area edge-to-edge.
//
// CONSISTENCY RULE:
// Do NOT add visual styles (colors, radius, shadows, animations, transitions) to this file.
// All chat window chrome lives in ChatShell.tsx.
// This file is responsible for POSITIONING ONLY.
// Adding a feature to ChatShell.tsx automatically applies it to both FloatingChat and FullscreenChat.
//
// FULLSCREEN RULE: This mode is never draggable.
// Drag behavior belongs exclusively to FloatingChat.
// Never pass draggable or onDragStart to ChatShell from this file.

import React from 'react';
import ChatShell from './ChatShell';

interface FullscreenChatProps {
  children: React.ReactNode;
}

const FullscreenChat = ({ children }: FullscreenChatProps) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ChatShell boxShadow="none">
        {children}
      </ChatShell>
    </div>
  );
};

export default FullscreenChat;
