import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Menu, X, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [discordUrl, setDiscordUrl] = React.useState('https://discord.com');

  React.useEffect(() => {
    async function fetchDiscordUrl() {
      const { data } = await supabase
        .from('site_settings')
        .select('content')
        .eq('key', 'discord_url')
        .single();
      if (data?.content) {
        setDiscordUrl(data.content);
      }
    }
    fetchDiscordUrl();
  }, []);

  const navLinks = [
    { name: '首頁', href: '/' },
    { name: '所有課程', href: '/courses' },
    { name: '課程交流', href: discordUrl, external: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <GraduationCap className="w-8 h-8 text-gold" />
            <span className="text-2xl font-bold gold-gradient tracking-widest">凝聚力學院</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-white/70 hover:text-gold transition-colors"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm font-medium text-white/70 hover:text-gold transition-colors"
                >
                  {link.name}
                </Link>
              )
            ))}
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-2 text-sm font-medium text-white/70 hover:text-gold transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>個人中心</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="p-2 text-white/50 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-6 py-2 rounded-full gold-bg-gradient text-navy-dark font-bold text-sm hover:scale-105 transition-transform"
              >
                登入 / 註冊
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden glass border-t border-white/5"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-4 text-base font-medium text-white/70 hover:text-gold"
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-4 text-base font-medium text-white/70 hover:text-gold"
                  >
                    {link.name}
                  </Link>
                )
              ))}
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-4 text-base font-medium text-white/70 hover:text-gold"
                  >
                    個人中心
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                    className="block w-full text-left px-3 py-4 text-base font-medium text-red-400"
                  >
                    登出
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-4 text-base font-bold text-gold"
                >
                  登入 / 註冊
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
