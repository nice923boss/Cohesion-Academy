import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mail, MessageCircle, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Contact() {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    supabase.from('site_settings').select('content').eq('key', 'contact').single()
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
          <h1 className="text-4xl font-bold mb-12 gold-gradient text-center">{content.title}</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <a 
              href={content.email_url || `mailto:${content.email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center space-y-4 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gold group-hover:scale-110 transition-transform">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="font-bold">電子郵件</h3>
              <p className="text-white/40 text-sm">{content.email}</p>
            </a>
            <a 
              href={content.line_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center space-y-4 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#06C755]/10 flex items-center justify-center mx-auto text-[#06C755] group-hover:scale-110 transition-transform">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold">LINE 客服</h3>
              <p className="text-white/40 text-sm">ID: {content.line_id}</p>
            </a>
            <a 
              href={content.address_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center space-y-4 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gold group-hover:scale-110 transition-transform">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="font-bold">學院地址</h3>
              <p className="text-white/40 text-sm">{content.address}</p>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
