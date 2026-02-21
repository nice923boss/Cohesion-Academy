import React, { useEffect, useState } from 'react';
import { supabase, Course } from '../lib/supabase';
import HeroSlider from '../components/HeroSlider';
import CourseCard from '../components/CourseCard';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [hotCourses, setHotCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: hot } = await supabase
        .from('courses')
        .select('*, instructor:profiles(full_name)')
        .eq('is_published', true)
        .order('views', { ascending: false })
        .limit(4);
      
      const { data: all } = await supabase
        .from('courses')
        .select('*, instructor:profiles(full_name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (hot) setHotCourses(hot);
      if (all) setAllCourses(all);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="pb-20">
      <HeroSlider />

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
            開啟您的 <span className="gold-gradient italic">學習 </span> 之旅
          </h2>
          <p className="text-white/60 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            加入凝聚力學院，探索由頂尖導師打造的專業課程。引領您走向卓越。
          </p>
          <Link
            to="/login"
            className="inline-block px-12 py-4 rounded-full gold-bg-gradient text-navy-dark font-bold text-lg hover:scale-105 transition-transform shadow-2xl shadow-gold/20"
          >
            立即加入會員
          </Link>
        </div>
      </section>
    </div>
  );
}
