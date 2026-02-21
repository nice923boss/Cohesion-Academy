import React from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../lib/supabase';
import { Eye, User } from 'lucide-react';
import { motion } from 'motion/react';

interface CourseCardProps {
  course: Course;
  key?: string | number;
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="glass rounded-2xl overflow-hidden group flex flex-col h-full"
    >
      <Link to={`/course/${course.id}`} className="relative aspect-video overflow-hidden block">
        <img
          src={course.thumbnail_url || 'https://picsum.photos/800/450'}
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="px-3 py-1 glass rounded-full text-[10px] font-bold text-gold uppercase tracking-widest">
            {course.category}
          </span>
          <span className={`px-3 py-1 glass rounded-full text-[10px] font-bold uppercase tracking-widest ${course.is_free ? 'text-green-400' : 'text-gold'}`}>
            {course.is_free ? '免費' : '付費'}
          </span>
        </div>
      </Link>
      
      <div className="p-6 flex flex-col flex-grow">
        <Link to={`/course/${course.id}`}>
          <h3 className="text-xl font-bold mb-3 group-hover:text-gold transition-colors line-clamp-1">
            {course.title}
          </h3>
        </Link>
        <p className="text-white/60 text-sm mb-6 line-clamp-2 flex-grow">
          {course.description}
        </p>
        
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center space-x-2 text-white/40 text-xs">
            <User className="w-3 h-3" />
            <span>{course.instructor?.full_name || '凝聚力導師'}</span>
          </div>
          <div className="flex items-center space-x-1 text-white/40 text-xs">
            <Eye className="w-3 h-3" />
            <span>{course.views} 次觀看</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
