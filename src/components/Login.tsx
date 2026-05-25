import { FormEvent, useState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
    else window.location.reload();
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <form onSubmit={submit} className="card p-6 sm:p-8 max-w-md w-full space-y-4">
        <div className="text-center">
          <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-blue-600 text-white mb-3">
            <LogIn size={26} />
          </div>
          <h1 className="text-2xl font-bold">ចូលប្រើ Admin</h1>
          <p className="text-slate-500 text-sm mt-1">សម្រាប់គ្រូ និងអ្នកគ្រប់គ្រងទិន្នន័យសិស្ស</p>
        </div>
        <div>
          <label className="label">អុីម៉ែល</label>
          <input
            className="input"
            type="email"
            placeholder="teacher@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">ពាក្យសម្ងាត់</label>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {err && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          ចូលប្រើ
        </button>
      </form>
    </div>
  );
}
