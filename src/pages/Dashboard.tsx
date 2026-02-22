import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/utils';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Key, BookOpen, Settings, ShieldCheck, Heart, Star, EyeOff, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favoriteInstructors, setFavoriteInstructors] = useState<any[]>([]);
  const [hiddenInstructors, setHiddenInstructors] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      // Fetch favorite courses
      const { data: favs } = await supabase
        .from('user_favorites')
        .select('*, course:courses(*, instructor:profiles(full_name))')
        .eq('user_id', user.id);
      if (favs) setFavorites(favs.map(f => f.course).filter(Boolean));

      // Fetch favorite instructors
      const { data: favInstructors } = await supabase
        .from('instructor_favorites')
        .select('*, instructor:profiles(id, full_name, avatar_url, bio)')
        .eq('user_id', user.id);
      if (favInstructors) setFavoriteInstructors(favInstructors.map(f => f.instructor).filter(Boolean));

      // Fetch hidden instructors
      const { data: hidden } = await supabase
        .from('hidden_instructors')
        .select('*, instructor:profiles!hidden_instructors_instructor_id_fkey(id, full_name, avatar_url)')
        .eq('user_id', user.id);
      if (hidden) setHiddenInstructors(hidden.map(h => ({ ...h.instructor, hidden_id: h.id })).filter(Boolean));
    }
    fetchData();
  }, [user]);

  const unhideInstructor = async (instructorId: string) => {
    if (!user) return;
    await supabase.from('hidden_instructors').delete().eq('user_id', user.id).eq('instructor_id', instructorId);
    setHiddenInstructors(prev => prev.filter(i => i.id !== instructorId));
  };

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
            <Link to={`/instructor/${profile?.id}`} className="flex items-center space-x-4 mb-8 group">
              <div className="w-16 h-16 rounded-2xl overflow-hidden gold-bg-gradient flex items-center justify-center text-navy-dark font-bold text-2xl">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name} />
                ) : (
                  profile?.full_name?.charAt(0) || 'U'
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold group-hover:text-gold transition-colors">{profile?.full_name}</h2>
                <span className="text-gold text-xs font-bold tracking-widest uppercase">
                  {profile?.role === 'admin' ? '管理員' : profile?.role === 'instructor' ? '講師' : '學員'}
                </span>
              </div>
            </Link>

            <div className="space-y-4 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">會員狀態</span>
                <span className="text-green-400">已開通</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">加入日期</span>
                <span className="text-white/80">{formatDate(profile?.created_at || null)}</span>
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
          {/* Favorite Courses */}
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

          {/* Favorite Instructors */}
          <section className="space-y-8">
            <div className="flex items-center space-x-4">
              <Star className="w-6 h-6 text-gold" />
              <h2 className="text-2xl font-bold">收藏的講師</h2>
            </div>
            {favoriteInstructors.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center text-white/20">
                尚未收藏任何講師
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {favoriteInstructors.map(instructor => (
                  <Link
                    key={instructor.id}
                    to={`/instructor/${instructor.id}`}
                    className="glass rounded-2xl p-6 text-center hover:border-gold/30 transition-all group border border-white/5"
                  >
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 overflow-hidden gold-bg-gradient p-0.5">
                      <div className="w-full h-full rounded-[14px] bg-navy-dark overflow-hidden flex items-center justify-center">
                        {instructor.avatar_url ? (
                          <img src={instructor.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-gold font-bold text-lg">{instructor.full_name?.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                    <h4 className="font-bold group-hover:text-gold transition-colors">{instructor.full_name}</h4>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Hidden Instructors */}
          <section className="space-y-8">
            <div className="flex items-center space-x-4">
              <EyeOff className="w-6 h-6 text-orange-400" />
              <h2 className="text-2xl font-bold">已隱藏的講師</h2>
            </div>
            {hiddenInstructors.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-center text-white/20 text-sm">
                您沒有隱藏任何講師
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {hiddenInstructors.map(instructor => (
                  <div key={instructor.id} className="glass rounded-2xl p-6 text-center border border-white/5">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 overflow-hidden bg-white/5 flex items-center justify-center">
                      {instructor.avatar_url ? (
                        <img src={instructor.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-white/40 font-bold">{instructor.full_name?.charAt(0)}</span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm mb-3 text-white/60">{instructor.full_name}</h4>
                    <button
                      onClick={() => unhideInstructor(instructor.id)}
                      className="flex items-center justify-center space-x-2 w-full px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-all text-xs font-bold"
                    >
                      <Eye className="w-3 h-3" />
                      <span>解除隱藏</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link
              to="/courses"
              className="glass rounded-3xl p-8 hover:border-gold/30 transition-colors group border border-white/5"
            >
              <BookOpen className="w-8 h-8 text-gold mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold mb-2">探索課程</h3>
              <p className="text-white/40 text-sm">瀏覽所有免費課程，開始您的學習旅程。</p>
            </Link>
            {profile?.role !== 'student' && (
              <Link
                to="/management"
                className="glass rounded-3xl p-8 hover:border-gold/30 transition-colors group border border-white/5"
              >
                <Settings className="w-8 h-8 text-gold mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold mb-2">課程管理</h3>
                <p className="text-white/40 text-sm">管理您的課程、單元與測驗題目。</p>
              </Link>
            )}
            {profile?.role === 'admin' && (
              <Link
                to="/admin"
                className="glass rounded-3xl p-8 hover:border-gold/30 transition-colors group border border-white/5"
              >
                <ShieldCheck className="w-8 h-8 text-gold mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold mb-2">管理後台</h3>
                <p className="text-white/40 text-sm">管理使用者權限、活動與邀請碼。</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
