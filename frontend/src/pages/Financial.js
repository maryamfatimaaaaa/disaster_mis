import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { RefreshCw, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#2563eb','#22c55e','#f97316','#a855f7','#ef4444'];

const AddModal = ({ type, onClose, onSave }) => {
  const isDon = type === 'donation';
  const [form, setForm] = useState({ donor_name:'', donor_type:'Individual', amount:'', payment_method:'Cash', expense_category:'', description:'', expense_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isDon) await API.post('/financial/donations', { donor_name:form.donor_name, donor_type:form.donor_type, amount:parseFloat(form.amount), payment_method:form.payment_method });
      else        await API.post('/financial/expenses',  { expense_category:form.expense_category, amount:parseFloat(form.amount), description:form.description, expense_date:form.expense_date });
      toast.success(`${isDon ? 'Donation' : 'Expense'} recorded`);
      onSave();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Record {isDon ? 'Donation' : 'Expense'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {isDon ? (<>
            <div className="form-group"><label>Donor Name</label><input className="input" value={form.donor_name} onChange={e=>set('donor_name',e.target.value)} /></div>
            <div className="form-row">
              <div className="form-group"><label>Donor Type</label>
                <select className="input" value={form.donor_type} onChange={e=>set('donor_type',e.target.value)}>
                  {['Individual','Organization','Government'].map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Payment Method</label>
                <select className="input" value={form.payment_method} onChange={e=>set('payment_method',e.target.value)}>
                  {['Cash','Bank Transfer','Online','Cheque'].map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </>) : (<>
            <div className="form-group"><label>Category</label><input className="input" placeholder="e.g. Transport, Medical" value={form.expense_category} onChange={e=>set('expense_category',e.target.value)} /></div>
            <div className="form-group"><label>Description</label><textarea className="input" rows={2} value={form.description} onChange={e=>set('description',e.target.value)} /></div>
            <div className="form-group"><label>Date</label><input type="date" className="input" value={form.expense_date} onChange={e=>set('expense_date',e.target.value)} /></div>
          </>)}
          <div className="form-group"><label>Amount (PKR)</label><input type="number" className="input" placeholder="0" value={form.amount} onChange={e=>set('amount',e.target.value)} /></div>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Financial() {
  const [summary,   setSummary]   = useState(null);
  const [donations, setDonations] = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('overview');
  const [modal,     setModal]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, d, e] = await Promise.all([
        API.get('/financial/summary'),
        API.get('/financial/donations'),
        API.get('/financial/expenses'),
      ]);
      setSummary(s.data.data);
      setDonations(d.data.data);
      setExpenses(e.data.data);
    } catch { toast.error('Failed to load financial data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmt = (n) => `PKR ${parseInt(n||0).toLocaleString()}`;

  return (
    <div className="fade-in">
      {modal && <AddModal type={modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}

      <div className="page-header">
        <div>
          <div className="page-title">Financial Management</div>
          <div className="page-subtitle">Donations & expenses tracking</div>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn btn-success btn-sm" onClick={() => setModal('donation')}><Plus size={13} />Donation</button>
          <button className="btn btn-danger btn-sm"  onClick={() => setModal('expense')}><Plus size={13} />Expense</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem' }}>
        {['overview','donations','expenses'].map(t=>(
          <button key={t} className={`btn ${tab===t?'btn-primary':'btn-ghost'} btn-sm`} onClick={()=>setTab(t)} style={{ textTransform:'capitalize' }}>{t}</button>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <>
          {tab === 'overview' && summary && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'1.25rem' }}>
                <div className="stat-card"><div className="stat-label">Total Donations</div><div className="stat-value" style={{ fontSize:'1.4rem', color:'var(--green)' }}>{fmt(summary.overall?.total_donations)}</div></div>
                <div className="stat-card"><div className="stat-label">Total Expenses</div><div className="stat-value" style={{ fontSize:'1.4rem', color:'var(--red)' }}>{fmt(summary.overall?.total_expenses)}</div></div>
                <div className="stat-card"><div className="stat-label">Net Balance</div><div className="stat-value" style={{ fontSize:'1.4rem', color: parseFloat(summary.overall?.net_balance)>=0?'var(--green)':'var(--red)' }}>{fmt(summary.overall?.net_balance)}</div></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div className="card">
                  <h3 style={{ marginBottom:'1rem' }}>By Donor Type</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={summary.by_donor_type} barSize={36}>
                      <XAxis dataKey="donor_type" tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v=>`PKR ${parseInt(v).toLocaleString()}`} contentStyle={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8 }} />
                      <Bar dataKey="total" name="Amount" radius={[4,4,0,0]}>
                        {summary.by_donor_type.map((_,i)=><Cell key={i} fill={COLORS[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h3 style={{ marginBottom:'1rem' }}>By Disaster Type</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={summary.by_disaster_type} barSize={24}>
                      <XAxis dataKey="disaster_type" tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v=>`PKR ${parseInt(v).toLocaleString()}`} contentStyle={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8 }} />
                      <Bar dataKey="donations" name="Donations" fill="var(--green)" radius={[4,4,0,0]} />
                      <Bar dataKey="expenses"  name="Expenses"  fill="var(--red)"   radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {tab === 'donations' && (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Donor</th><th>Type</th><th>Amount</th><th>Method</th><th>Recorded By</th><th>Date</th></tr></thead>
                  <tbody>
                    {donations.map(d=>(
                      <tr key={d.donation_id}>
                        <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>{d.donation_id}</td>
                        <td style={{ fontWeight:500 }}>{d.donor_name}</td>
                        <td><span className="badge badge-blue">{d.donor_type}</span></td>
                        <td style={{ fontFamily:'monospace', color:'var(--green)', fontWeight:600 }}>PKR {parseInt(d.amount).toLocaleString()}</td>
                        <td style={{ color:'var(--text2)' }}>{d.payment_method || '—'}</td>
                        <td style={{ color:'var(--text2)' }}>{d.recorded_by_user}</td>
                        <td style={{ color:'var(--text2)', fontSize:'0.78rem' }}>{new Date(d.donated_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'expenses' && (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Category</th><th>Amount</th><th>Description</th><th>Recorded By</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {expenses.map(e=>(
                      <tr key={e.expense_id}>
                        <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>{e.expense_id}</td>
                        <td style={{ fontWeight:500 }}>{e.expense_category}</td>
                        <td style={{ fontFamily:'monospace', color:'var(--red)', fontWeight:600 }}>PKR {parseInt(e.amount).toLocaleString()}</td>
                        <td style={{ color:'var(--text2)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description || '—'}</td>
                        <td style={{ color:'var(--text2)' }}>{e.recorded_by_user}</td>
                        <td><span className={`badge ${e.status==='Approved'?'badge-green':e.status==='Rejected'?'badge-red':'badge-yellow'}`}>{e.status}</span></td>
                        <td style={{ color:'var(--text2)', fontSize:'0.78rem' }}>{e.expense_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
