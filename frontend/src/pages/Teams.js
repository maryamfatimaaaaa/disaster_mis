import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { RefreshCw, UserCheck } from 'lucide-react';

const ST_BADGE = { Available:'badge-green', Assigned:'badge-blue', Busy:'badge-orange', Completed:'badge-gray' };
const TY_BADGE = { Medical:'badge-red', Fire:'badge-orange', Rescue:'badge-blue', Search:'badge-purple' };

const AssignModal = ({ onClose, onSave }) => {
  const [reports, setReports] = useState([]);
  const [teams,   setTeams]   = useState([]);
  const [form,    setForm]    = useState({ report_id:'', team_id:'' });
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    Promise.all([
      API.get('/reports', { params:{ status:'Open' } }),
      API.get('/teams',   { params:{ availability_status:'Available' } }),
    ]).then(([r, t]) => { setReports(r.data.data); setTeams(t.data.data); });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.report_id || !form.team_id) return toast.error('Select both report and team');
    setSaving(true);
    try {
      await API.post('/teams/assign', { report_id: parseInt(form.report_id), team_id: parseInt(form.team_id) });
      toast.success('Team assigned successfully');
      onSave();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Assign Rescue Team</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="form-group">
            <label>Emergency Report</label>
            <select className="input" value={form.report_id} onChange={e=>setForm(f=>({...f,report_id:e.target.value}))}>
              <option value="">Select report...</option>
              {reports.map(r=><option key={r.report_id} value={r.report_id}>#{r.report_id} — {r.location} ({r.severity_level})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Available Team</label>
            <select className="input" value={form.team_id} onChange={e=>setForm(f=>({...f,team_id:e.target.value}))}>
              <option value="">Select team...</option>
              {teams.map(t=><option key={t.team_id} value={t.team_id}>{t.team_name} ({t.team_type})</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spinner" style={{width:14,height:14}} /> : <UserCheck size={14} />} Assign Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Teams() {
  const { isRole } = useAuth();
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [filter,  setFilter]  = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? { availability_status: filter } : {};
      const res = await API.get('/teams', { params });
      setTeams(res.data.data);
    } catch { toast.error('Failed to load teams'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const canAssign = isRole('Administrator','Emergency Operator');

  return (
    <div className="fade-in">
      {modal && <AssignModal onClose={() => setModal(false)} onSave={() => { setModal(false); load(); }} />}

      <div className="page-header">
        <div>
          <div className="page-title">Rescue Teams</div>
          <div className="page-subtitle">{teams.length} teams total</div>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
          {canAssign && <button className="btn btn-primary" onClick={() => setModal(true)}><UserCheck size={14} />Assign Team</button>}
        </div>
      </div>

      <div className="filters">
        <select className="input" value={filter} onChange={e => { setFilter(e.target.value); }}>
          <option value="">All Status</option>
          {['Available','Assigned','Busy','Completed'].map(v=><option key={v}>{v}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Team Name</th><th>Type</th><th>Location</th><th>Status</th><th>Capacity</th><th>Last Updated</th></tr>
              </thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.team_id}>
                    <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>{t.team_id}</td>
                    <td style={{ fontWeight:500 }}>{t.team_name}</td>
                    <td><span className={`badge ${TY_BADGE[t.team_type]}`}>{t.team_type}</span></td>
                    <td style={{ color:'var(--text2)' }}>{t.current_location || '—'}</td>
                    <td><span className={`badge ${ST_BADGE[t.availability_status]}`}>{t.availability_status}</span></td>
                    <td style={{ fontFamily:'monospace' }}>{t.capacity}</td>
                    <td style={{ color:'var(--text2)', fontSize:'0.78rem' }}>{new Date(t.last_updated).toLocaleDateString()}</td>
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
