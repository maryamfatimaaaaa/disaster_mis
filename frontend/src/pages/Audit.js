import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

const AT = { INSERT:'badge-green', UPDATE:'badge-blue', DELETE:'badge-red', LOGIN:'badge-purple', LOGOUT:'badge-gray' };

export default function Audit() {
  const [data,    setData]    = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState({ action_type:'', table_name:'' });

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filter).filter(([,v])=>v));
      const [d, s] = await Promise.all([
        API.get('/audit', { params }),
        API.get('/audit/summary'),
      ]);
      setData(d.data.data);
      setSummary(s.data.data);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Audit Logs</div>
          <div className="page-subtitle">{data.length} entries (latest 500)</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {summary.by_action.map(a=>(
            <div key={a.action_type} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0.6rem 1rem', display:'flex', gap:'0.5rem', alignItems:'center' }}>
              <span className={`badge ${AT[a.action_type]}`}>{a.action_type}</span>
              <span style={{ fontFamily:'monospace', fontWeight:600 }}>{a.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <select className="input" value={filter.action_type} onChange={e=>setFilter(f=>({...f,action_type:e.target.value}))}>
          <option value="">All Actions</option>
          {['INSERT','UPDATE','DELETE','LOGIN','LOGOUT'].map(v=><option key={v}>{v}</option>)}
        </select>
        <input className="input" placeholder="Filter by table..." value={filter.table_name} onChange={e=>setFilter(f=>({...f,table_name:e.target.value}))} />
        <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>User</th><th>Action</th><th>Table</th><th>Record</th><th>New Value</th><th>Timestamp</th></tr>
              </thead>
              <tbody>
                {data.map(l=>(
                  <tr key={l.log_id}>
                    <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>{l.log_id}</td>
                    <td style={{ fontWeight:500 }}>{l.username}</td>
                    <td><span className={`badge ${AT[l.action_type]}`}>{l.action_type}</span></td>
                    <td style={{ color:'var(--cyan)', fontFamily:'monospace', fontSize:'0.78rem' }}>{l.table_name}</td>
                    <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>{l.record_id || '—'}</td>
                    <td style={{ color:'var(--text2)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'0.78rem' }}>{l.new_value || '—'}</td>
                    <td style={{ color:'var(--text2)', fontSize:'0.78rem', whiteSpace:'nowrap' }}>{new Date(l.logged_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
