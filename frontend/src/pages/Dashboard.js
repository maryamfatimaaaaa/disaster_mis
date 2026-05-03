import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { FileWarning, Users, Package, Hospital, TrendingUp, AlertTriangle } from 'lucide-react';

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#2563eb','#a855f7'];

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color }}>{value}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [teams,    setTeams]    = useState([]);
  const [stock,    setStock]    = useState([]);
  const [finance,  setFinance]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/reports/stats/summary'),
      API.get('/teams'),
      API.get('/resources/stock/summary'),
      API.get('/financial/summary').catch(() => ({ data: { data: null } })),
    ]).then(([r, t, s, f]) => {
      setStats(r.data.data);
      setTeams(t.data.data);
      setStock(s.data.data);
      setFinance(f.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading dashboard...</span></div>;

  const teamStatus = [
    { name: 'Available', value: teams.filter(t => t.availability_status === 'Available').length },
    { name: 'Assigned',  value: teams.filter(t => t.availability_status === 'Assigned').length },
    { name: 'Busy',      value: teams.filter(t => t.availability_status === 'Busy').length },
  ].filter(t => t.value > 0);

  const disasterData = stats?.by_disaster_type?.map(d => ({
    name: d.disaster_type, count: parseInt(d.count)
  })) || [];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1>Dashboard</h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginTop: 4 }}>
          Welcome back, <strong style={{ color: 'var(--text)' }}>{user?.username}</strong> &mdash; {user?.role_name}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={FileWarning} label="Total Reports"    value={stats?.summary?.total_reports || 0}    color="var(--red)"    sub={`${stats?.summary?.open_reports || 0} open`} />
        <StatCard icon={AlertTriangle} label="Critical Incidents" value={stats?.summary?.critical_reports || 0} color="var(--orange)" sub="Needs immediate action" />
        <StatCard icon={Users}       label="Rescue Teams"    value={teams.length}                          color="var(--green)"  sub={`${teamStatus.find(t=>t.name==='Available')?.value || 0} available`} />
        <StatCard icon={Package}     label="Resource Types"  value={stock.length}                          color="var(--cyan)"   sub={`${stock.filter(s=>parseInt(s.low_stock_count)>0).length} low stock`} />
        {finance && <StatCard icon={TrendingUp} label="Net Balance" value={`PKR ${parseInt(finance?.overall?.net_balance || 0).toLocaleString()}`} color="var(--purple)" sub="Donations minus expenses" />}
        {finance && <StatCard icon={Hospital}   label="Total Donations" value={`PKR ${parseInt(finance?.overall?.total_donations || 0).toLocaleString()}`} color="var(--yellow)" sub={`${finance?.overall?.donation_count} donors`} />}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* Incidents by type */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>Incidents by Disaster Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={disasterData} barSize={32}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Reports" radius={[4,4,0,0]}>
                {disasterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team status */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>Rescue Team Status</h3>
          {teamStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={teamStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                  {teamStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text2)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty">No team data</div>}
        </div>
      </div>

      {/* Resource stock */}
      <div className="card">
        <h3 style={{ marginBottom: '1.25rem' }}>Resource Stock by Type</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stock} barSize={28}>
            <XAxis dataKey="resource_type" tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total_quantity" name="Quantity" radius={[4,4,0,0]}>
              {stock.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
