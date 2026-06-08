import { StageBadge, formatPLN, dateToQuarter } from '../utils/format.jsx'
import { useState, Fragment, useEffect } from 'react'
import HistoryModal from './HistoryModal'

const ALL_COLUMNS = [
  { key: 'wdrozenie', label: 'Wdrożenie', default: true },
  { key: 'producent', label: 'Producent', default: true },
  { key: 'faktura', label: 'Faktura', default: false },
  { key: 'platnosc', label: 'Płatność', default: false },
  { key: 'architektura', label: 'Architektura', default: false },
  { key: 'kwartal', label: 'Kwartał', default: true },
  { key: 'marza', label: 'Marża', default: true },
  { key: 'marza_wazona', label: 'Marża ważona', default: false },
  { key: 'etap', label: 'Etap', default: true },
  { key: 'notatki', label: 'Notatki', default: false },
]

const NoteCell = ({ notes, id, expandedNotes, toggleNote }) => {
  if (!notes) return <td className="px-3 py-3 text-slate-300 text-xs">—</td>
  const isLong = notes.length > 60
  const isExpanded = expandedNotes[id]
  return (
    <td className="px-3 py-3 text-xs w-[180px] max-w-[180px]">
      <div className="flex items-start gap-1">
        <span className="text-slate-400 break-words min-w-0 flex-1" style={{ wordBreak: 'break-word' }}>
          {isExpanded || !isLong ? notes : notes.slice(0, 60) + '...'}
        </span>
        {isLong && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleNote(id) }}
            className="text-slate-300 hover:text-slate-600 flex-shrink-0 text-xs leading-none mt-0.5 transition-colors"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        )}
      </div>
    </td>
  )
}

  export default function ForecastTable({ forecasts, loading, onEdit, onEditGroup, onDelete, showSalesPerson = false }) {
  const [historyForecast, setHistoryForecast] = useState(null)
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState({})
  const [visibleCols, setVisibleCols] = useState(() =>
    Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.default]))
  )

  const toggleGroup = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleCol = (key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleNote = (id) => setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }))

  useEffect(() => {
    if (!showColumnPicker) return
    const handler = (e) => {
      if (!e.target.closest('[data-column-picker]')) setShowColumnPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColumnPicker])
  const v = visibleCols

  if (loading) return (
    <div className="card overflow-hidden">
      <div className="animate-pulse p-8 text-center text-slate-400">Ładowanie</div>
    </div>
  )

  if (!forecasts?.length) return (
    <div className="card p-12 text-center">
      <p className="text-slate-400">Brak forecastów. Dodaj pierwszy deal.</p>
    </div>
  )

  const groupedForecasts = (() => {
    const groups = []
    const recurringMap = {}
    forecasts.forEach(f => {
      if (f.recurring_group_id) {
        const key = f.recurring_group_id
        if (!recurringMap[key]) {
          recurringMap[key] = {
            key, isGroup: true, forecasts: [],
            client_name: f.client_name, project_name: f.project_name,
            user_id: f.user_id, user_full_name: f.user_full_name,
            user_email: f.user_email, stage: f.stage,
            recurring_group_id: f.recurring_group_id,
          }
          groups.push(recurringMap[key])
        }
        recurringMap[key].forecasts.push(f)
      } else {
        groups.push({ isGroup: false, forecast: f })
      }
    })
    return groups
  })()

  const D = () => <td className="px-3 py-3 text-slate-300 text-xs">—</td>

  return (
    <div className="card overflow-hidden">
      {/* Column picker */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-slate-100">
        <div className="relative" data-column-picker>
            <button
              onClick={() => setShowColumnPicker(p => !p)}
            className="btn-ghost text-sm flex items-center gap-2 px-3 py-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filtruj
          </button>
          {showColumnPicker && (
            <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-48">
              <p className="text-slate-600 text-sm mb-2 font-medium">Pokaż kolumny</p>
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer hover:text-slate-800 text-slate-600 text-sm">
                  <input
                    type="checkbox"
                    checked={v[col.key]}
                    onChange={() => toggleCol(col.key)}
                    className="accent-blue-600"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {showSalesPerson && <th className="text-left px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Handlowiec</th>}
              <th className="text-left px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Klient</th>
              <th className="text-right px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Wartość</th>
              <th className="text-right px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Prob.</th>
              {v.wdrozenie && <th className="text-center px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Wdrożenie</th>}
              {v.producent && <th className="text-left px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Producent</th>}
              {v.faktura && <th className="text-left px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Faktura</th>}
              {v.platnosc && <th className="text-left px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Płatność</th>}
              {v.architektura && <th className="text-left px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Architektura</th>}
              {v.kwartal && <th className="text-left px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Kwartał</th>}
              {v.marza && <th className="text-right px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Marża</th>}
              {v.marza_wazona && <th className="text-right px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Marża ważona</th>}
              {v.etap && <th className="text-left px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Etap</th>}
              {v.notatki && <th className="text-left px-3 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Notatki</th>}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groupedForecasts.map((item) => {
              if (item.isGroup) {
                const isCollapsed = collapsedGroups[item.key] !== false
                const group = item
                const totalValue = group.forecasts.reduce((s, f) => s + Number(f.deal_value), 0)
                const totalMargin = group.forecasts.reduce((s, f) => s + Number(f.margin || 0), 0)
                const avgProb = Math.round(group.forecasts.reduce((s, f) => s + f.probability, 0) / group.forecasts.length)
                const firstDate = group.forecasts[0]?.expected_close_date
                const lastDate = group.forecasts[group.forecasts.length - 1]?.expected_close_date

                return (
                  <Fragment key={`group-${group.key}`}>
                    <tr
                      className="bg-violet-50 hover:bg-violet-100/70 cursor-pointer transition-colors border-l-2 border-violet-400 group/row"
                      onClick={() => toggleGroup(group.key)}
                      title={isCollapsed ? 'Rozwiń' : 'Zwiń'}
                    >
                      {showSalesPerson && (
                        <td className="px-3 py-3 text-slate-700">
                          <div className="font-medium">{group.user_full_name || '—'}</div>
                          <div className="text-slate-400 text-xs">{group.user_email}</div>
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-violet-400 font-medium text-sm">{isCollapsed ? '▾' : '▴'}</span>
                          <span className="font-medium text-slate-800">{group.client_name}</span>
                          <span className="badge bg-violet-100 text-violet-700 text-xs">↻ REK {group.forecasts.length}Q</span>
                        </div>
                        {group.project_name && <p className="text-blue-600 text-xs mt-0.5 ml-5">{group.project_name}</p>}
                        <p className="text-slate-400 text-xs mt-0.5 ml-5 font-mono">{dateToQuarter(firstDate)} → {dateToQuarter(lastDate)}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-slate-800">{formatPLN(totalValue)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`font-mono font-medium ${avgProb >= 70 ? 'text-emerald-600' : avgProb >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>{avgProb}%</span>
                      </td>
                      {v.wdrozenie && <D />}
                      {v.producent && <D />}
                      {v.faktura && <D />}
                      {v.platnosc && <D />}
                      {v.architektura && <D />}
                      {v.kwartal && <td className="px-3 py-3 text-slate-500 font-mono text-xs">{dateToQuarter(firstDate)} → {dateToQuarter(lastDate)}</td>}
                      {v.marza && <td className="px-3 py-3 text-right font-mono text-emerald-700 text-xs font-semibold">{formatPLN(totalMargin)}</td>}
                      {v.marza_wazona && <td className="px-3 py-3 text-right font-mono text-emerald-600 text-xs font-semibold">{formatPLN(totalMargin * avgProb / 100)}</td>}
                      {v.etap && <td className="px-3 py-3"><span className="badge bg-violet-100 text-violet-700">Rekurencyjny</span></td>}
                      {v.notatki && <D />}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {onEditGroup && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditGroup(group) }}
                              className="text-slate-300 hover:text-violet-500 p-1 rounded transition-colors"
                              title="Edytuj całą grupę"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete({ _isGroup: true, recurring_group_id: group.recurring_group_id, client_name: group.client_name, project_name: group.project_name, count: group.forecasts.length }) }}
                              className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                              title="Usuń całą grupę"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {!isCollapsed && group.forecasts.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors bg-violet-50/30 border-l-2 border-violet-200">
                        {showSalesPerson && <td className="px-3 py-3" />}
                        <td className="px-3 py-3 pl-10">
                          <span className="text-slate-500 text-xs font-mono">{dateToQuarter(f.expected_close_date)}</span>
                          <span className="text-slate-300 text-xs font-mono ml-2" title={`ID: ${f.id}`}>#{f.id}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-500 text-xs">{formatPLN(f.deal_value)}</td>
                        <td className="px-3 py-3 text-right"><span className="font-mono text-slate-400 text-xs">{f.probability}%</span></td>
                        {v.wdrozenie && <td className="px-3 py-3 text-center">
                          {f.wdrozenie === 'tak'
                            ? <span className="badge bg-emerald-100 text-emerald-700">Tak</span>
                            : <span className="badge bg-slate-100 text-slate-500">Nie</span>}
                        </td>}
                        {v.producent && <td className="px-3 py-3 text-slate-500 text-xs">{f.producent || '—'}</td>}
                        {v.faktura && <td className="px-3 py-3 text-slate-500 text-xs">{f.data_faktury || '—'}</td>}
                        {v.platnosc && <td className="px-3 py-3 text-slate-500 text-xs">{f.data_platnosci || '—'}</td>}
                        {v.architektura && <td className="px-3 py-3 text-slate-500 text-xs truncate max-w-[150px]">{f.architektura || '—'}</td>}
                        {v.kwartal && <td className="px-3 py-3 text-slate-400 font-mono text-xs">{dateToQuarter(f.expected_close_date)}</td>}
                        {v.marza && <td className="px-3 py-3 text-right font-mono text-emerald-600/70 text-xs">{f.margin ? formatPLN(f.margin) : '—'}</td>}
                        {v.marza_wazona && <td className="px-3 py-3 text-right font-mono text-emerald-500/70 text-xs">{f.weighted_margin ? formatPLN(f.weighted_margin) : '—'}</td>}
                        {v.etap && <td className="px-3 py-3"><StageBadge stage={f.stage} /></td>}
                        {v.notatki && <NoteCell notes={f.notes} id={f.id} expandedNotes={expandedNotes} toggleNote={toggleNote} />}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {onEdit && (
                              <button onClick={(e) => { e.stopPropagation(); onEdit(f) }} className="text-slate-300 hover:text-slate-600 p-1 rounded transition-colors" title="Edytuj kwartał">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            )}
                            <button onClick={() => setHistoryForecast(f)} className="text-slate-300 hover:text-blue-500 p-1 rounded transition-colors" title="Historia zmian">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                )
              }

              const f = item.forecast
              return (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  {showSalesPerson && (
                    <td className="px-3 py-3 text-slate-700">
                      <div className="font-medium">{f.user_full_name || '—'}</div>
                      <div className="text-slate-400 text-xs">{f.user_email}</div>
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{f.client_name}</span>
                      <span className="text-slate-300 text-xs font-mono" title={`ID: ${f.id}`}>#{f.id}</span>
                    </div>
                    {f.project_name && <p className="text-blue-600 text-xs mt-0.5">{f.project_name}</p>}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-slate-700">{formatPLN(f.deal_value)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`font-mono font-medium ${f.probability >= 70 ? 'text-emerald-600' : f.probability >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>{f.probability}%</span>
                  </td>
                  {v.wdrozenie && <td className="px-3 py-3 text-center">
                    {f.wdrozenie === 'tak'
                      ? <span className="badge bg-emerald-100 text-emerald-700">Tak</span>
                      : <span className="badge bg-slate-100 text-slate-500">Nie</span>}
                  </td>}
                  {v.producent && <td className="px-3 py-3 text-slate-500 text-xs">{f.producent || '—'}</td>}
                  {v.faktura && <td className="px-3 py-3 text-slate-500 text-xs">{f.data_faktury || '—'}</td>}
                  {v.platnosc && <td className="px-3 py-3 text-slate-500 text-xs">{f.data_platnosci || '—'}</td>}
                  {v.architektura && <td className="px-3 py-3 text-slate-500 text-xs truncate max-w-[150px]">{f.architektura || '—'}</td>}
                  {v.kwartal && <td className="px-3 py-3 text-slate-500 font-mono text-xs">{dateToQuarter(f.expected_close_date)}</td>}
                  {v.marza && <td className="px-3 py-3 text-right font-mono text-emerald-600 text-xs">{f.margin ? formatPLN(f.margin) : '—'}</td>}
                  {v.marza_wazona && <td className="px-3 py-3 text-right font-mono text-emerald-500 text-xs">{f.weighted_margin ? formatPLN(f.weighted_margin) : '—'}</td>}
                  {v.etap && <td className="px-3 py-3"><StageBadge stage={f.stage} /></td>}
                  {v.notatki && <NoteCell notes={f.notes} id={f.id} expandedNotes={expandedNotes} toggleNote={toggleNote} />}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {onEdit && (
                        <button onClick={() => onEdit(f)} className="text-slate-300 hover:text-slate-600 p-1 rounded transition-colors" title="Edytuj">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      <button onClick={() => setHistoryForecast(f)} className="text-slate-300 hover:text-blue-500 p-1 rounded transition-colors" title="Historia zmian">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                      {onDelete && (
                        <button onClick={() => onDelete(f)} className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors" title="Usuń">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              {showSalesPerson && <td className="px-3 py-3" />}
              <td className="px-3 py-3 text-slate-500 text-xs font-medium">Łącznie ({forecasts.length} dealów)</td>
              <td className="px-3 py-3 text-right font-mono font-semibold text-slate-800">{formatPLN(forecasts.reduce((s, f) => s + Number(f.deal_value), 0))}</td>
              <td className="px-3 py-3" />
              {v.wdrozenie && <td className="px-3 py-3" />}
              {v.producent && <td className="px-3 py-3" />}
              {v.faktura && <td className="px-3 py-3" />}
              {v.platnosc && <td className="px-3 py-3" />}
              {v.architektura && <td className="px-3 py-3" />}
              {v.kwartal && <td className="px-3 py-3" />}
              {v.marza && <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-700">{formatPLN(forecasts.reduce((s, f) => s + Number(f.margin || 0), 0))}</td>}
              {v.marza_wazona && <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-600">{formatPLN(forecasts.reduce((s, f) => s + Number(f.weighted_margin || 0), 0))}</td>}
              {v.etap && <td className="px-3 py-3" />}
              {v.notatki && <td className="px-3 py-3" />}
              <td className="px-3 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      {historyForecast && (
        <HistoryModal
          forecast={historyForecast}
          onClose={() => setHistoryForecast(null)}
        />
      )}
    </div>
  )
}