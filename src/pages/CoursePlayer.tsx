import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Course, Unit, QuizQuestion } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { isSubscriptionActive } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Play, CheckCircle, Lock, ChevronRight, Trophy, ExternalLink, Heart } from 'lucide-react';

export default function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [membershipSteps, setMembershipSteps] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);

  const isActive = course?.is_free || isSubscriptionActive(profile?.subscription_end || null) || profile?.role === 'admin';

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'membership_steps')
        .single();
      
      if (data) {
        setMembershipSteps(data.content);
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    async function fetchCourseData() {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*, instructor:profiles(full_name)')
        .eq('id', id)
        .single();
      
      const { data: unitsData } = await supabase
        .from('units')
        .select('*')
        .eq('course_id', id)
        .order('order_index', { ascending: true });

      if (courseData) setCourse(courseData);
      if (unitsData) {
        setUnits(unitsData);
        setCurrentUnit(unitsData[0]);
      }
      setLoading(false);

      // Increment views
      if (courseData) {
        await supabase.from('courses').update({ views: courseData.views + 1 }).eq('id', id);
      }

      // Check if favorited
      if (user) {
        const { data: fav } = await supabase
          .from('user_favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .single();
        setIsFavorited(!!fav);
      }
    }
    fetchCourseData();
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!user) return alert('請先登入會員');
    
    if (isFavorited) {
      await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('course_id', id);
      setIsFavorited(false);
    } else {
      const { error } = await supabase.from('user_favorites').insert([{ user_id: user.id, course_id: id }]);
      if (error) {
        alert('收藏失敗，請確認資料庫是否有 user_favorites 表。');
      } else {
        setIsFavorited(true);
      }
    }
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUnit?.quiz_data) return;

    let score = 0;
    currentUnit.quiz_data.forEach((q, idx) => {
      if (quizAnswers[idx] === q.answer) score++;
    });

    setSubmitted(true);
    setQuizScore(Math.round((score / currentUnit.quiz_data.length) * 100));
  };

  if (loading) return <div className="pt-32 text-center">載入中...</div>;
  if (!course) return <div className="pt-32 text-center">找不到課程</div>;

  return (
    <div className="pt-20 min-h-screen bg-navy-dark">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 h-full">
        {/* Main Player Area */}
        <div className="lg:col-span-3 p-4 md:p-8">
          <div className="aspect-video w-full glass rounded-3xl overflow-hidden relative">
            {isActive ? (
              currentUnit?.youtube_id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${currentUnit.youtube_id}?rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allowFullScreen
                  title={currentUnit.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  尚未上傳影片內容
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black/80 p-8 text-center overflow-y-auto">
                <Lock className="w-12 h-12 text-gold mb-4" />
                <h3 className="text-xl font-bold mb-2">{membershipSteps?.title || '此內容僅限會員觀看'}</h3>
                <p className="text-white/60 mb-6 max-w-md text-sm">
                  {membershipSteps?.subtitle || '您需要開通年費會員權限才能觀看此課程的完整影片與測驗。'}
                </p>
                
                {membershipSteps?.steps && (
                  <ul className="text-left text-xs text-white/40 space-y-2 mb-8 max-w-xs mx-auto">
                    {membershipSteps.steps.map((step: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-gold font-bold">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/dashboard"
                    className="px-8 py-3 rounded-full border border-white/20 text-white font-bold text-sm hover:bg-white/5 transition-all"
                  >
                    前往個人中心
                  </Link>
                  <a
                    href={membershipSteps?.line_url || "https://line.me/ti/p/3YAya5KQYr"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-3 rounded-full bg-[#06C755] text-white font-bold text-sm hover:scale-105 transition-transform flex items-center space-x-2"
                  >
                    <span>{membershipSteps?.button_text || '立即聯繫管理員'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold">{currentUnit?.title || course.title}</h1>
              <button 
                onClick={toggleFavorite}
                className={cn(
                  "p-3 rounded-2xl transition-all border",
                  isFavorited ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/5 border-white/10 text-white/40 hover:text-gold"
                )}
              >
                <Heart className={cn("w-6 h-6", isFavorited && "fill-current")} />
              </button>
            </div>
            <div className="flex items-center space-x-4 text-white/40 text-sm mb-8">
              <Link to={`/instructor/${course.instructor_id}`} className="hover:text-gold transition-colors">
                導師: {course.instructor?.full_name}
              </Link>
              <span>•</span>
              <span>{course.category}</span>
            </div>
            
            <div className="glass rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-4">課程簡介</h3>
              <div 
                className="text-white/60 leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: course.description }}
              />
            </div>

            {/* Quiz System */}
            {isActive && currentUnit?.quiz_data && currentUnit.quiz_data.length > 0 && (
              <div className="mt-12 glass rounded-3xl p-8 md:p-12">
                <div className="flex items-center space-x-2 mb-8">
                  <CheckCircle className="w-6 h-6 text-gold" />
                  <h2 className="text-2xl font-bold">單元測驗</h2>
                </div>

                <form onSubmit={handleQuizSubmit} className="space-y-12">
                  {currentUnit.quiz_data.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-6">
                      <p className="text-lg font-medium">
                        {qIdx + 1}. {q.question}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, oIdx) => (
                          <label
                            key={oIdx}
                            className={cn(
                              "flex items-center p-4 rounded-xl border transition-all relative",
                              submitted 
                                ? oIdx === q.answer 
                                  ? "border-green-500 bg-green-500/10 text-green-400" 
                                  : quizAnswers[qIdx] === oIdx 
                                    ? "border-red-500 bg-red-500/10 text-red-400" 
                                    : "border-white/5 opacity-50"
                                : quizAnswers[qIdx] === oIdx
                                  ? "border-gold bg-gold/10 text-gold"
                                  : "border-white/10 bg-white/5 hover:border-white/30 cursor-pointer"
                            )}
                          >
                            <input
                              type="radio"
                              name={`q-${qIdx}`}
                              className="hidden"
                              disabled={submitted}
                              onChange={() => {
                                const newAnswers = [...quizAnswers];
                                newAnswers[qIdx] = oIdx;
                                setQuizAnswers(newAnswers);
                              }}
                            />
                            <span>{opt}</span>
                            {submitted && oIdx === q.answer && (
                              <span className="absolute right-4 text-[10px] font-bold uppercase tracking-widest text-green-400">正確答案</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="pt-8 flex items-center justify-between">
                    <button
                      type="submit"
                      className="px-12 py-4 rounded-xl gold-bg-gradient text-navy-dark font-bold text-lg hover:scale-105 transition-transform"
                    >
                      送出答案
                    </button>

                    <AnimatePresence>
                      {quizScore !== null && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center space-x-4"
                        >
                          <Trophy className="w-8 h-8 text-gold" />
                          <div>
                            <p className="text-sm text-white/40">您的得分</p>
                            <p className="text-3xl font-bold text-gold">{quizScore}%</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Playlist */}
        <div className="lg:border-l border-white/5 p-4 md:p-8 bg-navy-dark/50 overflow-y-auto max-h-screen">
          <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <Play className="w-4 h-4 text-gold" />
            <span>課程單元</span>
          </h3>
          <div className="space-y-4">
            {units.map((unit, idx) => (
              <button
                key={unit.id}
                onClick={() => {
                  setCurrentUnit(unit);
                  setQuizScore(null);
                  setSubmitted(false);
                  setQuizAnswers([]);
                }}
                className={cn(
                  "w-full text-left p-4 rounded-2xl transition-all group relative overflow-hidden",
                  currentUnit?.id === unit.id
                    ? "glass border-gold/50 text-gold"
                    : "hover:bg-white/5 text-white/60"
                )}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-xs font-mono opacity-40">{(idx + 1).toString().padStart(2, '0')}</span>
                  <span className="font-medium line-clamp-1">{unit.title}</span>
                </div>
                {currentUnit?.id === unit.id && (
                  <motion.div
                    layoutId="active-unit"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-gold"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
