import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, RefreshCw } from 'lucide-react';

const SEV_BADGE = { Critical:'badge-red', High:'badge-orange', Medium:'badge-yellow', Low:'badge-green' };
const STA_BADGE = { Open:'badge-red', InProgress:'badge-blue', Resolved:'badge-green', Closed:'badge-gray' };

const Modal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ location:'', disaster_type:'Flood', severity_level:'Medium', description:'' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.location) return toast.error('Location is required');
    setSaving(true);
    try {
      await API.post('/reports', form);
      toast.success('Report submitted');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>New Emergency Report</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="form-group">
            <label>Location *</label>
            <input className="input" placeholder="e.g. Lahore, Punjab" value={form.location} onChange={e=>set('location',e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Disaster Type</label>
              <select className="input" value={form.disaster_type} onChange={e=>set('disaster_type',e.target.value)}>
                {['Flood','Earthquake','Fire','Other'].map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Severity</label>
              <select className="input" value={form.severity_level} onChange={e=>set('severity_level',e.target.value)}>
                {['Low','Medium','High','Critical'].map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" rows={3} placeholder="Describe the incident..." value={form.description} onChange={e=>set('description',e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spinner" style={{width:14,height:14}} /> : null} Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Reports() {
  const { isRole } = useAuth();
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [filters, setFilters] = useState({ status:'', severity_level:'', disaster_type:'', location:'' });

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v])=>v));
      const res = await API.get('/reports', { params });
      setData(res.data.data);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const canCreate = isRole('Administrator','Emergency Operator');

  return (
    <div className="fade-in">
      {modal && <Modal onClose={() => setModal(false)} onSave={() => { setModal(false); load(); }} />}

      <div className="page-header">
        <div>
          <div className="page-title">Emergency Reports</div>
          <div className="page-subtitle">{data.length} reports found</div>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
          {canCreate && <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={14} />New Report</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <input className="input" placeholder="Search location..." value={filters.location} onChange={e=>setF('location',e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} />
        <select className="input" value={filters.status} onChange={e=>setF('status',e.target.value)}>
          <option value="">All Status</option>
          {['Open','InProgress','Resolved','Closed'].map(v=><option key={v}>{v}</option>)}
        </select>
        <select className="input" value={filters.severity_level} onChange={e=>setF('severity_level',e.target.value)}>
          <option value="">All Severity</option>
          {['Critical','High','Medium','Low'].map(v=><option key={v}>{v}</option>)}
        </select>
        <select className="input" value={filters.disaster_type} onChange={e=>setF('disaster_type',e.target.value)}>
          <option value="">All Types</option>
          {['Flood','Earthquake','Fire','Other'].map(v=><option key={v}>{v}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>
        ) : data.length === 0 ? (
          <div className="empty">No reports found</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Location</th><th>Type</th><th>Severity</th>
                  <th>Status</th><th>Reported By</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.report_id}>
                    <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>{r.report_id}</td>
                    <td>
                      <div style={{ fontWeight:500 }}>{r.location}</div>
                      {r.description && <div style={{ fontSize:'0.75rem', color:'var(--text2)', marginTop:2, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.description}</div>}
                    </td>
                    <td><span className="badge badge-blue">{r.disaster_type}</span></td>
                    <td><span className={`badge ${SEV_BADGE[r.severity_level]}`}>{r.severity_level}</span></td>
                    <td><span className={`badge ${STA_BADGE[r.status]}`}>{r.status}</span></td>
                    <td style={{ color:'var(--text2)' }}>{r.reported_by}</td>
                    <td style={{ color:'var(--text2)', fontSize:'0.78rem' }}>{new Date(r.reported_at).toLocaleDateString()}</td>
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
