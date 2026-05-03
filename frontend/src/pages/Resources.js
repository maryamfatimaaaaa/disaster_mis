import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const TY_BADGE = { Food:'badge-yellow', Water:'badge-blue', Medicine:'badge-red', Shelter:'badge-purple', Equipment:'badge-gray' };

export default function Resources() {
  const [data,    setData]    = useState([]);
  const [stock,   setStock]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState({ resource_type:'', low_stock:'' });

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filter).filter(([,v])=>v));
      const [r, s] = await Promise.all([
        API.get('/resources', { params }),
        API.get('/resources/stock/summary'),
      ]);
      setData(r.data.data);
      setStock(s.data.data);
    } catch { toast.error('Failed to load resources'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const lowStockCount = data.filter(r => r.is_low_stock).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Resource Inventory</div>
          <div className="page-subtitle" style={{ color: lowStockCount > 0 ? 'var(--orange)' : 'var(--text2)' }}>
            {lowStockCount > 0 && <AlertTriangle size={12} style={{ marginRight:4, verticalAlign:'middle' }} />}
            {lowStockCount} low stock items
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
      </div>

      {/* Stock summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'0.75rem', marginBottom:'1.25rem' }}>
        {stock.map(s => (
          <div key={s.resource_type} className="stat-card">
            <div className="stat-label">{s.resource_type}</div>
            <div className="stat-value" style={{ fontSize:'1.5rem' }}>{parseInt(s.total_quantity).toLocaleString()}</div>
            <div style={{ fontSize:'0.72rem', color: parseInt(s.low_stock_count) > 0 ? 'var(--orange)' : 'var(--text2)' }}>
              {parseInt(s.low_stock_count) > 0 ? `⚠ ${s.low_stock_count} low stock` : `${s.item_count} items`}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters">
        <select className="input" value={filter.resource_type} onChange={e=>setFilter(f=>({...f,resource_type:e.target.value}))}>
          <option value="">All Types</option>
          {['Food','Water','Medicine','Shelter','Equipment'].map(v=><option key={v}>{v}</option>)}
        </select>
        <select className="input" value={filter.low_stock} onChange={e=>setFilter(f=>({...f,low_stock:e.target.value}))}>
          <option value="">All Stock</option>
          <option value="true">Low Stock Only</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Resource</th><th>Type</th><th>Qty Available</th><th>Reorder At</th><th>Unit</th><th>Warehouse</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.resource_id}>
                    <td style={{ color:'var(--text2)', fontFamily:'monospace' }}>{r.resource_id}</td>
                    <td style={{ fontWeight:500 }}>{r.resource_name}</td>
                    <td><span className={`badge ${TY_BADGE[r.resource_type]}`}>{r.resource_type}</span></td>
                    <td style={{ fontFamily:'monospace', fontWeight:600, color: r.is_low_stock ? 'var(--orange)' : 'var(--green)' }}>
                      {r.quantity_available.toLocaleString()}
                    </td>
                    <td style={{ fontFamily:'monospace', color:'var(--text2)' }}>{r.reorder_threshold}</td>
                    <td style={{ color:'var(--text2)' }}>{r.unit}</td>
                    <td style={{ color:'var(--text2)' }}>{r.warehouse_name}</td>
                    <td>
                      {r.is_low_stock
                        ? <span className="badge badge-orange"><AlertTriangle size={9} style={{marginRight:3}} />Low Stock</span>
                        : <span className="badge badge-green">OK</span>}
                    </td>
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
