// DockedChat.tsx
// DOCKED RULE: Fixed right-side panel. Never draggable. Never fullscreen.
// CONSISTENCY RULE: All visual chrome lives in ChatShell.tsx — do not add colors,
// radius, shadows, or transitions here. This file owns positioning only.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatShell from './ChatShell';

interface DockedChatProps {
  children: React.ReactNode;
  isOpen: boolean;
}

const DockedChat = ({ children, isOpen }: DockedChatProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 464 }}
          animate={{ x: 0 }}
          exit={{ x: 464 }}
          transition={{ type: 'spring', stiffness: 300, damping: 35, mass: 0.9 }}
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            bottom: 16,
            width: 432,
            minWidth: 432,
            zIndex: 50,
          }}
        >
          <ChatShell
            boxShadow="0 8px 32px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.08)"
            style={{ borderRadius: 16 }}
          >
            {children}
          </ChatShell>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DockedChat;
