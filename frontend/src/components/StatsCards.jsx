import { formatPLN } from '../utils/format'

function StatCard({ label, value, sub, color = 'text-slate-800', accent }) {
  return (
    <div className={`card p-5 ${accent ? 'border-l-4 ' + accent : ''} flex flex-col items-center text-center`}>
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-semibold ${color} leading-tight`}>{value}</p>
      <p className="text-slate-400 text-xs mt-1.5">{sub}</p>
    </div>
  )
}

export default function StatsCards({ stats, loading }) {
  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="h-3 bg-slate-200 rounded w-20 mb-3" />
          <div className="h-7 bg-slate-200 rounded w-28 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-16" />
        </div>
      ))}
    </div>
  )

  if (!stats) return null

  const avgProb = stats.total_deals > 0
    ? Math.round(Number(stats.weighted_value) / Number(stats.total_value) * 100)
    : 0

  const probColor = avgProb >= 70 ? 'text-emerald-600' : avgProb >= 40 ? 'text-amber-600' : 'text-red-500'
  const probAccent = avgProb >= 70 ? 'border-emerald-400' : avgProb >= 40 ? 'border-amber-400' : 'border-red-400'
  const barColor = avgProb >= 70 ? 'bg-emerald-500' : avgProb >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

      <div className={`card p-5 border-l-4 ${probAccent} relative group`}>
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-3 py-2.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
  <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Średnie ważone prawdopodobieństwo</p>
  <p className="font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-xs">
            wartość_ważona ÷ wartość_pipeline × 100%
          </p>
        </div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">Średnie prawdopodobieństwo</p>
        <p className={`text-3xl font-semibold ${probColor} leading-tight`}>{avgProb}%</p>
        <div className="mt-2 mb-1.5">
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${avgProb}%` }}
            />
          </div>
        </div>
        <p className="text-slate-400 text-xs">{stats.total_deals} aktywnych dealów</p>
      </div>

      <StatCard
        label="Wartość pipeline"
        value={formatPLN(stats.total_value)}
        sub="Łączna wartość dealów"
        color="text-slate-800"
        accent="border-slate-300"
      />
      <StatCard
        label="Wartość ważona"
        value={formatPLN(stats.weighted_value)}
        color="text-blue-600"
        accent="border-blue-400"
      />
    </div>
  )
}