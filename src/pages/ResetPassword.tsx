import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, GraduationCap } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('兩次密碼輸入不一致，請重新確認');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert('密碼已成功更新！');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass rounded-3xl p-8 md:p-12"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-4 glass rounded-2xl mb-6">
            <GraduationCap className="w-10 h-10 text-gold" />
          </div>
          <h1 className="text-3xl font-bold gold-gradient tracking-widest mb-2">重設密碼</h1>
          <p className="text-white/40 text-sm">請輸入您的新密碼</p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
            <input
              type="password"
              placeholder="新密碼"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold transition-colors"
            />
          </div>
          <div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input
                type="password"
                placeholder="再次輸入新密碼"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-white/5 border rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none transition-colors ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-white/10 focus:border-gold'
                }`}
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-400 text-xs mt-2 ml-1">密碼不一致</p>
            )}
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !confirmPassword || password !== confirmPassword}
            className="w-full py-4 rounded-xl gold-bg-gradient text-navy-dark font-bold text-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {loading ? '處理中...' : '確認更新密碼'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
