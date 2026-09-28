import React from 'react';

const MOCK_ROADMAPS = [
  { id: '1', title: 'Aadhar Card Update', user: 'user_124', status: 'Completed', date: '2026-09-28' },
  { id: '2', title: 'Property Tax Payment', user: 'user_89', status: 'In Progress', date: '2026-09-27' },
  { id: '3', title: 'Birth Certificate Request', user: 'user_456', status: 'Failed', date: '2026-09-27' },
  { id: '4', title: 'Driving License Renewal', user: 'user_23', status: 'Completed', date: '2026-09-26' },
];


export const AdminPanel = () => {
  return (
    <div className="w-full h-full bg-slate-50 overflow-y-auto p-8 pointer-events-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">System overview and generated roadmaps monitoring.</p>
          </div>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">
              Export Data
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors font-medium">
              System Settings
            </button>
          </div>
        </div>

        {/* Roadmaps Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Recent Generated Roadmaps</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roadmap Title</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_ROADMAPS.map((roadmap) => (
                  <tr key={roadmap.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">#{roadmap.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{roadmap.title}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{roadmap.user}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{roadmap.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        roadmap.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        roadmap.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {roadmap.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex justify-center">
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              View All Data
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
