import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { forecastApi } from '../utils/api'
import { STAGE_CONFIG } from '../utils/format'
import { dateToQuarter, quarterToDate, generateQuarters } from '../utils/format.jsx'

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

const STAGES = Object.entries(STAGE_CONFIG).map(([value, { label }]) => ({ value, label }))

function MarginCalculator({ control, setValue }) {
  const dealValue = useWatch({ control, name: 'deal_value' })
  const margin = useWatch({ control, name: 'margin' })

  const pct = dealValue > 0 && margin > 0 ? ((margin / dealValue) * 100).toFixed(1) : null
  const calcFromPct = (p) => {
    if (!dealValue || !p) return
    setValue('margin', Math.round(dealValue * p / 100))
  }

  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2 mt-1 border border-slate-200">
      <p className="text-slate-500 text-xs mb-1.5">Kalkulator marży</p>
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-xs">Szybki %:</span>
        {[10, 15, 20, 25, 30].map(p => (
          <button
            key={p}
            type="button"
            onClick={() => calcFromPct(p)}
            className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 transition-colors"
          >
            {p}%
          </button>
        ))}
        {pct && (
          <span className="ml-auto text-xs font-mono text-amber-600">= {pct}% marży</span>
        )}
      </div>
    </div>
  )
}

export default function ForecastModal({ forecast, onClose, onSaved }) {
  const isEdit = !!forecast?.id

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: isEdit ? {
      ...forecast,
      deal_value: Number(forecast.deal_value),
      margin: forecast.margin ? Number(forecast.margin) : undefined,
      expected_close_date: forecast.expected_close_date?.split('T')[0],
    } : {
      stage: 'prospecting',
      probability: 50,
      wdrozenie: 'nie',
      close_quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
    }
  })

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        expected_close_date: quarterToDate(data.close_quarter),
      }
      delete payload.close_quarter

      if (isEdit) {
        await forecastApi.update(forecast.id, payload)
      } else {
        await forecastApi.create(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.detail
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Błąd zapisu')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {isEdit ? 'Edytuj forecast' : 'Nowy forecast'}
            </h2>
            {isEdit && forecast?.recurring_group_id && (
              <div className="flex items-center gap-2 mt-1">
                <span className="badge bg-violet-100 text-violet-700 text-xs">↻ REK</span>
                <span className="text-slate-400 text-xs">
                  Ten deal jest częścią projektu rekurencyjnego. Edytujesz tylko ten kwartał.
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nazwa klienta *</label>
            <input
              className="input"
              placeholder="np. McDonald's"
              {...register('client_name', { required: 'Wymagane' })}
            />
            {errors.client_name && <p className="text-red-400 text-xs mt-1">{errors.client_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Wartość (PLN) *</label>
              <input
                className="input"
                type="number"
                placeholder="100000"
                {...register('deal_value', { required: 'Wymagane', min: 1, valueAsNumber: true })}
              />
              {errors.deal_value && <p className="text-red-400 text-xs mt-1">{errors.deal_value.message}</p>}
            </div>
            <div>
              <label className="label">Prawdopodobieństwo (%) *</label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                {...register('probability', { required: 'Wymagane', min: 0, max: 100, valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <label className="label">Marża (PLN)</label>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="np. 30000"
              {...register('margin', { valueAsNumber: true })}
            />
            <MarginCalculator control={control} setValue={setValue} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Kwartał zamknięcia *</label>
              <select className="input" {...register('close_quarter', { required: 'Wymagane' })}>
                {generateQuarters().map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Etap *</label>
              <select className="input" {...register('stage', { required: true })}>
                {STAGES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Nazwa projektu</label>
            <input className="input" placeholder="np. Modernizacja sieci LAN" {...register('project_name')} />
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
            <textarea className="input resize-none" rows={2} placeholder="np. SD-WAN, NGFW, WiFi 6..." {...register('architektura')} />
          </div>

          <div>
            <label className="label">Notatki</label>
            <textarea className="input resize-none" rows={3} placeholder="Opcjonalne notatki" {...register('notes')} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Anuluj</button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Dodaj forecast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}