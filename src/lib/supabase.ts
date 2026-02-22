/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

// Lazy-initialized Supabase client using a Proxy
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_supabase) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
        throw new Error('Supabase URL and Anon Key are required. Please check your environment variables.');
      }
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return (_supabase as any)[prop];
  }
});

export type UserRole = 'student' | 'instructor' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  donate_url?: string;
  donate_embed?: string;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  category: string;
  instructor_id: string;
  views: number;
  is_published: boolean;
  created_at: string;
  instructor?: Profile;
}

export interface Unit {
  id: string;
  course_id: string;
  title: string;
  youtube_id: string;
  order_index: number;
  quiz_data: QuizQuestion[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

export interface Event {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  thumbnail_url?: string;
  author_id: string;
  is_published: boolean;
  created_at: string;
  author?: Profile;
}

export interface HiddenInstructor {
  id: string;
  user_id: string;
  instructor_id: string;
  created_at: string;
  instructor?: Profile;
}
