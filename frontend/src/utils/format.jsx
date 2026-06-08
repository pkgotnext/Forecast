export const STAGE_CONFIG = {
  prospecting:  { label: 'Prospecting',   color: 'bg-slate-100 text-slate-600' },
  proposal:     { label: 'Proposal',      color: 'bg-blue-100 text-blue-700' },
  negotiation:  { label: 'Negocjacje',    color: 'bg-amber-100 text-amber-700' },
  closed_won:   { label: 'Wygrany',       color: 'bg-emerald-100 text-emerald-700' },
  closed_lost:  { label: 'Przegrany',     color: 'bg-red-100 text-red-700' },
}

export function StageBadge({ stage }) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.prospecting
  return (
    <span className={`badge ${cfg.color}`}>{cfg.label}</span>
  )
}

export function formatPLN(value) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency', currency: 'PLN', minimumFractionDigits: 0
  }).format(Number(value))
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pl-PL')
}

export function dateToQuarter(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const q = Math.ceil((d.getMonth() + 1) / 3)
  return `Q${q} ${d.getFullYear()}`
}

export function quarterToDate(quarter) {
  const [q, year] = quarter.split(' ')
  const qNum = parseInt(q.replace('Q', ''))
  const lastMonth = qNum * 3
  const lastDay = new Date(parseInt(year), lastMonth, 0).getDate()
  return `${year}-${String(lastMonth).padStart(2, '0')}-${lastDay}`
}

export function generateQuarters() {
  const quarters = []
  const now = new Date()
  const currentYear = now.getFullYear()
  for (let year = currentYear; year <= currentYear + 2; year++) {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${year}`)
    }
  }
  return quarters
}