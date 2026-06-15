import { useState, useEffect, useCallback } from 'react'
import { forecastApi, usersApi } from '../utils/api'
import Navbar from '../components/Navbar'
import StatsCards from '../components/StatsCards'
import ForecastTable from '../components/ForecastTable'
import { STAGE_CONFIG, formatPLN } from '../utils/format.jsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'

const STAGE_COLORS = {
  prospecting: '#94a3b8',
  proposal: '#3b82f6',
  negotiation: '#f59e0b',
  closed_won: '#10b981',
  closed_lost: '#ef4444',
}

export default function ManagementDashboard() {
  const [forecasts, setForecasts] = useState([])
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [filters, setFilters] = useState({ user_id: '', stage: '', date_from: '', date_to: '' })
  const [selectedQuarters, setSelectedQuarters] = useState([])
  const [quarterPickerOpen, setQuarterPickerOpen] = useState(false)
  const [sort, setSort] = useState({ sort_by: 'expected_close_date', sort_dir: 'asc' })
  const [selected, setSelected] = useState(new Set())
  const [wdrozenieFilter, setWdrozenieFilter] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [chartYear, setChartYear] = useState(2026)
  const [forecastChartExpanded, setForecastChartExpanded] = useState(false)

  useEffect(() => {
    usersApi.list().then(({ data }) => setUsers(data)).catch(console.error)
  }, [])

  const buildParams = useCallback(() => {
    const params = { page: 1, page_size: 500, ...sort }
    if (filters.user_id) params.user_id = filters.user_id
    if (filters.stage) params.stage = filters.stage
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.recurring === 'recurring') params.recurring = true
    if (filters.recurring === 'normal') params.recurring = false
    return params
  }, [sort, filters])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await forecastApi.getAll(buildParams())
      setForecasts(data.items)
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const params = {}
      if (filters.user_id) params.user_id = filters.user_id
      const { data } = await forecastApi.getAllStats(params)
      setStats(data)
    } finally {
      setStatsLoading(false)
    }
  }, [filters.user_id])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    if (!exportOpen) return
    const handler = (e) => { if (!e.target.closest('[data-export-picker]')) setExportOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  useEffect(() => {
    if (!quarterPickerOpen) return
    const handler = (e) => {
      if (!e.target.closest('[data-quarter-picker]')) setQuarterPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [quarterPickerOpen])

  const handleFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }))

  }
  const QUARTERS = [
  'Q1 2025','Q2 2025','Q3 2025','Q4 2025',
  'Q1 2026','Q2 2026','Q3 2026','Q4 2026',
  'Q1 2027','Q2 2027','Q3 2027','Q4 2027',
]

const parseQuarter = (q) => {
  const [qn, yr] = q.split(' ')
  const qNum = parseInt(qn.replace('Q', ''))
  const year = parseInt(yr)
  return { qNum, year }
}

const quarterToDateRange = (q) => {
  const { qNum, year } = parseQuarter(q)
  const firstMonth = String((qNum - 1) * 3 + 1).padStart(2, '0')
  const lastMonth = qNum * 3
  const lastDay = new Date(year, lastMonth, 0).getDate()
  return {
    from: `${year}-${firstMonth}-01`,
    to: `${year}-${String(lastMonth).padStart(2, '0')}-${lastDay}`
  }
}

const toggleQuarter = (q) => {
  const next = selectedQuarters.includes(q)
    ? selectedQuarters.filter(x => x !== q)
    : [...selectedQuarters, q]
  setSelectedQuarters(next)

  if (next.length === 0) {
    handleFilter('date_from', '')
    handleFilter('date_to', '')
    return
  }
  const ranges = next.map(quarterToDateRange)
  const minFrom = ranges.map(r => r.from).sort()[0]
  const maxTo = ranges.map(r => r.to).sort().reverse()[0]
  handleFilter('date_from', minFrom)
  handleFilter('date_to', maxTo)
}

  const handleExportCsv = () => {
    const headers = ['Klient', 'Projekt', 'Wartość', 'Prawdopodobieństwo', 'Marża', 'Kwartał', 'Etap', 'Handlowiec']
    const rows = forecasts.map(f => [
      f.client_name,
      f.project_name || '',
      f.deal_value,
      f.probability,
      f.margin || '',
      f.expected_close_date,
      f.stage,
      f.user_full_name || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forecast_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    try {
      const params = {}
      if (filters.user_id) params.user_id = filters.user_id
      if (filters.stage) params.stage = filters.stage
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      const { data } = await forecastApi.exportXml(params)
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/xml' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `forecast_${new Date().toISOString().slice(0, 10)}.xml`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Błąd eksportu')
    }
  }

  const quarterlyData = (() => {
    if (!forecasts?.length) return []
    const map = {}
    forecasts.forEach(f => {
      if (!f.expected_close_date) return
      const d = new Date(f.expected_close_date)
      if (d.getFullYear() !== chartYear) return
      const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${chartYear}`
      if (!map[q]) map[q] = { quarter: q, marza: 0, marza_wazona: 0 }
      map[q].marza += Number(f.margin || 0)
      map[q].marza_wazona += Number(f.margin || 0) * f.probability / 100
    })
    return [`Q1 ${chartYear}`, `Q2 ${chartYear}`, `Q3 ${chartYear}`, `Q4 ${chartYear}`].map(q => map[q] || { quarter: q, marza: 0, marza_wazona: 0 })
  })()

  const forecastData = (() => {
    if (!forecasts?.length) return []
    const map = {}
    const currentYear = new Date().getFullYear()
    forecasts.forEach(f => {
      if (!f.expected_close_date) return
      if (['closed_won', 'closed_lost'].includes(f.stage)) return
      const d = new Date(f.expected_close_date)
      if (d.getFullYear() < currentYear) return
      const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`
      if (!map[q]) map[q] = { quarter: q, wartosc_wazona: 0, wartosc: 0, sortKey: d.getFullYear() * 4 + Math.ceil((d.getMonth() + 1) / 3) }
      map[q].wartosc_wazona += Number(f.deal_value) * f.probability / 100
      map[q].wartosc += Number(f.deal_value)
    })
    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey)
  })()

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Dashboard Zarządu</h1>
            <p className="text-slate-500 text-sm mt-0.5">Przegląd forecastów sprzedażowych</p>
          </div>
          <div className="relative" data-export-picker>
            <button className="btn-primary flex items-center gap-2" onClick={() => setExportOpen(p => !p)}>
              Eksportuj
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36">
                <button onClick={() => { handleExport(); setExportOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Eksportuj XML</button>
                <button onClick={() => { handleExportCsv(); setExportOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Eksportuj CSV</button>
              </div>
            )}
          </div>
        </div>

        <StatsCards stats={stats} loading={statsLoading} />

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Marża i marża ważona per kwartał</h3>
            <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-full px-1 py-1">
              <button
                onClick={() => setChartYear(y => y - 1)}
                className="w-6 h-6 flex items-center justify-center rounded-full text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm font-semibold text-indigo-700 w-10 text-center">{chartYear}</span>
              <button
                onClick={() => setChartYear(y => y + 1)}
                className="w-6 h-6 flex items-center justify-center rounded-full text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={quarterlyData} barSize={24} barGap={4}>
              <XAxis dataKey="quarter" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a' }}
                formatter={(value, name) => [
                  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 0 }).format(value),
                  name === 'marza' ? 'Marża' : 'Marża ważona'
                ]}
              />
              <Legend
                formatter={(value) => value === 'marza' ? 'Marża' : 'Marża ważona'}
                wrapperStyle={{ fontSize: 12, color: '#64748b' }}
              />
              <Bar dataKey="marza" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="marza_wazona" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Deale według etapu</h3>
            {stats && (
              <div className="space-y-2">
                {Object.entries(stats.by_stage).map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm">{STAGE_CONFIG[stage]?.label || stage}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.max(4, count / Math.max(...Object.values(stats.by_stage)) * 80)}px`,
                          backgroundColor: STAGE_COLORS[stage] || '#94a3b8'
                        }}
                      />
                      <span className="text-slate-700 text-sm font-mono w-4 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Handlowcy</h3>
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {users.filter(u => u.role === 'sales').map(u => (
                <button
                  key={u.id}
                  onClick={() => handleFilter('user_id', filters.user_id == u.id ? '' : u.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    filters.user_id == u.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <span>{u.full_name}</span>
                  <span className="text-slate-400 text-xs font-mono">{u.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`card p-5 transition-all duration-300 ${forecastChartExpanded ? 'lg:col-span-3' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-slate-500">Prognoza przychodu</h3>
              <button
                onClick={() => setForecastChartExpanded(p => !p)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100"
                title={forecastChartExpanded ? 'Zmniejsz' : 'Powiększ'}
              >
                {forecastChartExpanded ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" /></svg>
                )}
              </button>
            </div>
            <p className="text-slate-400 text-xs mb-4">Wartość ważona per kwartał</p>
            {forecastData.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Brak danych</p>
            ) : (
              <ResponsiveContainer width="100%" height={forecastChartExpanded ? 320 : 160}>
                <BarChart data={forecastData} barSize={forecastChartExpanded ? 32 : 20}>
                  <XAxis dataKey="quarter" tick={{ fill: '#64748b', fontSize: forecastChartExpanded ? 12 : 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: forecastChartExpanded ? 11 : 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a' }}
                    formatter={(value, name) => [
                      new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 0 }).format(value),
                      name === 'wartosc_wazona' ? 'Wartość ważona' : 'Wartość pipeline'
                    ]}
                  />
                  <Bar dataKey="wartosc" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wartosc_wazona" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {forecastChartExpanded && (
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-slate-300 border border-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Wartość pipeline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-indigo-500" />
                  <span className="text-xs font-medium text-slate-500">Wartość ważona</span>
                </div>
              </div>
            )}
          </div>

          
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="input w-auto"
            value={filters.recurring || ''}
            onChange={(e) => handleFilter('recurring', e.target.value)}
          >
            <option value="">Wszystkie typy</option>
            <option value="normal">Tylko zwykłe</option>
            <option value="recurring">Tylko rekurencyjne</option>
          </select>

          <select
            className="input w-auto"
            value={filters.stage}
            onChange={(e) => handleFilter('stage', e.target.value)}
          >
            <option value="">Wszystkie etapy</option>
            {Object.entries(STAGE_CONFIG).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <div className="relative" data-quarter-picker>
            <button
              onClick={() => setQuarterPickerOpen(p => !p)}
              className={`input w-auto flex items-center gap-2 cursor-pointer ${selectedQuarters.length > 0 ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
            >
              <span>
                {selectedQuarters.length === 0
                  ? 'Wszystkie kwartały'
                  : selectedQuarters.length === 1
                  ? selectedQuarters[0]
                  : `${selectedQuarters.length} kwartały`}
              </span>
              <svg className="w-4 h-4 text-slate-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {quarterPickerOpen && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-3 w-48">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Kwartały</p>
                  {selectedQuarters.length > 0 && (
                    <button
                      onClick={() => { setSelectedQuarters([]); handleFilter('date_from', ''); handleFilter('date_to', ''); }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      Wyczyść
                    </button>
                  )}
                </div>
                {['2025', '2026', '2027'].map(year => (
                  <div key={year} className="mb-2">
                    <p className="text-slate-400 text-xs font-mono mb-1">{year}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {['Q1','Q2','Q3','Q4'].map(qn => {
                        const q = `${qn} ${year}`
                        const selected = selectedQuarters.includes(q)
                        return (
                          <button
                            key={q}
                            onClick={() => toggleQuarter(q)}
                            className={`text-xs px-2 py-1 rounded transition-colors font-mono ${
                              selected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-600'
                            }`}
                          >
                            {qn}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>



          {(filters.user_id || filters.stage || filters.date_from || filters.date_to || filters.recurring) && (
            <button
              onClick={() => {
                setFilters({ user_id: '', stage: '', date_from: '', date_to: '', recurring: '' })
                setSelectedQuarter([])
            
              }}
              className="btn-ghost text-sm"
            >
              Wyczyść filtry
            </button>
          )}

          <span className="text-slate-600 text-sm ml-auto">{forecasts.length} dealów</span>
        </div>

      </main>

        <div className="max-w-screen-2xl mx-auto">
          {selected.size > 0 && (() => {
            const selectedForecasts = forecasts.filter(f => selected.has(f.id))
            const totalValue = selectedForecasts.reduce((s, f) => s + Number(f.deal_value), 0)
            const totalMargin = selectedForecasts.reduce((s, f) => s + Number(f.margin || 0), 0)
            const totalWeighted = selectedForecasts.reduce((s, f) => s + Number(f.weighted_margin || 0), 0)
            return (
              <div className="flex items-center gap-6 px-4 py-3 mb-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <span className="text-blue-700 font-medium">{selected.size} zaznaczonych</span>
                <span className="text-slate-500">Wartość: <span className="font-mono font-semibold text-slate-800">{totalValue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</span></span>
                <span className="text-slate-500">Marża: <span className="font-mono font-semibold text-emerald-700">{totalMargin.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</span></span>
                <span className="text-slate-500">Marża ważona: <span className="font-mono font-semibold text-emerald-600">{totalWeighted.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</span></span>
                <button onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 text-xs">Wyczyść</button>
              </div>
            )
          })()}
          <ForecastTable
            forecasts={wdrozenieFilter ? forecasts.filter(f => f.wdrozenie === wdrozenieFilter) : forecasts}
            loading={loading}
            showSalesPerson={true}
            sort={sort}
            onSort={(sort_by, sort_dir) => setSort(sort_by ? { sort_by, sort_dir } : { sort_by: 'expected_close_date', sort_dir: 'asc' })}
            selected={selected}
            onSelect={setSelected}
            wdrozenieFilter={wdrozenieFilter}
            onWdrozenieFilter={setWdrozenieFilter}
          />
        </div>
    </div>
  )
}