import { useForm } from 'react-hook-form'
import { STAGE_CONFIG } from '../utils/format'

function generateMonths() {
  const months = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']
  const now = new Date()
  const result = []
  for (let y = now.getFullYear(); y <= now.getFullYear() + 3; y++) {
    for (let m = 0; m < 12; m++) {
      if (y === now.getFullYear() && m < now.getMonth()) continue
      result.push(`${months[m]} ${y}`)
    }
  }
  return result
}

export default function GroupEditModal({ group, onClose, onSaved }) {
  const firstForecast = group.forecasts[0]
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      client_name: group.client_name,
      project_name: group.project_name || '',
      stage: firstForecast?.stage || 'prospecting',
      probability: firstForecast?.probability || 50,
      wdrozenie: firstForecast?.wdrozenie || 'nie',
      producent: firstForecast?.producent || '',
      data_faktury: firstForecast?.data_faktury || '',
      data_platnosci: firstForecast?.data_platnosci || '',
      architektura: firstForecast?.architektura || '',
    }
  })

  const onSubmit = async (data) => {
    await onSaved({ ...data, probability: Number(data.probability) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Edytuj całą grupę</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge bg-violet-100 text-violet-700 text-xs">↻ REK {group.forecasts.length}Q</span>
              <span className="text-slate-400 text-xs">Zmiany zostaną zastosowane do wszystkich {group.forecasts.length} kwartałów</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nazwa klienta</label>
            <input className="input" {...register('client_name')} />
          </div>
          <div>
            <label className="label">Nazwa projektu</label>
            <input className="input" {...register('project_name')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Etap</label>
              <select className="input" {...register('stage')}>
                {Object.entries(STAGE_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prawdopodobieństwo (%)</label>
              <input className="input" type="number" min="0" max="100" {...register('probability')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Wdrożenie</label>
              <select className="input" {...register('wdrozenie')}>
                <option value="nie">Nie</option>
                <option value="tak">Tak</option>
              </select>
            </div>
            <div>
              <label className="label">Producent</label>
              <input className="input" placeholder="np. Cisco" {...register('producent')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data faktury</label>
              <select className="input" {...register('data_faktury')}>
                <option value="">brak</option>
                {generateMonths().map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data płatności</label>
              <select className="input" {...register('data_platnosci')}>
                <option value="">brak</option>
                {generateMonths().map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Architektura</label>
            <textarea className="input resize-none" rows={2} {...register('architektura')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Anuluj</button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Zapisywanie...' : `Zapisz dla wszystkich ${group.forecasts.length} kwartałów`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}