import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit, Save, X, BookOpen, Video, UserCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { quillModules, quillFormats, blockBase64Images } from '../lib/quillConfig';

export default function CourseManagement() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', thumbnail_url: '', category: '' });

  // Unit Management State
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedCourseForUnits, setSelectedCourseForUnits] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [newUnit, setNewUnit] = useState({ title: '', youtube_id: '', order_index: 0, quiz_data: [] as any[] });
  const [showQuizEditor, setShowQuizEditor] = useState(false);
  const [editingQuizUnit, setEditingQuizUnit] = useState<any>(null);
  const [instructorProfile, setInstructorProfile] = useState({ bio: '', avatar_url: '', donate_url: '', donate_embed: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchCourses();
      fetchInstructorProfile();
    }
  }, [profile]);

  async function fetchInstructorProfile() {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('bio, avatar_url, donate_url, donate_embed')
        .eq('id', profile.id)
        .single();
      if (data) {
        setInstructorProfile({
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          donate_url: data.donate_url || '',
          donate_embed: data.donate_embed || ''
        });
      }
    } catch (err) {
      console.error('Error fetching instructor profile:', err);
    }
  }

  async function handleUpdateProfile() {
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update(instructorProfile)
      .eq('id', profile?.id);

    if (error) alert('更新失敗：' + error.message);
    else alert('個人檔案更新成功！');
    setSavingProfile(false);
  }

  async function fetchCourses() {
    setLoading(true);
    try {
      let query = supabase.from('courses').select('*').order('created_at', { ascending: false });
      if (profile?.role === 'instructor') {
        query = query.eq('instructor_id', profile.id);
      }
      const { data } = await query;
      if (data) setCourses(data);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCourse() {
    if (editingCourse) {
      const { error } = await supabase.from('courses').update({
        title: newCourse.title,
        description: newCourse.description,
        thumbnail_url: newCourse.thumbnail_url,
        category: newCourse.category,
      }).eq('id', editingCourse.id);
      if (error) alert(error.message);
      else { setEditingCourse(null); setShowCourseModal(false); fetchCourses(); }
    } else {
      const { error } = await supabase.from('courses').insert([{ ...newCourse, instructor_id: profile?.id }]);
      if (error) alert(error.message);
      else { setShowCourseModal(false); setNewCourse({ title: '', description: '', thumbnail_url: '', category: '' }); fetchCourses(); }
    }
  }

  async function openEditModal(course: any) {
    setEditingCourse(course);
    setNewCourse({ title: course.title, description: course.description, thumbnail_url: course.thumbnail_url, category: course.category });
    setShowCourseModal(true);
  }

  async function openUnitModal(course: any) {
    setSelectedCourseForUnits(course);
    const { data } = await supabase.from('units').select('*').eq('course_id', course.id).order('order_index', { ascending: true });
    if (data) setUnits(data);
    setShowUnitModal(true);
  }

  async function handleAddUnit() {
    const { error } = await supabase.from('units').insert([{ ...newUnit, course_id: selectedCourseForUnits.id }]);
    if (error) alert(error.message);
    else {
      setNewUnit({ title: '', youtube_id: '', order_index: units.length + 1, quiz_data: [] });
      const { data } = await supabase.from('units').select('*').eq('course_id', selectedCourseForUnits.id).order('order_index', { ascending: true });
      if (data) setUnits(data);
    }
  }

  async function handleUpdateQuiz() {
    const { error } = await supabase.from('units').update({ quiz_data: editingQuizUnit.quiz_data }).eq('id', editingQuizUnit.id);
    if (error) alert(error.message);
    else {
      setShowQuizEditor(false);
      const { data } = await supabase.from('units').select('*').eq('course_id', selectedCourseForUnits.id).order('order_index', { ascending: true });
      if (data) setUnits(data);
    }
  }

  async function handleDeleteUnit(id: string) {
    await supabase.from('units').delete().eq('id', id);
    const { data } = await supabase.from('units').select('*').eq('course_id', selectedCourseForUnits.id).order('order_index', { ascending: true });
    if (data) setUnits(data);
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm('確定要刪除此課程嗎？這將會連同所有單元一起刪除。')) return;
    await supabase.from('courses').delete().eq('id', id);
    fetchCourses();
  }

  async function togglePublish(id: string, currentStatus: boolean) {
    const { data, error } = await supabase
      .from('courses')
      .update({ is_published: !currentStatus })
      .eq('id', id)
      .select();

    if (error) {
      alert('發佈狀態更新失敗：' + error.message);
    } else if (!data || data.length === 0) {
      alert('發佈狀態更新失敗：權限不足或課程不存在。\n\n可能原因：\n1. 請確認您的帳號角色為 instructor 或 admin\n2. 請確認 Supabase 中 courses 資料表的 RLS 政策已正確設定\n\n請到 Supabase Dashboard → SQL Editor 執行 RLS 修復腳本。');
    }
    fetchCourses();
  }

  if (loading) return <div className="pt-32 text-center text-white/40">載入中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-32 space-y-12">
      {/* Original Content Warning */}
      <div className="glass rounded-2xl p-6 border border-orange-500/20 bg-orange-500/5">
        <div className="flex items-start space-x-4">
          <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-orange-400 mb-1">原創內容聲明</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              請確保您上傳的所有課程內容均為您的原創作品或已取得合法授權。未經授權使用他人內容將違反本平台服務條款，管理員有權移除相關課程。
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold gold-gradient mb-2">課程管理</h1>
          <p className="text-white/40">管理您的教學內容、單元與發佈狀態</p>
        </div>
        <button
          onClick={() => { setEditingCourse(null); setNewCourse({ title: '', description: '', thumbnail_url: '', category: '' }); setShowCourseModal(true); }}
          className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gold text-navy-dark font-bold hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>建立新課程</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {courses.map(course => (
              <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="glass rounded-3xl overflow-hidden border border-white/5 flex flex-col">
                <div className="relative aspect-video">
                  <img src={course.thumbnail_url || 'https://picsum.photos/seed/course/800/450'} className="w-full h-full object-cover" alt="" />
                  <div className="absolute top-4 right-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase", course.is_published ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40")}>
                      {course.is_published ? '已發佈' : '草稿'}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold mb-2">{course.title}</h3>
                  <p className="text-white/40 text-sm line-clamp-2 mb-6">{course.description?.replace(/<[^>]*>/g, '')}</p>
                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex space-x-2">
                      <button onClick={() => togglePublish(course.id, course.is_published)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors" title={course.is_published ? "下架" : "發佈"}>
                        <BookOpen className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEditModal(course)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors" title="編輯課程">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => openUnitModal(course)} className="p-2 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold transition-colors" title="管理單元">
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={() => handleDeleteCourse(course.id)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Instructor Profile Sidebar */}
        <div className="space-y-8">
          <section className="glass rounded-3xl p-8 space-y-6">
            <div className="flex items-center space-x-2 text-gold mb-2">
              <UserCircle className="w-5 h-5" />
              <h2 className="text-xl font-bold">講師個人檔案</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">頭像 URL</label>
                <input type="text" value={instructorProfile.avatar_url} onChange={e => setInstructorProfile({...instructorProfile, avatar_url: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm" placeholder="圖片連結" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">Donate 贊助連結</label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input type="text" value={instructorProfile.donate_url} onChange={e => setInstructorProfile({...instructorProfile, donate_url: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 focus:border-gold outline-none text-sm" placeholder="例如：https://www.buymeacoffee.com/..." />
                </div>
                <p className="text-[10px] text-white/30 mt-1 ml-1">學員可以透過此連結自由贊助您</p>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">Donate 內嵌按鈕 HTML（選填）</label>
                <textarea
                  value={instructorProfile.donate_embed}
                  onChange={e => setInstructorProfile({...instructorProfile, donate_embed: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-xs font-mono min-h-[80px]"
                  placeholder="貼上贊助平台提供的內嵌 HTML 碼..."
                />
                <p className="text-[10px] text-white/30 mt-1 ml-1">可貼上贊助平台提供的內嵌按鈕 HTML，將顯示在您的講師頁面與課程頁面</p>
                {instructorProfile.donate_embed && (
                  <div className="mt-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">預覽</p>
                    <div dangerouslySetInnerHTML={{ __html: instructorProfile.donate_embed }} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">個人簡介</label>
                <div className="quill-dark">
                  <ReactQuill ref={(el: any) => { if (el) blockBase64Images(el); }} theme="snow" value={instructorProfile.bio} onChange={val => setInstructorProfile({...instructorProfile, bio: val})} modules={quillModules} formats={quillFormats} placeholder="介紹一下您自己..." />
                </div>
              </div>
              <button onClick={handleUpdateProfile} disabled={savingProfile}
                className="w-full py-3 rounded-xl bg-gold text-navy-dark font-bold hover:scale-105 transition-all disabled:opacity-50">
                {savingProfile ? '儲存中...' : '儲存檔案'}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-8 rounded-3xl w-full max-w-xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold gold-gradient">{editingCourse ? '編輯課程' : '建立新課程'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">課程標題</label>
                <input type="text" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">課程類別</label>
                <input type="text" value={newCourse.category} onChange={e => setNewCourse({...newCourse, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none" placeholder="例如：專業技術、設計美學..." />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">課程介紹</label>
                <div className="quill-dark">
                  <ReactQuill ref={(el: any) => { if (el) blockBase64Images(el); }} theme="snow" value={newCourse.description} onChange={val => setNewCourse({...newCourse, description: val})} modules={quillModules} formats={quillFormats} placeholder="課程詳細介紹..." />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">封面圖片 URL</label>
                <input type="text" value={newCourse.thumbnail_url} onChange={e => setNewCourse({...newCourse, thumbnail_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none" />
              </div>
            </div>
            <div className="flex space-x-4">
              <button onClick={() => setShowCourseModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">取消</button>
              <button onClick={handleSaveCourse} className="flex-1 py-3 rounded-xl bg-gold text-navy-dark font-bold hover:scale-105 transition-all">
                {editingCourse ? '儲存變更' : '確認建立'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-8 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-8 custom-scrollbar">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold gold-gradient">單元管理：{selectedCourseForUnits?.title}</h3>
              <button onClick={() => setShowUnitModal(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-sm font-bold text-gold uppercase tracking-widest">新增單元</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="單元名稱" value={newUnit.title} onChange={e => setNewUnit({...newUnit, title: e.target.value})} className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm" />
                <input type="number" placeholder="排序" value={newUnit.order_index} onChange={e => setNewUnit({...newUnit, order_index: parseInt(e.target.value)})} className="bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm" />
                <input type="text" placeholder="YouTube 影片 ID (例如: dQw4w9WgXcQ)" value={newUnit.youtube_id} onChange={e => setNewUnit({...newUnit, youtube_id: e.target.value})} className="md:col-span-3 bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm" />
              </div>
              <button onClick={handleAddUnit} className="w-full py-3 rounded-xl bg-gold/10 text-gold font-bold hover:bg-gold hover:text-navy-dark transition-all">新增單元</button>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">現有單元</h4>
              {units.length === 0 ? <p className="text-center py-8 text-white/20">尚未建立任何單元</p> : (
                <div className="space-y-2">
                  {units.map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-4">
                        <span className="text-gold font-mono text-xs">#{unit.order_index}</span>
                        <div>
                          <p className="font-bold text-sm">{unit.title}</p>
                          <p className="text-xs text-white/40">YouTube ID: {unit.youtube_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => { setEditingQuizUnit(unit); setShowQuizEditor(true); }} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold hover:text-navy-dark transition-all text-xs font-bold">
                          編輯測驗 ({unit.quiz_data?.length || 0})
                        </button>
                        <button onClick={() => handleDeleteUnit(unit.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Quiz Editor Modal */}
      {showQuizEditor && editingQuizUnit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-dark/90 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-8 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-8 custom-scrollbar">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold gold-gradient">編輯單元測驗：{editingQuizUnit?.title}</h3>
              <button onClick={() => setShowQuizEditor(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-6">
              {editingQuizUnit.quiz_data?.map((q: any, qIdx: number) => (
                <div key={qIdx} className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4 relative">
                  <button onClick={() => { const d = [...editingQuizUnit.quiz_data]; d.splice(qIdx, 1); setEditingQuizUnit({...editingQuizUnit, quiz_data: d}); }} className="absolute top-4 right-4 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block">問題 {qIdx + 1}</label>
                    <input type="text" value={q.question} onChange={e => { const d = [...editingQuizUnit.quiz_data]; d[qIdx].question = e.target.value; setEditingQuizUnit({...editingQuizUnit, quiz_data: d}); }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm" placeholder="請輸入問題內容" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt: string, oIdx: number) => (
                      <div key={oIdx} className="flex items-center space-x-2">
                        <input type="radio" name={`correct-${qIdx}`} checked={q.answer === oIdx} onChange={() => { const d = [...editingQuizUnit.quiz_data]; d[qIdx].answer = oIdx; setEditingQuizUnit({...editingQuizUnit, quiz_data: d}); }} className="text-gold focus:ring-gold" />
                        <input type="text" value={opt} onChange={e => { const d = [...editingQuizUnit.quiz_data]; d[qIdx].options[oIdx] = e.target.value; setEditingQuizUnit({...editingQuizUnit, quiz_data: d}); }}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 focus:border-gold outline-none text-xs" placeholder={`選項 ${oIdx + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => { const d = editingQuizUnit.quiz_data ? [...editingQuizUnit.quiz_data] : []; d.push({ question: '', options: ['', '', '', ''], answer: 0 }); setEditingQuizUnit({...editingQuizUnit, quiz_data: d}); }}
                className="w-full py-4 rounded-2xl border border-dashed border-white/20 hover:border-gold/50 hover:bg-gold/5 text-white/40 hover:text-gold transition-all flex items-center justify-center space-x-2">
                <Plus className="w-4 h-4" /><span>新增問題</span>
              </button>
            </div>
            <div className="flex space-x-4 pt-4">
              <button onClick={() => setShowQuizEditor(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">取消</button>
              <button onClick={handleUpdateQuiz} className="flex-1 py-3 rounded-xl bg-gold text-navy-dark font-bold hover:scale-105 transition-all">儲存測驗內容</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
