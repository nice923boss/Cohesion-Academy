import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, isSubscriptionActive } from '../lib/utils';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { CreditCard, Key, BookOpen, Settings, ShieldCheck, ExternalLink, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [membershipSteps, setMembershipSteps] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);

  const isActive = isSubscriptionActive(profile?.subscription_end || null);

  useEffect(() => {
    async function fetchData() {
      // Fetch settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'membership_steps')
        .single();
      
      if (settingsData) {
        setMembershipSteps(settingsData.content);
      }

      // Fetch favorites
      if (user) {
        const { data: favs } = await supabase
          .from('user_favorites')
          .select('*, course:courses(*, instructor:profiles(full_name))')
          .eq('user_id', user.id);
        if (favs) setFavorites(favs.map(f => f.course));
      }
    }
    fetchData();
  }, [user]);

  const handleInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', inviteCode)
        .eq('is_used', false)
        .single();

      if (error || !data) {
        throw new Error('無效或已使用的邀請碼');
      }

      // Update user role
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'instructor' })
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      // Mark code as used
      const { error: codeError } = await supabase.from('invitation_codes').update({ is_used: true }).eq('code', inviteCode);
      if (codeError) throw codeError;

      setMessage({ type: 'success', text: '成功！您現在是講師了。' });
      window.location.reload();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Profile Sidebar */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-3xl p-8"
          >
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 rounded-2xl gold-bg-gradient flex items-center justify-center text-navy-dark font-bold text-2xl">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile?.full_name}</h2>
                <span className="text-gold text-xs font-bold tracking-widest uppercase">
                  {profile?.role === 'admin' ? '管理員' : profile?.role === 'instructor' ? '講師' : '學員'}
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">會員狀態</span>
                <span className={isActive ? 'text-green-400' : 'text-red-400'}>
                  {isActive ? '已開通' : '尚未開通'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">到期日</span>
                <span className="text-white/80">{formatDate(profile?.subscription_end || null)}</span>
              </div>
            </div>
          </motion.div>

          {/* Instructor Invite Code */}
          {profile?.role === 'student' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-3xl p-8"
            >
              <div className="flex items-center space-x-2 mb-6">
                <Key className="w-5 h-5 text-gold" />
                <h3 className="font-bold">講師邀請碼</h3>
              </div>
              <form onSubmit={handleInviteCode} className="space-y-4">
                <input
                  type="text"
                  placeholder="輸入講師邀請碼"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-gold"
                />
                <button
                  disabled={loading}
                  className="w-full py-3 rounded-xl border border-gold text-gold text-sm font-bold hover:bg-gold hover:text-navy-dark transition-all"
                >
                  {loading ? '驗證中...' : '升級為講師'}
                </button>
                {message && (
                  <p className={cn("text-xs text-center", message.type === 'success' ? 'text-green-400' : 'text-red-400')}>
                    {message.text}
                  </p>
                )}
              </form>
            </motion.div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          {/* Payment Instructions */}
          {!isActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl p-8 md:p-12 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <CreditCard className="w-32 h-32" />
              </div>
              <h2 className="text-2xl font-bold mb-8 gold-gradient">
                {membershipSteps?.title || '購買年費會員'}
              </h2>
              <div className="space-y-6 text-white/70">
                <p className="font-medium text-white">
                  {membershipSteps?.subtitle || '請依照以下步驟開通權限：'}
                </p>
                {membershipSteps?.steps_rich ? (
                  <div 
                    className="prose prose-invert prose-sm max-w-none text-white/60"
                    dangerouslySetInnerHTML={{ __html: membershipSteps.steps_rich }}
                  />
                ) : (
                  <ol className="space-y-4 list-decimal list-inside">
                    {membershipSteps?.steps ? (
                      membershipSteps.steps.map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))
                    ) : (
                      <>
                        <li>點擊下方綠色按鈕加入好友</li>
                        <li>傳送訊息：<span className="text-gold font-bold">凝聚力學院</span></li>
                        <li>提供您的會員帳號名稱</li>
                        <li>管理員將提供年費 <span className="text-gold font-bold">500</span> 元付款連結，付款後將為您開通權限</li>
                      </>
                    )}
                  </ol>
                )}
                <div className="pt-6">
                  <a
                    href={membershipSteps?.line_url || "https://line.me/ti/p/3YAya5KQYr"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-8 py-3 rounded-full bg-[#06C755] text-white font-bold hover:scale-105 transition-transform"
                  >
                    <span>{membershipSteps?.button_text || '立即聯繫管理員'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {/* Favorites Section */}
          <section className="space-y-8">
            <div className="flex items-center space-x-4">
              <Heart className="w-6 h-6 text-gold" />
              <h2 className="text-2xl font-bold">我的收藏課程</h2>
            </div>
            {favorites.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center text-white/20">
                尚未收藏任何課程
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {favorites.map(course => (
                  <Link 
                    key={course.id} 
                    to={`/course/${course.id}`} 
                    className="block glass rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-gold/30 transition-all group"
                  >
                    <div className="aspect-video overflow-hidden">
                      <img src={course.thumbnail_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold mb-2 group-hover:text-gold transition-colors">{course.title}</h3>
                      <div className="flex items-center justify-between text-xs text-white/40">
                        <span>{course.instructor?.full_name}</span>
                        <span>{course.category}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div 
              onClick={() => window.location.href = '/courses'}
              className="glass rounded-3xl p-8 hover:border-gold/30 transition-colors cursor-pointer group"
            >
              <BookOpen className="w-8 h-8 text-gold mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold mb-2">我的學習</h3>
              <p className="text-white/40 text-sm">查看您已購買或收藏的課程內容。</p>
            </div>
            {profile?.role !== 'student' && (
              <div 
                onClick={() => window.location.href = '/management'}
                className="glass rounded-3xl p-8 hover:border-gold/30 transition-colors cursor-pointer group"
              >
                <Settings className="w-8 h-8 text-gold mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold mb-2">課程管理</h3>
                <p className="text-white/40 text-sm">管理您的課程、單元與測驗題目。</p>
              </div>
            )}
            {profile?.role === 'admin' && (
              <div 
                onClick={() => window.location.href = '/admin'}
                className="glass rounded-3xl p-8 hover:border-gold/30 transition-colors cursor-pointer group"
              >
                <ShieldCheck className="w-8 h-8 text-gold mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold mb-2">管理後台</h3>
                <p className="text-white/40 text-sm">管理使用者權限、活動與邀請碼。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
