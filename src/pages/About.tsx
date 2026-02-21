import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function About() {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    supabase.from('site_settings').select('content').eq('key', 'about').single()
      .then(({ data }) => {
        if (data) setContent(data.content);
      });
  }, []);

  if (!content) return <div className="pt-32 text-center text-white/20">載入中...</div>;

  return (
    <div className="pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[3rem] p-12 md:p-20"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-8 gold-gradient">{content.title}</h1>
          <div className="space-y-6 text-white/70 leading-relaxed text-lg whitespace-pre-wrap">
            {content.body}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
