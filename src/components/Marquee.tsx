import React, { useState, useEffect } from 'react';
import { X, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

const MARQUEE_STORAGE_KEY = 'cohesion_marquee_dismissed';

interface MarqueeDismissState {
  dismissedDate: string;   // YYYY-MM-DD format
  updatedAt: string;       // site_settings.updated_at value
}

export default function Marquee() {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dbUpdatedAt, setDbUpdatedAt] = useState<string>('');
  const [shouldShow, setShouldShow] = useState(true);

  // Fetch marquee messages from DB and check dismissal state
  useEffect(() => {
    async function fetchMessages() {
      const { data } = await supabase
        .from('site_settings')
        .select('content, updated_at')
        .eq('key', 'marquee_messages')
        .single();

      if (data?.content?.messages && Array.isArray(data.content.messages)) {
        const now = new Date();
        const active = data.content.messages.filter((m: any) => {
          if (!m.enabled || !m.text?.trim()) return false;
          if (m.start_date && new Date(m.start_date) > now) return false;
          if (m.end_date && new Date(m.end_date) < now) return false;
          return true;
        });

        if (active.length > 0) {
          setMessages(active.map((m: any) => m.text));
          const updatedAt = data.updated_at || '';
          setDbUpdatedAt(updatedAt);

          // Check localStorage to see if user already dismissed today
          const dismissed = getDismissState();
          if (dismissed) {
            const today = getTodayStr();
            // If dismissed today AND admin hasn't updated content → don't show
            if (dismissed.dismissedDate === today && dismissed.updatedAt === updatedAt) {
              setShouldShow(false);
              return;
            }
          }
          // Otherwise allow showing
          setShouldShow(true);
        }
      }

      // Fallback: if no messages in DB, use default
      if (!data?.content?.messages) {
        setMessages([
          '首頁活動輪播現正開放廣告合作！想讓更多人看見您的品牌嗎？歡迎聯繫網站管理員洽談廣告投放事宜。'
        ]);
        setShouldShow(true);
      }
    }
    fetchMessages();
  }, []);

  // Show after 15 seconds (only if shouldShow is true)
  useEffect(() => {
    if (messages.length === 0 || !shouldShow) return;
    const showTimer = setTimeout(() => setVisible(true), 15000);
    return () => clearTimeout(showTimer);
  }, [messages, shouldShow]);

  // Auto-rotate messages every 30 seconds while visible
  useEffect(() => {
    if (!visible || messages.length <= 1) return;
    const rotate = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % messages.length);
    }, 30000);
    return () => clearInterval(rotate);
  }, [visible, messages.length]);

  function handleDismiss() {
    setVisible(false);
    setShouldShow(false);
    // Save dismissal state to localStorage
    saveDismissState({
      dismissedDate: getTodayStr(),
      updatedAt: dbUpdatedAt,
    });
  }

  if (messages.length === 0) return null;

  const currentMessage = messages[currentIndex] || '';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-20 left-0 right-0 z-40 bg-gradient-to-r from-gold/90 to-[#B8860B]/90 backdrop-blur-sm text-navy-dark"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <Megaphone className="w-4 h-4 flex-shrink-0" />
              <div className="overflow-hidden whitespace-nowrap">
                <motion.p
                  key={currentIndex}
                  animate={{ x: ['0%', '-50%'] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="inline-block text-sm font-bold"
                >
                  {currentMessage}
                  &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
                  {currentMessage}
                </motion.p>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {messages.length > 1 && (
                <span className="text-[10px] font-bold opacity-60">
                  {currentIndex + 1}/{messages.length}
                </span>
              )}
              <button
                onClick={handleDismiss}
                className="ml-2 p-1 rounded-full hover:bg-navy-dark/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- localStorage helpers ---

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getDismissState(): MarqueeDismissState | null {
  try {
    const raw = localStorage.getItem(MARQUEE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDismissState(state: MarqueeDismissState) {
  try {
    localStorage.setItem(MARQUEE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage might be full or disabled
  }
}
