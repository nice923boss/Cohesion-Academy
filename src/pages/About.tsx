import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { ExternalLink, Heart } from 'lucide-react';

export default function About() {
  const [content, setContent] = useState<any>(null);
  const [donateUrl, setDonateUrl] = useState<string>('');
  const [donateEmbed, setDonateEmbed] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      const [aboutRes, donateRes, embedRes] = await Promise.all([
        supabase.from('site_settings').select('content').eq('key', 'about').single(),
        supabase.from('site_settings').select('content').eq('key', 'site_donate_url').single(),
        supabase.from('site_settings').select('content').eq('key', 'site_donate_embed').single()
      ]);
      if (aboutRes.data) setContent(aboutRes.data.content);
      if (donateRes.data) setDonateUrl(donateRes.data.content?.url || '');
      if (embedRes.data) setDonateEmbed(embedRes.data.content?.html || '');
    }
    fetchData();
  }, []);

  if (!content) return <div className="pt-32 text-center text-white/20">載入中...</div>;

  return (
    <div className="pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[3rem] p-12 md:p-20"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-8 gold-gradient">{content.title}</h1>
          {content.body_html ? (
            <div
              className="rich-content text-white/70 leading-relaxed text-lg prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content.body_html }}
            />
          ) : (
            <div className="space-y-6 text-white/70 leading-relaxed text-lg whitespace-pre-wrap">
              {content.body}
            </div>
          )}
        </motion.div>

        {/* Site Donate Section */}
        {(donateUrl || donateEmbed) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-[3rem] p-12 text-center"
          >
            <Heart className="w-10 h-10 text-gold mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 gold-gradient">支持凝聚力學院</h2>
            <p className="text-white/60 mb-8 max-w-lg mx-auto">
              凝聚力學院是一個完全免費的知識共享平台。如果您認同我們的理念，歡迎透過贊助支持我們持續營運，讓更多人受益。
            </p>
            <div className="flex flex-col items-center space-y-4">
              {donateEmbed && (
                <div dangerouslySetInnerHTML={{ __html: donateEmbed }} />
              )}
              {donateUrl && (
                <a
                  href={donateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-10 py-4 rounded-full gold-bg-gradient text-navy-dark font-bold text-lg hover:scale-105 transition-transform shadow-2xl shadow-gold/20"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>贊助我們</span>
                </a>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
