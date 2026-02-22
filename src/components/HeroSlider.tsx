import React, { useEffect, useState } from 'react';
import { supabase, Event } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function HeroSlider() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data) {
        const now = new Date();
        const filtered = data.filter(event => {
          if (event.start_date && new Date(event.start_date) > now) return false;
          if (event.end_date && new Date(event.end_date) < now) return false;
          return true;
        });
        setEvents(filtered);
      }
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [events]);

  if (events.length === 0) return null;

  return (
    <div className="relative h-[70vh] w-full overflow-hidden" id="events">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-navy-dark via-transparent to-navy-dark/50 z-10" />
          <img
            src={events[currentIndex].image_url || 'https://picsum.photos/1920/1080'}
            alt={events[currentIndex].title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-20 left-0 right-0 z-20 px-8 max-w-7xl mx-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-gold font-bold tracking-widest uppercase text-sm mb-4 block">最新活動</span>
              <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
                {events[currentIndex].title}
              </h2>
              <a
                href={events[currentIndex].link_url}
                className="inline-block px-8 py-3 border border-gold text-gold hover:bg-gold hover:text-navy-dark transition-all font-bold tracking-widest"
              >
                立即查看
              </a>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-10 right-10 z-30 flex space-x-4">
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + events.length) % events.length)}
          className="p-3 glass rounded-full hover:bg-gold/20 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % events.length)}
          className="p-3 glass rounded-full hover:bg-gold/20 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
