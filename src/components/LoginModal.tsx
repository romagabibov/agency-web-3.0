import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { sanitizeKey, verifyPassword } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export const LoginModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { lang, users, models, setCurrentAdmin, setCurrentModel, setSessionStartTime, updateState } = useAppContext();
  const t = translations[lang];

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [pendingAuth, setPendingAuth] = useState<{ email: string, type: 'admin' | 'model', user: any } | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const finalizeLogin = async (type: 'admin' | 'model', user: any) => {
    const now = new Date().toISOString();
    if (type === 'admin') {
      const newUsers = users.map(u => u.login === user.login ? { ...u, lastLogin: now } : u);
      await updateState({ users: newUsers });
      setCurrentAdmin(user.login);
    } else {
      const newModels = models.map(m => m.id === user.id ? { ...m, lastLogin: now } : m);
      await updateState({ models: newModels });
      setCurrentModel({ ...user, lastLogin: now });
    }
    setSessionStartTime(Date.now());
    onClose();
  };

  const handleAuth = async (e?: React.FormEvent, googleEmail?: string, overridePass?: string) => {
    if (e) e.preventDefault();
    setError('');

    const loginRaw = (googleEmail || login).trim();
    const passRaw = overridePass || password;

    if (!googleEmail && (!loginRaw || !passRaw)) {
      setError('Please enter credentials');
      return;
    }

    try {
      if (!googleEmail) {
        try {
          if (loginRaw.includes('@')) {
            await signInWithEmailAndPassword(auth, loginRaw, passRaw);
          }
        } catch (authError: any) {
          console.log("Firebase Auth failed, falling back to legacy check", authError);
        }
      }

      let foundAdmin = null;
      for (const u of users) {
        if (
          u.login === loginRaw || 
          (u.email && u.email.toLowerCase() === loginRaw.toLowerCase()) ||
          (u.login === 'admin' && loginRaw === 'vnsbek@gmail.com')
        ) {
          if (googleEmail && !overridePass) {
            foundAdmin = u; break;
          } else if (auth.currentUser && auth.currentUser.email === u.email) {
            foundAdmin = u; break;
          } else if (u.hash) {
            if (await verifyPassword(u.hash, passRaw)) { foundAdmin = u; break; }
          } else if (u.pass === passRaw) {
            foundAdmin = u; break;
          }
        }
      }

      if (foundAdmin) {
        if (googleEmail) {
          const lastVerified = localStorage.getItem(`2fa_${googleEmail}`);
          if (lastVerified && Date.now() - parseInt(lastVerified) < 30 * 60 * 1000) {
            await finalizeLogin('admin', foundAdmin);
            return;
          }
          
          // Need 2FA
          setPendingAuth({ email: googleEmail, type: 'admin', user: foundAdmin });
          await send2FACode(googleEmail);
          return;
        }
        await finalizeLogin('admin', foundAdmin);
        return;
      }

      const loginKey = sanitizeKey(loginRaw);
      const model = models.find(m =>
        (m.modelLogin === loginKey || (m.email && m.email.toLowerCase() === loginRaw.toLowerCase())) &&
        ((googleEmail && !overridePass) || m.modelPass === passRaw)
      );

      if (model) {
        if (googleEmail) {
          const lastVerified = localStorage.getItem(`2fa_${googleEmail}`);
          if (lastVerified && Date.now() - parseInt(lastVerified) < 30 * 60 * 1000) {
            await finalizeLogin('model', model);
            return;
          }
          
          // Need 2FA
          setPendingAuth({ email: googleEmail, type: 'model', user: model });
          await send2FACode(googleEmail);
          return;
        }
        await finalizeLogin('model', model);
      } else {
        setError('ACCESS DENIED');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const send2FACode = async (email: string) => {
    setIsSendingCode(true);
    setError('');
    try {
      const res = await fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send code');
      
      setShow2FA(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send verification code');
      setPendingAuth(null);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuth || !twoFACode) return;
    
    setError('');
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingAuth.email, code: twoFACode })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Invalid code');
      
      localStorage.setItem(`2fa_${pendingAuth.email}`, Date.now().toString());
      await finalizeLogin(pendingAuth.type, pendingAuth.user);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;
      if (email) {
        handleAuth(undefined, email);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User intentionally closed the popup, do nothing
        return;
      }
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Please add this app URL to Firebase Console -> Authentication -> Settings -> Authorized domains.');
      } else {
        setError('Google Sign-In failed. Please use standard login with your email and password.');
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 border border-white/10 p-8 md:p-10 rounded-3xl w-full max-w-sm shadow-2xl relative flex flex-col items-center my-8"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>

          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 text-white border border-white/10">
            <Lock size={32} />
          </div>

          <h3 className="text-2xl font-black uppercase mb-8 text-white tracking-tight text-center">
            {show2FA ? 'Verification' : t.secure_login}
          </h3>

          {show2FA ? (
            <form onSubmit={handleVerify2FA} className="w-full space-y-4">
              <p className="text-sm text-zinc-400 text-center mb-4">
                A 6-digit code has been sent to your email. It is valid for 10 minutes.
              </p>
              <div>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all text-center font-medium tracking-widest"
                  required
                  maxLength={6}
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold text-center uppercase tracking-wider">{error}</p>}
              <button
                type="submit"
                className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 px-4 rounded-xl transition-colors shadow-lg mt-4 uppercase tracking-widest text-sm"
              >
                Verify Code
              </button>
              <button
                type="button"
                onClick={() => { setShow2FA(false); setPendingAuth(null); setTwoFACode(''); }}
                className="w-full bg-transparent text-zinc-500 hover:text-white font-bold py-2 px-4 rounded-xl transition-colors mt-2 uppercase tracking-widest text-xs"
              >
                Cancel
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="w-full space-y-4">
              <div>
                <input
                  type="text"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  placeholder={t.login_placeholder}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all text-center font-medium"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t.access_key}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all text-center font-medium"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-xs font-bold text-center uppercase tracking-wider">{error}</p>}

              <button
                type="submit"
                disabled={isSendingCode}
                className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 px-4 rounded-xl transition-colors shadow-lg mt-4 uppercase tracking-widest text-sm disabled:opacity-50"
              >
                {t.authorize}
              </button>
              
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSendingCode}
                className="w-full bg-black hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isSendingCode ? 'Sending Code...' : t.sign_in_google}
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
