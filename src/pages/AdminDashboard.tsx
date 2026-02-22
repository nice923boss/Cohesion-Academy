import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit, Save, X, Image as ImageIcon, Users, Ticket, Calendar, MessageSquare, Globe, Mail as MailIcon, MapPin, MessageCircle, ShieldCheck, FileText, ExternalLink, EyeOff, KeyRound, Search, ChevronDown, ChevronUp, Megaphone, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { quillModules, quillFormats, blockBase64Images } from '../lib/quillConfig';

export default function AdminDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({});
  const [hiddenStats, setHiddenStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [newEvent, setNewEvent] = useState({ title: '', image_url: '', link_url: '', start_date: '', end_date: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'articles' | 'members'>('overview');

  // Article Editor State
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [newArticle, setNewArticle] = useState({ title: '', content: '', thumbnail_url: '', is_published: true });

  // Member search & hidden instructor per-member
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [memberHiddenList, setMemberHiddenList] = useState<any[]>([]);

  // Email verification status
  const [verificationStatus, setVerificationStatus] = useState<Record<string, string | null>>({});
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null);
  const [batchVerifying, setBatchVerifying] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [evRes, userRes, codeRes, settingsRes, articleRes, hiddenRes] = await Promise.all([
        supabase.from('events').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('invitation_codes').select('*').eq('is_used', false).order('created_at', { ascending: false }),
        supabase.from('site_settings').select('*'),
        supabase.from('articles').select('*, author:profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('hidden_instructors').select('*, user:profiles!hidden_instructors_user_id_fkey(full_name), instructor:profiles!hidden_instructors_instructor_id_fkey(full_name)')
      ]);

      if (evRes.data) setEvents(evRes.data);
      if (userRes.data) setUsers(userRes.data);
      if (codeRes.data) setCodes(codeRes.data);
      if (articleRes.data) setArticles(articleRes.data);
      if (hiddenRes.data) setHiddenStats(hiddenRes.data);
      if (settingsRes.data) {
        const settingsMap = settingsRes.data.reduce((acc: any, curr: any) => { acc[curr.key] = curr.content; return acc; }, {});
        setSiteSettings({
          discord_url: settingsMap.discord_url || '',
          about: { title: '', body: '', body_html: '', ...settingsMap.about },
          contact: { email: '', email_url: '', line_id: '', line_url: '', address: '', address_url: '', ...settingsMap.contact },
          terms: { title: '服務條款', sections: [], ...settingsMap.terms },
          site_donate_url: { url: '', ...settingsMap.site_donate_url },
          site_donate_embed: { html: '', ...settingsMap.site_donate_embed },
          marquee_messages: {
            messages: [{ text: '首頁活動輪播現正開放廣告合作！想讓更多人看見您的品牌嗎？歡迎聯繫網站管理員洽談廣告投放事宜。', enabled: true }],
            ...(settingsMap.marquee_messages || {})
          }
        });
      }
      // Fetch email verification status from auth.users
      await fetchVerificationStatus();
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSettings(key: string, content: any) {
    const { error } = await supabase.from('site_settings').upsert({ key, content, updated_at: new Date().toISOString() });
    if (error) alert(error.message); else alert('更新成功！');
  }

  // Event handlers
  async function handleSaveEvent() {
    const eventData = {
      title: newEvent.title,
      image_url: newEvent.image_url,
      link_url: newEvent.link_url,
      start_date: newEvent.start_date || null,
      end_date: newEvent.end_date || null,
    };
    if (editingEvent) {
      const { error } = await supabase.from('events').update(eventData).eq('id', editingEvent.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from('events').insert([eventData]);
      if (error) alert(error.message);
    }
    setShowEventModal(false);
    setEditingEvent(null);
    setNewEvent({ title: '', image_url: '', link_url: '', start_date: '', end_date: '' });
    fetchData();
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('確定要刪除此活動嗎？')) return;
    await supabase.from('events').delete().eq('id', id);
    fetchData();
  }

  function openEditEvent(event: any) {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      image_url: event.image_url,
      link_url: event.link_url || '',
      start_date: event.start_date ? new Date(event.start_date).toISOString().split('T')[0] : '',
      end_date: event.end_date ? new Date(event.end_date).toISOString().split('T')[0] : ''
    });
    setShowEventModal(true);
  }

  // User & Role handlers
  async function handleUpdateRole(userId: string, newRole: string) {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) alert('更新失敗：' + error.message); else fetchData();
  }

  async function handleSendPasswordReset(email: string, name: string) {
    if (!email) return alert('此會員未設定 Email');
    if (!confirm(`確定要發送密碼重設信給 ${name} (${email}) 嗎？`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) alert('發送失敗：' + error.message);
    else alert(`密碼重設信已發送至 ${email}`);
  }

  // Email verification handlers
  async function fetchVerificationStatus() {
    const { data, error } = await supabase.rpc('admin_get_users_verification_status');
    if (error) { console.error('Error fetching verification status:', error); return; }
    if (data) {
      const statusMap: Record<string, string | null> = {};
      data.forEach((row: { user_id: string; email_confirmed_at: string | null }) => {
        statusMap[row.user_id] = row.email_confirmed_at;
      });
      setVerificationStatus(statusMap);
    }
  }

  async function handleVerifyUser(userId: string, userName: string) {
    if (!confirm(`確定要代替 ${userName} 完成 Email 驗證嗎？`)) return;
    setVerifyingUserId(userId);
    try {
      const { error } = await supabase.rpc('admin_verify_user', { target_user_id: userId });
      if (error) { alert('驗證失敗：' + error.message); }
      else { alert(`${userName} 已成功驗證！`); await fetchVerificationStatus(); }
    } catch (err: any) { alert('驗證失敗：' + err.message); }
    finally { setVerifyingUserId(null); }
  }

  async function handleBatchVerifyUsers() {
    const unverifiedCount = Object.values(verificationStatus).filter(v => v === null).length;
    if (unverifiedCount === 0) { alert('目前沒有未驗證的會員'); return; }
    if (!confirm(`確定要批次驗證所有 ${unverifiedCount} 位未驗證會員嗎？`)) return;
    setBatchVerifying(true);
    try {
      const { data, error } = await supabase.rpc('admin_batch_verify_users');
      if (error) { alert('批次驗證失敗：' + error.message); }
      else { alert(`批次驗證完成！共驗證 ${data} 位會員`); await fetchVerificationStatus(); }
    } catch (err: any) { alert('批次驗證失敗：' + err.message); }
    finally { setBatchVerifying(false); }
  }

  // Code handlers
  async function generateCode(role: 'instructor' | 'admin') {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { error } = await supabase.from('invitation_codes').insert([{ code, role }]);
    if (error) alert('生成失敗：' + error.message); else fetchData();
  }

  async function handleDeleteCode(code: string) {
    if (!confirm('確定要刪除此邀請碼嗎？')) return;
    await supabase.from('invitation_codes').delete().eq('code', code);
    fetchData();
  }

  // Article handlers
  async function handleSaveArticle() {
    if (editingArticle) {
      const { error } = await supabase.from('articles').update({
        title: newArticle.title, content: newArticle.content, thumbnail_url: newArticle.thumbnail_url, is_published: newArticle.is_published
      }).eq('id', editingArticle.id);
      if (error) alert(error.message);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('articles').insert([{ ...newArticle, author_id: user?.id }]);
      if (error) alert(error.message);
    }
    setShowArticleModal(false);
    setEditingArticle(null);
    setNewArticle({ title: '', content: '', thumbnail_url: '', is_published: true });
    fetchData();
  }

  async function handleDeleteArticle(id: string) {
    if (!confirm('確定要刪除此文章嗎？')) return;
    await supabase.from('articles').delete().eq('id', id);
    fetchData();
  }

  // Fetch hidden instructors for a specific member
  async function fetchMemberHiddenList(memberId: string) {
    if (expandedMemberId === memberId) {
      setExpandedMemberId(null);
      setMemberHiddenList([]);
      return;
    }
    const { data } = await supabase
      .from('hidden_instructors')
      .select('*, instructor:profiles!hidden_instructors_instructor_id_fkey(id, full_name, avatar_url)')
      .eq('user_id', memberId);
    setMemberHiddenList(data || []);
    setExpandedMemberId(memberId);
  }

  // Compute hidden instructor stats: group by instructor
  const hiddenByInstructor = hiddenStats.reduce((acc: any, h: any) => {
    const iid = h.instructor_id;
    if (!acc[iid]) acc[iid] = { name: h.instructor?.full_name || '未知', users: [] };
    acc[iid].users.push(h.user?.full_name || '未知');
    return acc;
  }, {});

  // Filter members by search
  const filteredUsers = users.filter(u => {
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  // Count unverified members
  const unverifiedCount = Object.values(verificationStatus).filter(v => v === null).length;

  if (loading) return <div className="pt-32 text-center text-white/40">載入中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-32 space-y-12">
      <div>
        <h1 className="text-4xl font-bold gold-gradient mb-2">管理後台</h1>
        <div className="flex space-x-4 mt-4 flex-wrap gap-y-2">
          {(['overview', 'members', 'articles', 'content'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("pb-2 px-1 text-sm font-bold tracking-widest uppercase transition-all border-b-2",
                activeTab === tab ? "border-gold text-gold" : "border-transparent text-white/40")}>
              {tab === 'overview' ? '概覽與權限' : tab === 'members' ? '會員管理' : tab === 'articles' ? '文章管理' : '頁面內容編輯'}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== OVERVIEW TAB (概覽與權限) ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Event Management - 首頁活動輪播 */}
            <section className="glass rounded-3xl p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center space-x-2"><ImageIcon className="w-5 h-5 text-gold" /><span>首頁活動輪播</span></h2>
                <button onClick={() => { setEditingEvent(null); setNewEvent({ title: '', image_url: '', link_url: '', start_date: '', end_date: '' }); setShowEventModal(true); }}
                  className="p-2 rounded-xl bg-gold/10 text-gold hover:bg-gold hover:text-navy-dark transition-all"><Plus className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {events.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center space-x-4">
                      <img src={event.image_url} className="w-20 h-12 object-cover rounded-lg" alt="" />
                      <div>
                        <p className="font-bold text-sm">{event.title}</p>
                        <p className="text-xs text-white/40">
                          {event.start_date ? new Date(event.start_date).toLocaleDateString('zh-TW') : '無限制'} ~ {event.end_date ? new Date(event.end_date).toLocaleDateString('zh-TW') : '無限制'}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => openEditEvent(event)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteEvent(event.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Invitation Codes - 邀請碼管理 */}
            <section className="glass rounded-3xl p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center space-x-2"><Ticket className="w-5 h-5 text-gold" /><span>邀請碼管理</span></h2>
                <div className="flex space-x-2">
                  <button onClick={() => generateCode('instructor')} className="text-xs px-3 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10">生成講師碼</button>
                  <button onClick={() => generateCode('admin')} className="text-xs px-3 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10">生成管理碼</button>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {codes.map(code => (
                  <div key={code.code} className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-sm">
                    <div className="flex items-center space-x-3">
                      <code className="text-gold font-mono">{code.code}</code>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase tracking-widest">{code.role === 'admin' ? '管理員' : '講師'}</span>
                    </div>
                    <button onClick={() => handleDeleteCode(code.code)} className="text-white/20 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* User Permissions - 使用者權限管理 */}
          <section className="glass rounded-3xl p-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center space-x-2"><ShieldCheck className="w-5 h-5 text-gold" /><span>使用者權限管理</span></h2>
            <p className="text-white/40 text-sm">共 {users.length} 位會員 — 可在此調整使用者角色（學員 / 講師 / 管理員）</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-white/40 border-b border-white/5">
                  <th className="pb-4 font-medium">姓名</th>
                  <th className="pb-4 font-medium">角色</th>
                  <th className="pb-4 font-medium">註冊日期</th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 font-bold">{u.full_name || '未設定'}</td>
                      <td className="py-3">
                        <select value={u.role} onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-gold cursor-pointer text-sm">
                          <option value="student">學員</option>
                          <option value="instructor">講師</option>
                          <option value="admin">管理員</option>
                        </select>
                      </td>
                      <td className="py-3 text-white/40">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ==================== MEMBERS TAB (會員管理) ==================== */}
      {activeTab === 'members' && (
        <div className="space-y-8">
          <section className="glass rounded-3xl p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold flex items-center space-x-2"><Users className="w-5 h-5 text-gold" /><span>會員資料查詢</span></h2>
                <p className="text-white/40 text-sm mt-1">
                  共 {users.length} 位會員 — 可搜尋姓名或 Email，點擊展開查看該會員隱藏的講師列表
                  {unverifiedCount > 0 && (
                    <span className="text-orange-400 ml-2">（{unverifiedCount} 位未驗證）</span>
                  )}
                </p>
              </div>
              {unverifiedCount > 0 && (
                <button
                  onClick={handleBatchVerifyUsers}
                  disabled={batchVerifying}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all text-sm font-bold disabled:opacity-50 flex-shrink-0"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{batchVerifying ? '驗證中...' : '批次驗證全部'}</span>
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="搜尋姓名或 Email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-white/40 border-b border-white/5">
                  <th className="pb-4 font-medium">姓名</th>
                  <th className="pb-4 font-medium">Email</th>
                  <th className="pb-4 font-medium">角色</th>
                  <th className="pb-4 font-medium">驗證狀態</th>
                  <th className="pb-4 font-medium">註冊日期</th>
                  <th className="pb-4 font-medium text-right">操作</th>
                </tr></thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <React.Fragment key={u.id}>
                      <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 font-bold">{u.full_name || '未設定'}</td>
                        <td className="py-4 text-white/60 font-mono text-xs">{u.email || '—'}</td>
                        <td className="py-4">
                          <span className={cn("text-xs px-2 py-1 rounded-lg",
                            u.role === 'admin' ? 'bg-gold/10 text-gold' : u.role === 'instructor' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-white/40'
                          )}>
                            {u.role === 'admin' ? '管理員' : u.role === 'instructor' ? '講師' : '學員'}
                          </span>
                        </td>
                        <td className="py-4">
                          {verificationStatus[u.id] !== undefined ? (
                            verificationStatus[u.id] ? (
                              <span className="flex items-center space-x-1 text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs">已驗證</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 text-orange-400">
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs">未驗證</span>
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </td>
                        <td className="py-4 text-white/40">{formatDate(u.created_at)}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => fetchMemberHiddenList(u.id)}
                              className={cn("p-2 rounded-xl transition-all", expandedMemberId === u.id ? "bg-orange-500/10 text-orange-400" : "bg-white/5 hover:bg-white/10 text-white/40")}
                              title="查看隱藏講師">
                              <EyeOff className="w-4 h-4" />
                            </button>
                            {verificationStatus[u.id] === null && (
                              <button
                                onClick={() => handleVerifyUser(u.id, u.full_name)}
                                disabled={verifyingUserId === u.id}
                                className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
                                title="代驗證 Email"
                              >
                                {verifyingUserId === u.id ? (
                                  <span className="w-4 h-4 block animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                                ) : (
                                  <ShieldCheck className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button onClick={() => handleSendPasswordReset(u.email, u.full_name)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gold transition-all" title="發送密碼重設信">
                              <KeyRound className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded hidden instructor list for this member */}
                      {expandedMemberId === u.id && (
                        <tr>
                          <td colSpan={6} className="pb-4">
                            <div className="ml-4 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                              <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center space-x-2">
                                <EyeOff className="w-4 h-4" />
                                <span>{u.full_name} 隱藏的講師</span>
                              </h4>
                              {memberHiddenList.length === 0 ? (
                                <p className="text-white/20 text-xs">此會員未隱藏任何講師</p>
                              ) : (
                                <div className="flex flex-wrap gap-3">
                                  {memberHiddenList.map((item: any) => (
                                    <div key={item.id} className="flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-xl">
                                      <div className="w-6 h-6 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center text-xs">
                                        {item.instructor?.avatar_url ? (
                                          <img src={item.instructor.avatar_url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                          <span className="text-white/40">{item.instructor?.full_name?.charAt(0)}</span>
                                        )}
                                      </div>
                                      <span className="text-sm text-white/60">{item.instructor?.full_name || '未知'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Hidden Instructor Stats */}
          <section className="glass rounded-3xl p-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center space-x-2"><EyeOff className="w-5 h-5 text-gold" /><span>講師隱藏統計（品質評鑑參考）</span></h2>
            {Object.keys(hiddenByInstructor).length === 0 ? (
              <p className="text-center py-8 text-white/20">目前沒有任何講師被會員隱藏</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="text-white/40 border-b border-white/5">
                    <th className="pb-3 font-medium">講師姓名</th><th className="pb-3 font-medium">被隱藏次數</th><th className="pb-3 font-medium">隱藏的會員</th>
                  </tr></thead>
                  <tbody>
                    {Object.entries(hiddenByInstructor).sort((a: any, b: any) => b[1].users.length - a[1].users.length).map(([iid, info]: any) => (
                      <tr key={iid} className="border-b border-white/5">
                        <td className="py-3 font-bold">{info.name}</td>
                        <td className="py-3"><span className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-bold">{info.users.length}</span></td>
                        <td className="py-3 text-white/40">{info.users.join('、')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================== ARTICLES TAB ==================== */}
      {activeTab === 'articles' && (
        <section className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center space-x-2"><FileText className="w-5 h-5 text-gold" /><span>文章管理</span></h2>
            <button onClick={() => { setEditingArticle(null); setNewArticle({ title: '', content: '', thumbnail_url: '', is_published: true }); setShowArticleModal(true); }}
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gold text-navy-dark font-bold hover:scale-105 transition-all">
              <Plus className="w-5 h-5" /><span>新增文章</span>
            </button>
          </div>
          <div className="space-y-4">
            {articles.length === 0 ? <div className="glass rounded-3xl p-12 text-center text-white/20">尚未發佈任何文章</div> : (
              articles.map(article => (
                <div key={article.id} className="glass rounded-2xl p-6 flex items-center justify-between border border-white/5">
                  <div className="flex items-center space-x-4">
                    {article.thumbnail_url && <img src={article.thumbnail_url} className="w-20 h-14 object-cover rounded-lg" alt="" />}
                    <div>
                      <h3 className="font-bold">{article.title}</h3>
                      <div className="flex items-center space-x-3 text-xs text-white/40 mt-1">
                        <span>{article.author?.full_name || '管理員'}</span>
                        <span>{new Date(article.created_at).toLocaleDateString('zh-TW')}</span>
                        <span className={article.is_published ? 'text-green-400' : 'text-white/20'}>{article.is_published ? '已發佈' : '草稿'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => { setEditingArticle(article); setNewArticle({ title: article.title, content: article.content, thumbnail_url: article.thumbnail_url || '', is_published: article.is_published }); setShowArticleModal(true); }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteArticle(article.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* ==================== CONTENT TAB ==================== */}
      {activeTab === 'content' && (
        <div className="space-y-12 pb-32">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Marquee Messages */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5 xl:col-span-2">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold flex items-center space-x-2"><Megaphone className="w-5 h-5 text-gold" /><span>跑馬燈訊息管理</span></h3>
                  <p className="text-white/40 text-xs">管理頁面頂部的跑馬燈提示訊息，可設定多條訊息輪流播放，並可個別啟用或停用</p>
                </div>
                <button onClick={() => handleUpdateSettings('marquee_messages', siteSettings.marquee_messages)} className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all"><Save className="w-4 h-4" /><span>儲存</span></button>
              </div>
              <div className="space-y-4">
                {Array.isArray(siteSettings.marquee_messages?.messages) && siteSettings.marquee_messages.messages.map((msg: any, idx: number) => (
                  <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 group/msg relative space-y-3">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center cursor-pointer flex-shrink-0" title={msg.enabled ? '已啟用' : '已停用'}>
                        <input
                          type="checkbox"
                          checked={msg.enabled}
                          onChange={e => {
                            const msgs = [...siteSettings.marquee_messages.messages];
                            msgs[idx] = { ...msgs[idx], enabled: e.target.checked };
                            setSiteSettings({ ...siteSettings, marquee_messages: { ...siteSettings.marquee_messages, messages: msgs } });
                          }}
                          className="w-5 h-5 rounded border-white/10 bg-white/5 text-gold focus:ring-gold"
                        />
                      </label>
                      <input
                        type="text"
                        value={msg.text || ''}
                        onChange={e => {
                          const msgs = [...siteSettings.marquee_messages.messages];
                          msgs[idx] = { ...msgs[idx], text: e.target.value };
                          setSiteSettings({ ...siteSettings, marquee_messages: { ...siteSettings.marquee_messages, messages: msgs } });
                        }}
                        className={cn("flex-1 bg-transparent border-b border-white/10 p-2 focus:border-gold outline-none text-sm", !msg.enabled && "opacity-40")}
                        placeholder="輸入跑馬燈訊息內容..."
                      />
                      <button
                        onClick={() => {
                          const msgs = [...siteSettings.marquee_messages.messages];
                          msgs.splice(idx, 1);
                          setSiteSettings({ ...siteSettings, marquee_messages: { ...siteSettings.marquee_messages, messages: msgs } });
                        }}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover/msg:opacity-100 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Date Range for Marquee Message */}
                    <div className="flex items-center space-x-4 ml-9">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-white/30" />
                        <label className="text-[10px] text-white/40 uppercase tracking-widest">開始</label>
                        <input
                          type="date"
                          value={msg.start_date || ''}
                          onChange={e => {
                            const msgs = [...siteSettings.marquee_messages.messages];
                            msgs[idx] = { ...msgs[idx], start_date: e.target.value };
                            setSiteSettings({ ...siteSettings, marquee_messages: { ...siteSettings.marquee_messages, messages: msgs } });
                          }}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:border-gold outline-none text-white/60"
                        />
                      </div>
                      <span className="text-white/20">~</span>
                      <div className="flex items-center space-x-2">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest">結束</label>
                        <input
                          type="date"
                          value={msg.end_date || ''}
                          onChange={e => {
                            const msgs = [...siteSettings.marquee_messages.messages];
                            msgs[idx] = { ...msgs[idx], end_date: e.target.value };
                            setSiteSettings({ ...siteSettings, marquee_messages: { ...siteSettings.marquee_messages, messages: msgs } });
                          }}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:border-gold outline-none text-white/60"
                        />
                      </div>
                      <span className="text-[10px] text-white/20">留空 = 不限制</span>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const msgs = [...(siteSettings.marquee_messages?.messages || [])];
                    msgs.push({ text: '', enabled: true, start_date: '', end_date: '' });
                    setSiteSettings({ ...siteSettings, marquee_messages: { ...siteSettings.marquee_messages, messages: msgs } });
                  }}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-gold/50 hover:bg-gold/5 text-white/40 hover:text-gold transition-all flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" /><span className="font-bold text-sm">新增跑馬燈訊息</span>
                </button>
              </div>
            </section>

            {/* Discord URL */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5">
              <div className="flex justify-between items-center">
                <div className="space-y-1"><h3 className="text-xl font-bold flex items-center space-x-2"><MessageSquare className="w-5 h-5 text-gold" /><span>課程交流連結</span></h3><p className="text-white/40 text-xs">設定導覽列「課程交流」跳轉網址</p></div>
                <button onClick={() => handleUpdateSettings('discord_url', siteSettings.discord_url)} className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all"><Save className="w-4 h-4" /><span>儲存</span></button>
              </div>
              <div className="relative">
                <input type="text" value={siteSettings.discord_url || ''} onChange={e => setSiteSettings({...siteSettings, discord_url: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 focus:border-gold outline-none" placeholder="Discord 頻道連結" />
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              </div>
            </section>

            {/* Site Donate URL */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5">
              <div className="flex justify-between items-center">
                <div className="space-y-1"><h3 className="text-xl font-bold flex items-center space-x-2"><ExternalLink className="w-5 h-5 text-gold" /><span>網站贊助連結</span></h3><p className="text-white/40 text-xs">顯示在「關於我們」頁面的贊助按鈕</p></div>
                <button onClick={() => handleUpdateSettings('site_donate_url', siteSettings.site_donate_url)} className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all"><Save className="w-4 h-4" /><span>儲存</span></button>
              </div>
              <input type="text" value={siteSettings.site_donate_url?.url || ''} onChange={e => setSiteSettings({...siteSettings, site_donate_url: { url: e.target.value }})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-gold outline-none" placeholder="例如：https://www.buymeacoffee.com/..." />
            </section>

            {/* Site Donate Embed HTML */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5 xl:col-span-2">
              <div className="flex justify-between items-center">
                <div className="space-y-1"><h3 className="text-xl font-bold flex items-center space-x-2"><ExternalLink className="w-5 h-5 text-gold" /><span>網站贊助內嵌按鈕</span></h3><p className="text-white/40 text-xs">貼上贊助平台提供的內嵌 HTML 按鈕碼，將顯示在「關於我們」頁面</p></div>
                <button onClick={() => handleUpdateSettings('site_donate_embed', siteSettings.site_donate_embed)} className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all"><Save className="w-4 h-4" /><span>儲存</span></button>
              </div>
              <textarea
                value={siteSettings.site_donate_embed?.html || ''}
                onChange={e => setSiteSettings({...siteSettings, site_donate_embed: { html: e.target.value }})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-gold outline-none font-mono text-xs min-h-[120px]"
                placeholder="貼上內嵌 HTML 碼，例如：<a href=&quot;...&quot; ...>請我喝珍奶！</a>"
              />
              {siteSettings.site_donate_embed?.html && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">預覽</p>
                  <div dangerouslySetInnerHTML={{ __html: siteSettings.site_donate_embed.html }} />
                </div>
              )}
            </section>

            {/* About Us */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5 xl:col-span-2">
              <div className="flex justify-between items-center">
                <div className="space-y-1"><h3 className="text-xl font-bold flex items-center space-x-2"><Users className="w-5 h-5 text-gold" /><span>關於我們</span></h3><p className="text-white/40 text-xs">編輯「關於我們」頁面內容</p></div>
                <button onClick={() => handleUpdateSettings('about', { ...siteSettings.about, body_html: siteSettings.about?.body || '' })} className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all"><Save className="w-4 h-4" /><span>儲存</span></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest ml-1">頁面標題</label>
                  <input type="text" value={siteSettings.about?.title || ''} onChange={e => setSiteSettings({...siteSettings, about: {...siteSettings.about, title: e.target.value}})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-gold outline-none" placeholder="例如：關於凝聚力學院" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest ml-1">頁面內容（富文本）</label>
                  <div className="quill-dark">
                    <ReactQuill ref={(el: any) => { if (el) blockBase64Images(el); }} theme="snow" value={siteSettings.about?.body || ''} onChange={val => setSiteSettings({...siteSettings, about: {...siteSettings.about, body: val}})}
                      modules={quillModules} formats={quillFormats} placeholder="撰寫學院的願景與介紹..." />
                  </div>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5 xl:col-span-2">
              <div className="flex justify-between items-center">
                <div className="space-y-1"><h3 className="text-xl font-bold flex items-center space-x-2"><MailIcon className="w-5 h-5 text-gold" /><span>聯繫我們</span></h3></div>
                <button onClick={() => handleUpdateSettings('contact', siteSettings.contact)} className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all"><Save className="w-4 h-4" /><span>儲存</span></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4 p-6 bg-white/5 rounded-[2rem] border border-white/5">
                  <div className="flex items-center space-x-2 text-gold mb-2"><MailIcon className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">電子郵件</span></div>
                  <input type="text" value={siteSettings.contact?.email || ''} onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, email: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm" placeholder="support@xxx.com" />
                  <input type="text" value={siteSettings.contact?.email_url || ''} onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, email_url: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-[10px] font-mono" placeholder="mailto:xxx@xxx.com" />
                </div>
                <div className="space-y-4 p-6 bg-white/5 rounded-[2rem] border border-white/5">
                  <div className="flex items-center space-x-2 text-[#06C755] mb-2"><MessageCircle className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">LINE 客服</span></div>
                  <input type="text" value={siteSettings.contact?.line_id || ''} onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, line_id: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm" placeholder="@cohesion" />
                  <input type="text" value={siteSettings.contact?.line_url || ''} onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, line_url: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-[10px] font-mono" placeholder="https://line.me/..." />
                </div>
                <div className="space-y-4 p-6 bg-white/5 rounded-[2rem] border border-white/5">
                  <div className="flex items-center space-x-2 text-gold mb-2"><MapPin className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">學院地址</span></div>
                  <input type="text" value={siteSettings.contact?.address || ''} onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, address: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm" placeholder="台北市..." />
                  <input type="text" value={siteSettings.contact?.address_url || ''} onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, address_url: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-[10px] font-mono" placeholder="Google Maps 網址" />
                </div>
              </div>
            </section>

            {/* Terms of Service */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5 xl:col-span-2">
              <div className="flex justify-between items-center">
                <div className="space-y-1"><h3 className="text-xl font-bold flex items-center space-x-2"><ShieldCheck className="w-5 h-5 text-gold" /><span>服務條款</span></h3></div>
                <button onClick={() => handleUpdateSettings('terms', siteSettings.terms)} className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all"><Save className="w-4 h-4" /><span>儲存</span></button>
              </div>
              <div className="space-y-6">
                {Array.isArray(siteSettings.terms?.sections) ? siteSettings.terms.sections.map((section: any, idx: number) => (
                  <div key={idx} className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-4 relative group/item">
                    <button onClick={() => { const s = [...siteSettings.terms.sections]; s.splice(idx, 1); setSiteSettings({...siteSettings, terms: {...siteSettings.terms, sections: s}}); }}
                      className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover/item:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                    <input type="text" value={section.title || ''} onChange={e => { const s = [...siteSettings.terms.sections]; s[idx].title = e.target.value; setSiteSettings({...siteSettings, terms: {...siteSettings.terms, sections: s}}); }}
                      className="w-full bg-transparent border-b border-white/10 p-2 focus:border-gold outline-none font-bold text-lg" placeholder="章節標題" />
                    <div className="quill-dark">
                      <ReactQuill ref={(el: any) => { if (el) blockBase64Images(el); }} theme="snow" value={section.content || ''} onChange={val => { const s = [...siteSettings.terms.sections]; s[idx].content = val; setSiteSettings({...siteSettings, terms: {...siteSettings.terms, sections: s}}); }}
                        modules={quillModules} formats={quillFormats} placeholder="撰寫條款內容..." />
                    </div>
                  </div>
                )) : <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] text-white/20">尚未設定服務條款</div>}
                <button onClick={() => { const t = siteSettings.terms || { sections: [] }; const s = [...(t.sections || [])]; s.push({ title: '新章節', content: '' }); setSiteSettings({...siteSettings, terms: {...t, sections: s}}); }}
                  className="w-full py-6 rounded-[2rem] border-2 border-dashed border-white/10 hover:border-gold/50 hover:bg-gold/5 text-white/40 hover:text-gold transition-all flex items-center justify-center space-x-3">
                  <Plus className="w-5 h-5" /><span className="font-bold">新增服務條款章節</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ==================== EVENT MODAL ==================== */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-8 rounded-3xl w-full max-w-md space-y-6">
            <h3 className="text-xl font-bold gold-gradient">{editingEvent ? '編輯活動' : '新增活動輪播'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="活動標題" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none" />
              <input type="text" placeholder="圖片 URL (建議 1920x1080)" value={newEvent.image_url} onChange={e => setNewEvent({...newEvent, image_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none" />
              <input type="text" placeholder="跳轉連結 (選填)" value={newEvent.link_url} onChange={e => setNewEvent({...newEvent, link_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">開始日期</label>
                  <input type="date" value={newEvent.start_date} onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">結束日期</label>
                  <input type="date" value={newEvent.end_date} onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-white text-sm" />
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              <button onClick={() => { setShowEventModal(false); setEditingEvent(null); }} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">取消</button>
              <button onClick={handleSaveEvent} className="flex-1 py-3 rounded-xl bg-gold text-navy-dark font-bold hover:scale-105 transition-all">
                {editingEvent ? '儲存變更' : '確認新增'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ==================== ARTICLE MODAL ==================== */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-8 rounded-3xl w-full max-w-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold gold-gradient">{editingArticle ? '編輯文章' : '新增文章'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">文章標題</label>
                <input type="text" value={newArticle.title} onChange={e => setNewArticle({...newArticle, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">封面圖片 URL（選填）</label>
                <input type="text" value={newArticle.thumbnail_url} onChange={e => setNewArticle({...newArticle, thumbnail_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">文章內容</label>
                <div className="quill-dark">
                  <ReactQuill ref={(el: any) => { if (el) blockBase64Images(el); }} theme="snow" value={newArticle.content} onChange={val => setNewArticle({...newArticle, content: val})} modules={quillModules} formats={quillFormats} placeholder="撰寫文章內容..." />
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                <input type="checkbox" id="article_published" checked={newArticle.is_published} onChange={e => setNewArticle({...newArticle, is_published: e.target.checked})} className="w-5 h-5 rounded border-white/10 bg-white/5 text-gold focus:ring-gold" />
                <label htmlFor="article_published" className="text-sm font-bold text-white cursor-pointer">立即發佈</label>
              </div>
            </div>
            <div className="flex space-x-4">
              <button onClick={() => { setShowArticleModal(false); setEditingArticle(null); }} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">取消</button>
              <button onClick={handleSaveArticle} className="flex-1 py-3 rounded-xl bg-gold text-navy-dark font-bold hover:scale-105 transition-all">
                {editingArticle ? '儲存變更' : '確認新增'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
