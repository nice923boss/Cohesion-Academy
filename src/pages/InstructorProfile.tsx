import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Profile } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, BookOpen, ArrowLeft } from 'lucide-react';

export default function InstructorProfile() {
  const { id } = useParams<{ id: string }>();
  const [instructor, setInstructor] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
    fetchInstructorData();
  }, [id]);

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
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section className="glass rounded-[3rem] p-12">
              <h2 className="text-2xl font-bold mb-8 gold-gradient">關於導師</h2>
              <div 
                className="text-white/60 leading-relaxed prose prose-invert max-w-none"
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
                  <Link key={course.id} to={`/course/${course.id}`} className="block glass rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-gold/30 transition-all">
                    <img src={course.thumbnail_url} className="w-full aspect-video object-cover" alt="" />
                    <div className="p-6">
                      <h3 className="font-bold mb-2">{course.title}</h3>
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
