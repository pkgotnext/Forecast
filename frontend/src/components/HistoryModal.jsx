import { useState, useEffect } from 'react'
import { forecastApi } from '../utils/api'
import { StageBadge, formatPLN, dateToQuarter } from '../utils/format.jsx'

const CHANGE_TYPE = {
  created: { label: 'Utworzono', color: 'text-emerald-600' },
  updated: { label: 'Zaktualizowano', color: 'text-blue-600' },
  deleted: { label: 'Usunięto', color: 'text-red-600' },
}

const FIELD_LABELS = {
  client_name: 'Klient',
  deal_value: 'Wartość',
  probability: 'Prawdopodobieństwo',
  margin: 'Marża',
  expected_close_date: 'Data zamknięcia',
  stage: 'Etap',
  notes: 'Notatki',
}

export default function HistoryModal({ forecast, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    forecastApi.getHistory(forecast.id)
      .then(({ data }) => setHistory(data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))

    const handleKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [forecast.id, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Historia zmian</h2>
            <p className="text-slate-500 text-sm mt-0.5">{forecast.client_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="text-center text-slate-400 py-8">Ładowanie historii...</div>
          )}

          {!loading && history.length === 0 && (
            <div className="text-center text-slate-400 py-8">Brak historii zmian.</div>
          )}

          {history.map((entry, index) => {
            const ct = CHANGE_TYPE[entry.change_type] || CHANGE_TYPE.updated
            const changedFields = entry.changed_fields
              ? JSON.parse(entry.changed_fields).map(f => FIELD_LABELS[f] || f).join(', ')
              : null

            return (
              <div key={entry.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                    entry.change_type === 'created' ? 'bg-emerald-500' :
                    entry.change_type === 'deleted' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  {index < history.length - 1 && (
                    <div className="w-px flex-1 bg-slate-200 mt-1" />
                  )}
                </div>

                <div className="pb-4 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${ct.color}`}>{ct.label}</span>
                    {entry.changed_by_name && (
                      <span className="text-slate-400 text-xs">przez {entry.changed_by_name}</span>
                    )}
                    <span className="text-slate-400 text-xs font-mono ml-auto">
                      {new Date(entry.recorded_at + 'Z').toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}
                    </span>
                  </div>

                  {changedFields && (
                    <p className="text-slate-500 text-xs mt-1">
                      Zmieniono: <span className="text-slate-700">{changedFields}</span>
                    </p>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-slate-500">Wartość: <span className="text-slate-700">{formatPLN(entry.deal_value)}</span></div>
                    <div className="text-slate-500">Prob.: <span className="text-slate-700">{entry.probability}%</span></div>
                    {entry.margin && <div className="text-slate-500">Marża: <span className="text-slate-700">{formatPLN(entry.margin)}</span></div>}
                    <div className="text-slate-500">Kwartał: <span className="text-slate-700">{dateToQuarter(entry.expected_close_date)}</span></div>
                    <div className="text-slate-500">Etap: <StageBadge stage={entry.stage} /></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}