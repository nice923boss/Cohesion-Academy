import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, User } from 'lucide-react';

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      setLoading(true);
      const { data } = await supabase
        .from('articles')
        .select('*, author:profiles(full_name, avatar_url)')
        .eq('id', id)
        .single();
      if (data) setArticle(data);
      setLoading(false);
    }
    fetchArticle();
  }, [id]);

  if (loading) return <div className="pt-32 text-center text-white/40">載入中...</div>;
  if (!article) return <div className="pt-32 text-center text-white/40">找不到此文章</div>;

  return (
    <div className="pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link to="/" className="inline-flex items-center space-x-2 text-white/40 hover:text-gold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>返回首頁</span>
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[3rem] overflow-hidden"
        >
          {article.thumbnail_url && (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={article.thumbnail_url}
                alt={article.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="p-10 md:p-16 space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold gold-gradient leading-tight">
                {article.title}
              </h1>
              <div className="flex items-center space-x-6 text-sm text-white/40">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>{article.author?.full_name || '凝聚力學院'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(article.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5" />

            <div
              className="rich-content prose prose-invert prose-lg max-w-none text-white/70 leading-relaxed
                prose-headings:text-white prose-headings:font-bold
                prose-strong:text-white
                prose-a:text-gold prose-a:no-underline hover:prose-a:underline
                prose-li:text-white/60"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </motion.article>
      </div>
    </div>
  );
}
