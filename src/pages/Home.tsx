import React, { useEffect, useState } from 'react';
import { supabase, Course, Article } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import HeroSlider from '../components/HeroSlider';
import CourseCard from '../components/CourseCard';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Users, BookOpen, Heart, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const { user } = useAuth();
  const [hotCourses, setHotCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch hidden instructor IDs for logged-in user
      let hiddenInstructorIds: string[] = [];
      if (user) {
        const { data: hidden } = await supabase.from('hidden_instructors').select('instructor_id').eq('user_id', user.id);
        if (hidden) hiddenInstructorIds = hidden.map(h => h.instructor_id);
        setHiddenIds(hiddenInstructorIds);
      }

      const [hotRes, allRes, articleRes, userCountRes, courseCountRes] = await Promise.all([
        supabase
          .from('courses')
          .select('*, instructor:profiles(full_name)')
          .eq('is_published', true)
          .order('views', { ascending: false })
          .limit(4),
        supabase
          .from('courses')
          .select('*, instructor:profiles(full_name)')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('articles')
          .select('*, author:profiles(full_name)')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('is_published', true)
      ]);

      const filterHidden = (courses: Course[]) => courses.filter(c => !hiddenInstructorIds.includes(c.instructor_id));
      if (hotRes.data) setHotCourses(filterHidden(hotRes.data));
      if (allRes.data) setAllCourses(filterHidden(allRes.data));
      if (articleRes.data) setArticles(articleRes.data);
      if (userCountRes.count !== null) setUserCount(userCountRes.count);
      if (courseCountRes.count !== null) setCourseCount(courseCountRes.count);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  return (
    <div className="pb-20">
      <HeroSlider />

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="glass rounded-3xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold gold-gradient">{userCount}</p>
            <p className="text-white/40 text-xs mt-1 tracking-widest uppercase">已註冊會員</p>
          </div>
          <div>
            <p className="text-3xl font-bold gold-gradient">{courseCount}</p>
            <p className="text-white/40 text-xs mt-1 tracking-widest uppercase">免費課程</p>
          </div>
          <div>
            <p className="text-3xl font-bold gold-gradient">100%</p>
            <p className="text-white/40 text-xs mt-1 tracking-widest uppercase">完全免費</p>
          </div>
          <div>
            <p className="text-3xl font-bold gold-gradient">∞</p>
            <p className="text-white/40 text-xs mt-1 tracking-widest uppercase">知識共享</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        {/* Hot Courses */}
        <section className="mb-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="flex items-center space-x-2 text-gold mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold tracking-widest uppercase">Popular</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight">熱門課程</h2>
            </div>
            <Link to="/courses" className="text-white/40 hover:text-gold transition-colors flex items-center space-x-2 text-sm">
              <span>查看更多</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {hotCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>

        {/* Latest Articles */}
        {articles.length > 0 && (
          <section className="mb-24">
            <div className="flex items-end justify-between mb-12">
              <div>
                <div className="flex items-center space-x-2 text-gold mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-widest uppercase">Articles</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tight">最新文章</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {articles.map((article) => (
                <motion.div
                  key={article.id}
                  whileHover={{ y: -5 }}
                  className="glass rounded-2xl overflow-hidden group"
                >
                  {article.thumbnail_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={article.thumbnail_url}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-bold mb-2 group-hover:text-gold transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <div className="text-white/40 text-sm line-clamp-3 mb-4" dangerouslySetInnerHTML={{ __html: article.content }} />
                    <div className="flex items-center justify-between text-xs text-white/30">
                      <span>{article.author?.full_name || '凝聚力學院'}</span>
                      <span>{new Date(article.created_at).toLocaleDateString('zh-TW')}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* All Courses */}
        <section>
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="flex items-center space-x-2 text-gold mb-2">
                <span className="text-xs font-bold tracking-widest uppercase">Academy</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight">所有課程</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {allCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      </div>

      {/* CTA Section */}
      <section className="mt-32 px-4">
        <div className="max-w-5xl mx-auto glass rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full gold-bg-gradient opacity-5 -z-10" />
          <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">
            以 <span className="gold-gradient italic">共創與分享</span> 的精神
          </h2>
          <p className="text-white/60 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            凝聚力學院是一個完全免費的知識共享平台。我們相信知識的力量來自分享，每位講師都能在這裡免費上架課程，透過 Donate 機制獲得支持。一起讓學習沒有門檻。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="inline-block px-12 py-4 rounded-full gold-bg-gradient text-navy-dark font-bold text-lg hover:scale-105 transition-transform shadow-2xl shadow-gold/20"
            >
              免費加入會員
            </Link>
            <Link
              to="/courses"
              className="inline-block px-12 py-4 rounded-full border border-gold text-gold font-bold text-lg hover:bg-gold hover:text-navy-dark transition-all"
            >
              瀏覽課程
            </Link>
          </div>
        </div>
      </section>

      {/* Promote Section */}
      <section className="mt-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4 text-white/80">您也是專業人士嗎？</h3>
          <p className="text-white/40 mb-8 max-w-xl mx-auto">
            在凝聚力學院免費上架您的課程，讓更多人受益於您的專業知識。學員可以透過 Donate 連結自由贊助支持您。
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-3 rounded-full border border-white/20 text-white/60 font-bold text-sm hover:border-gold hover:text-gold transition-all"
          >
            成為講師 →
          </Link>
        </div>
      </section>
    </div>
  );
}
