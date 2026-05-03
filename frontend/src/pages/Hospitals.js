import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { RefreshCw, Hospital } from 'lucide-react';

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [patients,  setPatients]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('hospitals');

  const load = async () => {
    setLoading(true);
    try {
      const [h, p] = await Promise.all([
        API.get('/hospitals/hospitals'),
        API.get('/hospitals/patients'),
      ]);
      setHospitals(h.data.data);
      setPatients(p.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const TAB = { hospitals: 'Hospitals', patients: 'Patients' };
  const SEV = { Stable:'badge-green', Critical:'badge-red', Deceased:'badge-gray' };
  const PST = { Admitted:'badge-blue', Discharged:'badge-green', Deceased:'badge-gray' };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Hospitals & Patients</div>
          <div className="page-subtitle">{hospitals.length} hospitals · {patients.length} patients</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem' }}>
        {Object.entries(TAB).map(([k,v]) => (
          <button key={k} className={`btn ${tab===k?'btn-primary':'btn-ghost'} btn-sm`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (

        tab === 'hospitals' ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:'1rem' }}>
            {hospitals.map(h => {
              const pct = parseFloat(h.availability_pct);
              const color = pct > 50 ? 'var(--green)' : pct > 20 ? 'var(--yellow)' : 'var(--red)';
              return (
                <div key={h.hospital_id} className="card">
                  <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'1rem' }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:'rgba(37,99,235,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Hospital size={16} color="var(--primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{h.hospital_name}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text2)' }}>{h.location}</div>
                    </div>
                  </div>
                  {/* Capacity bar */}
                  <div style={{ marginBottom:'0.75rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text2)', marginBottom:4 }}>
                      <span>Bed Availability</span>
                      <span style={{ color }}>{h.available_beds}/{h.total_beds}</span>
                    </div>
                    <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 0.3s' }} />
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'var(--text2)' }}>
                    <span>{pct}% available</span>
                    {h.contact_number && <span>{h.contact_number}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Patient</th><th>Age</th><th>Condition</th><th>Hospital</th><th>Incident</th><th>Status</th><th>Admitted</th></tr>
                </thead>
                <tbody>
                  {patients.map(p => (
                    <tr key={p.patient_id}>
                      <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>{p.patient_id}</td>
                      <td style={{ fontWeight:500 }}>{p.patient_name}</td>
                      <td style={{ color:'var(--text2)' }}>{p.age || '—'}</td>
                      <td><span className={`badge ${SEV[p.condition_severity]}`}>{p.condition_severity}</span></td>
                      <td style={{ color:'var(--text2)' }}>{p.hospital_name}</td>
                      <td style={{ color:'var(--text2)', fontSize:'0.78rem' }}>{p.incident_location}</td>
                      <td><span className={`badge ${PST[p.status]}`}>{p.status}</span></td>
                      <td style={{ color:'var(--text2)', fontSize:'0.78rem' }}>{new Date(p.admitted_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
