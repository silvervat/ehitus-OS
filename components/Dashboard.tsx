import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CHART_DATA } from '../constants';
import { Clock, AlertTriangle, CheckCircle, Briefcase } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; sub: string; icon: React.ReactNode; color: string }> = ({ title, value, sub, icon, color }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${color} text-white`}>
                {icon}
            </div>
        </div>
        <p className="text-xs text-slate-400">{sub}</p>
    </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Armatuurlaud</h1>
        <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                Ekspordi
            </button>
            <button className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 shadow-sm">
                + Uus Projekt
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Aktiivsed Projektid" 
            value="12" 
            sub="+2 võrreldes eelmise kuuga" 
            icon={<Briefcase size={20} />} 
            color="bg-blue-500" 
        />
        <StatCard 
            title="Töötunnid Kokku" 
            value="3,450h" 
            sub="See kuu" 
            icon={<Clock size={20} />} 
            color="bg-teal-500" 
        />
        <StatCard 
            title="Kriitilised Teated" 
            value="3" 
            sub="Vajavad tähelepanu" 
            icon={<AlertTriangle size={20} />} 
            color="bg-red-500" 
        />
        <StatCard 
            title="Lõpetatud Tööd" 
            value="98%" 
            sub="Tähtaegadest kinni peetud" 
            icon={<CheckCircle size={20} />} 
            color="bg-green-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">Projektide Kuude Tunnid</h2>
                <select className="text-sm border border-slate-300 rounded-md px-2 py-1 text-slate-600">
                    <option>Viimased 6 kuud</option>
                    <option>See aasta</option>
                </select>
            </div>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={CHART_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{fill: '#f1f5f9'}}
                        />
                        <Bar dataKey="hours" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={40} />
                        <Bar dataKey="budget" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Viimati Muudetud Päevikud</h2>
            <div className="space-y-4">
                {[1,2,3,4,5].map((i) => (
                    <div key={i} className="flex gap-3 items-start pb-3 border-b border-slate-100 last:border-0">
                        <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                        <div>
                            <p className="text-sm font-medium text-slate-800">RMT2507 | Suutarila Multi-purpose Centre</p>
                            <p className="text-xs text-slate-500 mt-0.5">ESMASPÄEV | 24.11.25 | W48 | WD-006 | @Automation Bot</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};