import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AlertTriangle, Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [show, setShow]     = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      toast.success(`Welcome, ${user.username}`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(239,68,68,0.08) 0%, transparent 60%)'
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <AlertTriangle size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Disaster MIS</h1>
          <p style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Smart Disaster Response System</p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Username</label>
              <input className="input" placeholder="Enter username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" placeholder="Enter password"
                  type={show ? 'text' : 'password'}
                  style={{ paddingRight: '2.5rem' }}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShow(s => !s)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <LogIn size={15} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Hint */}
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--text2)' }}>
          <strong style={{ color: 'var(--text)' }}>Demo credentials:</strong><br />
          Username: <code style={{ color: 'var(--cyan)' }}>admin_user</code> &nbsp;
          Password: <code style={{ color: 'var(--cyan)' }}>Admin@123</code>
        </div>
      </div>
    </div>
  );
}
