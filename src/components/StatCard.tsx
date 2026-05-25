import { ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  icon?: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
}

const tones: Record<NonNullable<Props['tone']>, string> = {
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-green-600 bg-green-50',
  amber: 'text-amber-600 bg-amber-50',
  red: 'text-red-600 bg-red-50',
  slate: 'text-slate-600 bg-slate-100'
};

export default function StatCard({ title, value, icon, tone = 'blue' }: Props) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-slate-500 truncate">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold mt-1 truncate">{value}</h3>
        </div>
        {icon && (
          <div className={`p-2.5 rounded-xl shrink-0 ${tones[tone]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
