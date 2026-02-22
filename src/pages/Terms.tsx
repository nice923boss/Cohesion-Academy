import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function Terms() {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    supabase.from('site_settings').select('content').eq('key', 'terms').single()
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
          <h1 className="text-3xl font-bold mb-8 gold-gradient">{content.title}</h1>
          <div className="space-y-8 text-white/60 text-sm leading-relaxed">
            {content.sections?.map((section: any, idx: number) => (
              <section key={idx}>
                <h2 className="text-white text-lg font-bold mb-4">{section.title}</h2>
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </section>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
