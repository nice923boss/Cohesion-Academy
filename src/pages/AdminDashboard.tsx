import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit, Save, X, Image as ImageIcon, Users, Ticket, Save as SaveIcon, Calendar, MessageSquare, Globe, Mail as MailIcon, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { cn, isSubscriptionActive, formatDate } from '../lib/utils';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { quillModules, quillFormats } from '../lib/quillConfig';

export default function AdminDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', image_url: '', link_url: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'content'>('overview');
  
  // Subscription Edit State
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [subDates, setSubDates] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [evRes, userRes, codeRes, settingsRes] = await Promise.all([
        supabase.from('events').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('invitation_codes').select('*').eq('is_used', false).order('created_at', { ascending: false }),
        supabase.from('site_settings').select('*')
      ]);

      if (evRes.data) setEvents(evRes.data);
      if (userRes.data) setUsers(userRes.data);
      if (codeRes.data) setCodes(codeRes.data);
      if (settingsRes.data) {
        const settingsMap = settingsRes.data.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.content;
          return acc;
        }, {});
        
        // Ensure default structures to prevent crashes when spreading undefined
        const mergedSettings = {
          discord_url: settingsMap.discord_url || '',
          about: { title: '', body: '', ...settingsMap.about },
          contact: { email: '', email_url: '', line_id: '', line_url: '', address: '', address_url: '', ...settingsMap.contact },
          membership_steps: { title: '', subtitle: '', steps_rich: '', line_url: '', button_text: '', ...settingsMap.membership_steps },
          terms: { title: '服務條款', sections: [], ...settingsMap.terms }
        };
        
        setSiteSettings(mergedSettings);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSettings(key: string, content: any) {
    const { error } = await supabase.from('site_settings').upsert({ key, content, updated_at: new Date().toISOString() });
    if (error) alert(error.message);
    else alert('更新成功！');
  }

  async function handleAddEvent() {
    const { error } = await supabase.from('events').insert([newEvent]);
    if (error) alert(error.message);
    else {
      setShowEventModal(false);
      setNewEvent({ title: '', image_url: '', link_url: '' });
      fetchData();
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('確定要刪除此活動嗎？')) return;
    await supabase.from('events').delete().eq('id', id);
    fetchData();
  }

  async function handleUpdateRole(userId: string, newRole: string) {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      alert('更新失敗：' + error.message);
    } else {
      fetchData();
    }
  }

  async function generateCode(role: 'instructor' | 'admin') {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { error } = await supabase.from('invitation_codes').insert([{ code, role }]);
    if (error) alert('生成失敗：' + error.message);
    else fetchData();
  }

  async function handleDeleteCode(code: string) {
    if (!confirm('確定要刪除此邀請碼嗎？')) return;
    const { error } = await supabase.from('invitation_codes').delete().eq('code', code);
    if (error) alert('刪除失敗：' + error.message);
    else fetchData();
  }

  async function handleUpdateSubscription() {
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_start: subDates.start || null,
        subscription_end: subDates.end || null
      })
      .eq('id', selectedUser.id);

    if (error) alert(error.message);
    else {
      setShowSubModal(false);
      fetchData();
    }
  }

  function openSubModal(user: any) {
    setSelectedUser(user);
    setSubDates({
      start: user.subscription_start ? new Date(user.subscription_start).toISOString().split('T')[0] : '',
      end: user.subscription_end ? new Date(user.subscription_end).toISOString().split('T')[0] : ''
    });
    setShowSubModal(true);
  }

  if (loading) return <div className="pt-32 text-center text-white/40">載入中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-32 space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold gold-gradient mb-2">管理後台</h1>
          <div className="flex space-x-4 mt-4">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn("pb-2 px-1 text-sm font-bold tracking-widest uppercase transition-all border-b-2", activeTab === 'overview' ? "border-gold text-gold" : "border-transparent text-white/40")}
            >
              概覽與權限
            </button>
            <button 
              onClick={() => setActiveTab('content')}
              className={cn("pb-2 px-1 text-sm font-bold tracking-widest uppercase transition-all border-b-2", activeTab === 'content' ? "border-gold text-gold" : "border-transparent text-white/40")}
            >
              頁面內容編輯
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 活動管理 */}
          <section className="glass rounded-3xl p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-gold" />
                <span>首頁活動輪播</span>
              </h2>
              <button 
                onClick={() => setShowEventModal(true)}
                className="p-2 rounded-xl bg-gold/10 text-gold hover:bg-gold hover:text-navy-dark transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {events.map(event => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center space-y-2">
                      <img src={event.image_url} className="w-20 h-12 object-cover rounded-lg" alt="" />
                      <button 
                        onClick={() => handleDeleteEvent(event.id)} 
                        className="flex items-center space-x-1 text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded-lg transition-colors text-[10px] font-bold"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>刪除</span>
                      </button>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{event.title}</p>
                      <p className="text-xs text-white/40 truncate max-w-[150px]">{event.link_url || '無連結'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 邀請碼管理 */}
          <section className="glass rounded-3xl p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <Ticket className="w-5 h-5 text-gold" />
                <span>邀請碼管理</span>
              </h2>
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
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase tracking-widest">
                      {code.role === 'admin' ? '管理員' : '講師'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={code.is_used ? 'text-white/20' : 'text-green-400 text-xs'}>
                      {code.is_used ? '已使用' : '未使用'}
                    </span>
                    <button 
                      onClick={() => handleDeleteCode(code.code)}
                      className="text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 使用者權限管理 */}
          <section className="glass rounded-3xl p-8 space-y-6 lg:col-span-2">
            <h2 className="text-xl font-bold flex items-center space-x-2">
              <Users className="w-5 h-5 text-gold" />
              <span>使用者權限管理</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-white/40 text-sm border-b border-white/5">
                    <th className="pb-4 font-medium">狀態</th>
                    <th className="pb-4 font-medium">姓名</th>
                    <th className="pb-4 font-medium">角色</th>
                    <th className="pb-4 font-medium">會員到期日</th>
                    <th className="pb-4 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.map(user => {
                    const active = isSubscriptionActive(user.subscription_end);
                    return (
                      <tr key={user.id} className="border-b border-white/5">
                        <td className="py-4">
                          <div className={cn(
                            "w-3 h-3 rounded-full shadow-lg",
                            active ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50"
                          )} />
                        </td>
                        <td className="py-4 font-bold">{user.full_name || '未設定'}</td>
                        <td className="py-4">
                          <select 
                            value={user.role} 
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-gold cursor-pointer"
                          >
                            <option value="student">學員</option>
                            <option value="instructor">講師</option>
                            <option value="admin">管理員</option>
                          </select>
                        </td>
                        <td className="py-4 text-white/40">
                          {formatDate(user.subscription_end)}
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => openSubModal(user)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gold transition-all"
                            title="修改會員時間"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-12 pb-32">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-gold">
              <Globe className="w-6 h-6" />
              <h2 className="text-2xl font-bold">頁面內容配置</h2>
            </div>
            <p className="text-white/20 text-xs uppercase tracking-widest">最後更新：{new Date().toLocaleDateString()}</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* 課程交流編輯 */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl -mr-16 -mt-16 group-hover:bg-gold/10 transition-all" />
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-gold" />
                    <span>課程交流連結</span>
                  </h3>
                  <p className="text-white/40 text-xs">設定導覽列「課程交流」的跳轉網址</p>
                </div>
                <button 
                  onClick={() => handleUpdateSettings('discord_url', siteSettings.discord_url)}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-gold/20"
                >
                  <Save className="w-4 h-4" />
                  <span>儲存</span>
                </button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text" 
                    value={siteSettings.discord_url || ''} 
                    onChange={e => setSiteSettings({...siteSettings, discord_url: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 focus:border-gold outline-none transition-all"
                    placeholder="Discord 頻道連結 (例如: https://discord.gg/...)"
                  />
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                </div>
              </div>
            </section>

            {/* 關於我們編輯 */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <Users className="w-5 h-5 text-gold" />
                    <span>關於我們</span>
                  </h3>
                  <p className="text-white/40 text-xs">編輯首頁下方的學院介紹區塊</p>
                </div>
                <button 
                  onClick={() => handleUpdateSettings('about', siteSettings.about)}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-gold/20"
                >
                  <Save className="w-4 h-4" />
                  <span>儲存</span>
                </button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest ml-1">區塊標題</label>
                  <input 
                    type="text" 
                    value={siteSettings.about?.title || ''} 
                    onChange={e => setSiteSettings({...siteSettings, about: {...siteSettings.about, title: e.target.value}})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-gold outline-none transition-all"
                    placeholder="例如：關於凝聚力學院"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest ml-1">內容介紹</label>
                  <div className="quill-dark">
                    <ReactQuill
                      theme="snow"
                      value={siteSettings.about?.body || ''}
                      onChange={val => setSiteSettings({...siteSettings, about: {...siteSettings.about, body: val}})}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="撰寫學院的願景與介紹..."
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 聯繫我們編輯 */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5 xl:col-span-2">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <MailIcon className="w-5 h-5 text-gold" />
                    <span>聯繫我們</span>
                  </h3>
                  <p className="text-white/40 text-xs">設定頁尾與聯繫頁面的資訊與超連結</p>
                </div>
                <button 
                  onClick={() => handleUpdateSettings('contact', siteSettings.contact)}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-gold/20"
                >
                  <Save className="w-4 h-4" />
                  <span>儲存</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4 p-6 bg-white/5 rounded-[2rem] border border-white/5">
                  <div className="flex items-center space-x-2 text-gold mb-2">
                    <MailIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">電子郵件</span>
                  </div>
                  <input 
                    type="text" 
                    value={siteSettings.contact?.email || ''} 
                    onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, email: e.target.value}})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm"
                    placeholder="顯示文字 (如: support@xxx.com)"
                  />
                  <input 
                    type="text" 
                    value={siteSettings.contact?.email_url || ''} 
                    onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, email_url: e.target.value}})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-[10px] font-mono"
                    placeholder="超連結 (如: mailto:xxx@xxx.com)"
                  />
                </div>
                <div className="space-y-4 p-6 bg-white/5 rounded-[2rem] border border-white/5">
                  <div className="flex items-center space-x-2 text-[#06C755] mb-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">LINE 客服</span>
                  </div>
                  <input 
                    type="text" 
                    value={siteSettings.contact?.line_id || ''} 
                    onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, line_id: e.target.value}})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm"
                    placeholder="顯示文字 (如: @cohesion)"
                  />
                  <input 
                    type="text" 
                    value={siteSettings.contact?.line_url || ''} 
                    onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, line_url: e.target.value}})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-[10px] font-mono"
                    placeholder="超連結 (如: https://line.me/...)"
                  />
                </div>
                <div className="space-y-4 p-6 bg-white/5 rounded-[2rem] border border-white/5">
                  <div className="flex items-center space-x-2 text-gold mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">學院地址</span>
                  </div>
                  <input 
                    type="text" 
                    value={siteSettings.contact?.address || ''} 
                    onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, address: e.target.value}})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-sm"
                    placeholder="顯示文字 (如: 台北市...)"
                  />
                  <input 
                    type="text" 
                    value={siteSettings.contact?.address_url || ''} 
                    onChange={e => setSiteSettings({...siteSettings, contact: {...siteSettings.contact, address_url: e.target.value}})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-[10px] font-mono"
                    placeholder="超連結 (如: Google Maps 網址)"
                  />
                </div>
              </div>
            </section>

            {/* 會員開通步驟編輯 */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <Ticket className="w-5 h-5 text-gold" />
                    <span>會員開通步驟</span>
                  </h3>
                  <p className="text-white/40 text-xs">編輯學員購買會員後的引導流程</p>
                </div>
                <button 
                  onClick={() => handleUpdateSettings('membership_steps', siteSettings.membership_steps)}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-gold/20"
                >
                  <Save className="w-4 h-4" />
                  <span>儲存</span>
                </button>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest ml-1">區塊標題</label>
                    <input 
                      type="text" 
                      value={siteSettings.membership_steps?.title || ''} 
                      onChange={e => setSiteSettings({...siteSettings, membership_steps: {...siteSettings.membership_steps, title: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-gold outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest ml-1">副標題</label>
                    <input 
                      type="text" 
                      value={siteSettings.membership_steps?.subtitle || ''} 
                      onChange={e => setSiteSettings({...siteSettings, membership_steps: {...siteSettings.membership_steps, subtitle: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-gold outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest ml-1">開通步驟詳情 (富文本)</label>
                  <div className="quill-dark">
                    <ReactQuill
                      theme="snow"
                      value={siteSettings.membership_steps?.steps_rich || ''}
                      onChange={val => setSiteSettings({...siteSettings, membership_steps: {...siteSettings.membership_steps, steps_rich: val}})}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="詳細說明開通步驟..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest ml-1">LINE 聯繫連結</label>
                    <input 
                      type="text" 
                      value={siteSettings.membership_steps?.line_url || ''} 
                      onChange={e => setSiteSettings({...siteSettings, membership_steps: {...siteSettings.membership_steps, line_url: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-gold outline-none text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest ml-1">按鈕文字</label>
                    <input 
                      type="text" 
                      value={siteSettings.membership_steps?.button_text || ''} 
                      onChange={e => setSiteSettings({...siteSettings, membership_steps: {...siteSettings.membership_steps, button_text: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-gold outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 服務條款編輯 */}
            <section className="glass rounded-[2.5rem] p-10 space-y-8 border border-white/5">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-gold" />
                    <span>服務條款</span>
                  </h3>
                  <p className="text-white/40 text-xs">管理學院的法律條款與使用者規範</p>
                </div>
                <button 
                  onClick={() => handleUpdateSettings('terms', siteSettings.terms)}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gold text-navy-dark font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-gold/20"
                >
                  <Save className="w-4 h-4" />
                  <span>儲存</span>
                </button>
              </div>
              <div className="space-y-6">
                {Array.isArray(siteSettings.terms?.sections) ? (
                  siteSettings.terms.sections.map((section: any, idx: number) => (
                    <div key={idx} className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-4 relative group/item">
                      <button 
                        onClick={() => {
                          const newSections = [...siteSettings.terms.sections];
                          newSections.splice(idx, 1);
                          setSiteSettings({...siteSettings, terms: {...siteSettings.terms, sections: newSections}});
                        }}
                        className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        title="刪除章節"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <input 
                        type="text" 
                        value={section.title || ''} 
                        onChange={e => {
                          const newSections = [...siteSettings.terms.sections];
                          newSections[idx].title = e.target.value;
                          setSiteSettings({...siteSettings, terms: {...siteSettings.terms, sections: newSections}});
                        }}
                        className="w-full bg-transparent border-b border-white/10 p-2 focus:border-gold outline-none font-bold text-lg"
                        placeholder="章節標題 (例如: 1. 服務說明)"
                      />
                      <div className="quill-dark">
                        <ReactQuill
                          theme="snow"
                          value={section.content || ''}
                          onChange={val => {
                            const newSections = [...siteSettings.terms.sections];
                            newSections[idx].content = val;
                            setSiteSettings({...siteSettings, terms: {...siteSettings.terms, sections: newSections}});
                          }}
                          modules={quillModules}
                          formats={quillFormats}
                          placeholder="撰寫條款內容..."
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] text-white/20">
                    尚未設定服務條款內容
                  </div>
                )}
                <button 
                  onClick={() => {
                    const currentTerms = siteSettings.terms || { sections: [] };
                    const newSections = [...(currentTerms.sections || [])];
                    newSections.push({ title: '新章節', content: '' });
                    setSiteSettings({...siteSettings, terms: {...currentTerms, sections: newSections}});
                  }}
                  className="w-full py-6 rounded-[2rem] border-2 border-dashed border-white/10 hover:border-gold/50 hover:bg-gold/5 text-white/40 hover:text-gold transition-all flex items-center justify-center space-x-3 group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" />
                  <span className="font-bold">新增服務條款章節</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* 新增活動 Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-8 rounded-3xl w-full max-w-md space-y-6">
            <h3 className="text-xl font-bold gold-gradient">新增活動輪播</h3>
            <div className="space-y-4">
              <input 
                type="text" placeholder="活動標題" 
                value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none"
              />
              <input 
                type="text" placeholder="圖片 URL (建議 1920x1080)" 
                value={newEvent.image_url} onChange={e => setNewEvent({...newEvent, image_url: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none"
              />
              <input 
                type="text" placeholder="跳轉連結 (選填)" 
                value={newEvent.link_url} onChange={e => setNewEvent({...newEvent, link_url: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none"
              />
            </div>
            <div className="flex space-x-4">
              <button onClick={() => setShowEventModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">取消</button>
              <button onClick={handleAddEvent} className="flex-1 py-3 rounded-xl bg-gold text-navy-dark font-bold hover:scale-105 transition-all">確認新增</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 修改會員時間 Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-8 rounded-3xl w-full max-w-md space-y-6">
            <h3 className="text-xl font-bold gold-gradient">修改會員資格：{selectedUser?.full_name}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">開始日期</label>
                <input 
                  type="date" 
                  value={subDates.start} 
                  onChange={e => setSubDates({...subDates, start: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-white"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">結束日期 (到期日)</label>
                <input 
                  type="date" 
                  value={subDates.end} 
                  onChange={e => setSubDates({...subDates, end: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-gold outline-none text-white"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button onClick={() => setShowSubModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">取消</button>
              <button onClick={handleUpdateSubscription} className="flex-1 py-3 rounded-xl bg-gold text-navy-dark font-bold hover:scale-105 transition-all">儲存變更</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
