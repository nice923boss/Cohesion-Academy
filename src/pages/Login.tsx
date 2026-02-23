import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, GraduationCap, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('兩次密碼輸入不一致，請重新確認');
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/Cohesion-Academy/',
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;

        // Check if auto-verify is enabled and attempt to auto-verify the new user
        if (data.user) {
          try {
            await supabase.rpc('auto_verify_if_enabled', { target_user_id: data.user.id });
          } catch {
            // Silently ignore - function may not exist or auto-verify may be disabled
          }
        }

        alert('註冊成功！現在您可以直接登入。');
        setIsSignUp(false);
        setConfirmPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/Cohesion-Academy/',
      });
      if (error) throw error;
      setMessage('密碼重設信已發送至您的信箱，請查收。');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password View
  if (isForgotPassword) {
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
            <h1 className="text-3xl font-bold gold-gradient tracking-widest mb-2">忘記密碼</h1>
            <p className="text-white/40 text-sm">輸入您的電子郵件，我們將寄送密碼重設連結</p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input
                type="email"
                placeholder="電子郵件"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            {message && <p className="text-green-400 text-xs text-center">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl gold-bg-gradient text-navy-dark font-bold text-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {loading ? '處理中...' : '發送重設連結'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsForgotPassword(false); setError(null); setMessage(null); }}
              className="text-white/40 hover:text-gold transition-colors text-sm flex items-center justify-center space-x-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回登入</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold gold-gradient tracking-widest mb-2">
            {isSignUp ? '註冊會員' : '歡迎回來'}
          </h1>
          <p className="text-white/40 text-sm">
            {isSignUp ? '加入凝聚力學院，開始您的學習之旅' : '登入您的帳號以繼續學習'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {isSignUp && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input
                type="text"
                placeholder="姓名"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold transition-colors"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
            <input
              type="email"
              placeholder="電子郵件"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold transition-colors"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
            <input
              type="password"
              placeholder="密碼"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {isSignUp && (
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                  type="password"
                  placeholder="再次輸入密碼"
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
          )}

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || (isSignUp && (!confirmPassword || password !== confirmPassword))}
            className="w-full py-4 rounded-xl gold-bg-gradient text-navy-dark font-bold text-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {loading ? '處理中...' : isSignUp ? '立即註冊' : '登入'}
          </button>
        </form>

        {!isSignUp && (
          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsForgotPassword(true); setError(null); }}
              className="text-white/30 hover:text-gold transition-colors text-xs"
            >
              忘記密碼？
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setConfirmPassword(''); }}
            className="text-white/40 hover:text-gold transition-colors text-sm"
          >
            {isSignUp ? '已經有帳號了？立即登入' : '還沒有帳號？立即註冊'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
