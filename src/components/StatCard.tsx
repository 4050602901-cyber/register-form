import { ReactNode } from 'react';
export default function StatCard({title,value,icon}:{title:string;value:string|number;icon?:ReactNode}){return <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{title}</p><h3 className="text-3xl font-bold mt-1">{value}</h3></div><div className="text-blue-600">{icon}</div></div></div>}
