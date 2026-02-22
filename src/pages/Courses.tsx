import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Play, Users, Search } from 'lucide-react';

export default function Courses() {
  const { user } = useAuth();
  const location = useLocation();
  const [courses, setCourses] = useState<any[]>([]);
  const [hiddenInstructorIds, setHiddenInstructorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');

  const categories = ['全部', ...Array.from(new Set(courses.map(c => c.category).filter(Boolean)))];

  useEffect(() => {
    fetchCourses();
  }, [user, location.key]);

  async function fetchCourses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*, instructor:profiles(full_name)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    if (data) setCourses(data);

    // Fetch hidden instructors for logged-in user
    if (user) {
      const { data: hidden } = await supabase
        .from('hidden_instructors')
        .select('instructor_id')
        .eq('user_id', user.id);
      if (hidden) setHiddenInstructorIds(hidden.map(h => h.instructor_id));
    }

    setLoading(false);
  }

  const filteredCourses = courses.filter(course => {
    // Filter out hidden instructors
    if (hiddenInstructorIds.includes(course.instructor_id)) return false;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '全部' || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="pt-32 text-center text-white/20">載入中...</div>;

  return (
    <div className="pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold gold-gradient tracking-tight">探索所有課程</h1>
          <p className="text-white/40 max-w-2xl mx-auto">
            凝聚力學院所有課程完全免費！由各領域專業講師共創分享，一起讓學習沒有門檻。
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between glass p-6 rounded-[2rem]">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  selectedCategory === cat
                  ? 'bg-gold text-navy-dark'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="搜尋課程..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-32 glass rounded-[3rem]">
            <p className="text-white/20">找不到符合條件的課程</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative"
              >
                <Link to={`/course/${course.id}`} className="block glass rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-gold/30 transition-all duration-500">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={course.thumbnail_url || `https://picsum.photos/seed/${course.id}/800/450`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={course.title}
                    />
                    <div className="absolute inset-0 bg-navy-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center text-navy-dark scale-75 group-hover:scale-100 transition-transform duration-500">
                        <Play className="w-8 h-8 fill-current" />
                      </div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-navy-dark/60 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase text-gold border border-gold/20">
                        {course.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-xl font-bold mb-3 group-hover:text-gold transition-colors line-clamp-1">{course.title}</h3>
                    <p className="text-white/40 text-sm line-clamp-2 mb-6 leading-relaxed h-10">
                      {course.description?.replace(/<[^>]*>/g, '') || ''}
                    </p>
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full gold-bg-gradient flex items-center justify-center text-navy-dark text-[10px] font-bold">
                          {course.instructor?.full_name?.charAt(0) || 'I'}
                        </div>
                        <span className="text-xs text-white/60">{course.instructor?.full_name || '講師'}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-white/20 text-[10px] font-bold tracking-widest uppercase">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{course.views || 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
