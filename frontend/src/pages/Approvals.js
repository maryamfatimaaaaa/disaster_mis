import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const ST = { Pending:'badge-yellow', Approved:'badge-green', Rejected:'badge-red' };
const RT = { ResourceAllocation:'badge-blue', TeamDeployment:'badge-purple', Expense:'badge-orange', Other:'badge-gray' };

export default function Approvals() {
  const { isRole } = useAuth();
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const res = await API.get('/approvals', { params });
      setData(res.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const action = async (id, decision) => {
    try {
      await API.put(`/approvals/${id}/action`, { decision });
      toast.success(`Request ${decision}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const canAction = isRole('Administrator','Warehouse Manager','Finance Officer');

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Approval Requests</div>
          <div className="page-subtitle">{data.filter(d=>d.status==='Pending').length} pending</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
      </div>

      <div className="filters">
        <select className="input" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="">All Status</option>
          {['Pending','Approved','Rejected'].map(v=><option key={v}>{v}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Type</th><th>Ref ID</th><th>Requested By</th><th>Status</th><th>Remarks</th><th>Date</th>{canAction && <th>Action</th>}</tr>
              </thead>
              <tbody>
                {data.map(a=>(
                  <tr key={a.approval_id}>
                    <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>{a.approval_id}</td>
                    <td><span className={`badge ${RT[a.request_type]}`}>{a.request_type}</span></td>
                    <td style={{ fontFamily:'monospace', color:'var(--text2)' }}>#{a.reference_id}</td>
                    <td style={{ color:'var(--text2)' }}>{a.requested_by_user}</td>
                    <td><span className={`badge ${ST[a.status]}`}>{a.status}</span></td>
                    <td style={{ color:'var(--text2)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.remarks || '—'}</td>
                    <td style={{ color:'var(--text2)', fontSize:'0.78rem' }}>{new Date(a.requested_at).toLocaleDateString()}</td>
                    {canAction && (
                      <td>
                        {a.status === 'Pending' ? (
                          <div style={{ display:'flex', gap:'0.4rem' }}>
                            <button className="btn btn-success btn-sm" onClick={()=>action(a.approval_id,'Approved')} title="Approve">
                              <CheckCircle size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={()=>action(a.approval_id,'Rejected')} title="Reject">
                              <XCircle size={13} />
                            </button>
                          </div>
                        ) : <span style={{ color:'var(--text3)', fontSize:'0.78rem' }}>Done</span>}
                      </td>
                    )}
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
