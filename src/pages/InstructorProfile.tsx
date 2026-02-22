import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { User, BookOpen, ArrowLeft, ExternalLink, Star, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';

export default function InstructorProfile() {
  const { id } = useParams<{ id: string }>();
  const { user, profile: currentUserProfile } = useAuth();
  const [instructor, setInstructor] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [hiddenCount, setHiddenCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchInstructorData() {
      setLoading(true);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (profileData) setInstructor(profileData);
      if (coursesData) setCourses(coursesData);

      // Check favorite & hidden status
      if (user) {
        const [favRes, hiddenRes] = await Promise.all([
          supabase.from('instructor_favorites').select('*').eq('user_id', user.id).eq('instructor_id', id).single(),
          supabase.from('hidden_instructors').select('*').eq('user_id', user.id).eq('instructor_id', id).single()
        ]);
        setIsFavorited(!!favRes.data);
        setIsHidden(!!hiddenRes.data);
      }

      setLoading(false);
    }
    fetchInstructorData();
  }, [id, user]);

  // Fetch hidden count for admins only
  useEffect(() => {
    async function fetchHiddenCount() {
      if (currentUserProfile?.role !== 'admin' || !id) return;
      const { count } = await supabase
        .from('hidden_instructors')
        .select('*', { count: 'exact', head: true })
        .eq('instructor_id', id);
      setHiddenCount(count);
    }
    fetchHiddenCount();
  }, [id, currentUserProfile]);

  const toggleFavorite = async () => {
    if (!user) return alert('請先登入會員');
    if (isFavorited) {
      await supabase.from('instructor_favorites').delete().eq('user_id', user.id).eq('instructor_id', id);
      setIsFavorited(false);
    } else {
      const { error } = await supabase.from('instructor_favorites').insert([{ user_id: user.id, instructor_id: id }]);
      if (!error) setIsFavorited(true);
    }
  };

  const toggleHidden = async () => {
    if (!user) return alert('請先登入會員');
    if (isHidden) {
      await supabase.from('hidden_instructors').delete().eq('user_id', user.id).eq('instructor_id', id);
      setIsHidden(false);
    } else {
      if (!confirm('確定要隱藏這位講師嗎？隱藏後您將不會在瀏覽頁面看到這位講師的課程。您可以在個人中心解除隱藏。')) return;
      const { error } = await supabase.from('hidden_instructors').insert([{ user_id: user.id, instructor_id: id }]);
      if (!error) setIsHidden(true);
    }
  };

  if (loading) return <div className="pt-32 text-center text-white/40">載入中...</div>;
  if (!instructor) return <div className="pt-32 text-center text-white/40">找不到講師資料</div>;

  return (
    <div className="pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <Link to="/courses" className="inline-flex items-center space-x-2 text-white/40 hover:text-gold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>返回課程列表</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Profile Sidebar */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-[3rem] p-12 text-center"
            >
              <div className="w-32 h-32 rounded-[2.5rem] mx-auto mb-8 overflow-hidden gold-bg-gradient p-1">
                <div className="w-full h-full rounded-[2.2rem] bg-navy-dark overflow-hidden flex items-center justify-center">
                  {instructor.avatar_url ? (
                    <img src={instructor.avatar_url} className="w-full h-full object-cover" alt={instructor.full_name} />
                  ) : (
                    <User className="w-12 h-12 text-gold" />
                  )}
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-2">{instructor.full_name}</h1>
              <span className="text-gold text-xs font-bold tracking-widest uppercase bg-gold/10 px-4 py-1 rounded-full">
                專業導師
              </span>

              {/* Admin-only: Hidden count badge */}
              {currentUserProfile?.role === 'admin' && hiddenCount !== null && (
                <div className="mt-4">
                  <span className="inline-flex items-center space-x-1 text-xs px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    <EyeOff className="w-3 h-3" />
                    <span>被 {hiddenCount} 位會員隱藏</span>
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                {instructor.donate_url && (
                  <a
                    href={instructor.donate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 w-full px-6 py-3 rounded-2xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold hover:text-navy-dark transition-all font-bold text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>贊助講師</span>
                  </a>
                )}
                {/* Instructor embedded donate button */}
                {(instructor as any).donate_embed && (
                  <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: (instructor as any).donate_embed }} />
                )}
                {user && (
                  <div className="flex space-x-3">
                    <button
                      onClick={toggleFavorite}
                      className={cn(
                        "flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl transition-all border text-sm font-bold",
                        isFavorited ? "bg-gold/10 border-gold/30 text-gold" : "bg-white/5 border-white/10 text-white/40 hover:text-gold hover:border-gold/30"
                      )}
                    >
                      <Star className={cn("w-4 h-4", isFavorited && "fill-current")} />
                      <span>{isFavorited ? '已收藏' : '收藏'}</span>
                    </button>
                    <button
                      onClick={toggleHidden}
                      className={cn(
                        "flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl transition-all border text-sm",
                        isHidden ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-white/5 border-white/10 text-white/40 hover:text-orange-400"
                      )}
                      title={isHidden ? '解除隱藏' : '隱藏講師'}
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section className="glass rounded-[3rem] p-12">
              <h2 className="text-2xl font-bold mb-8 gold-gradient">關於導師</h2>
              <div
                className="rich-content text-white/60 leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: instructor.bio || '這位導師很低調，尚未填寫個人簡介。' }}
              />
            </section>

            <section className="space-y-8">
              <div className="flex items-center space-x-4">
                <BookOpen className="w-6 h-6 text-gold" />
                <h2 className="text-2xl font-bold">導師開課 ({courses.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {courses.map(course => (
                  <Link key={course.id} to={`/course/${course.id}`} className="block glass rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-gold/30 transition-all group">
                    <img src={course.thumbnail_url} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    <div className="p-6">
                      <h3 className="font-bold mb-2 group-hover:text-gold transition-colors">{course.title}</h3>
                      <div className="flex items-center justify-between text-xs text-white/40">
                        <span>{course.category}</span>
                        <span>{course.views} 次觀看</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
