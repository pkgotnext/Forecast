import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { forecastApi } from '../utils/api'
import { STAGE_CONFIG, generateQuarters } from '../utils/format.jsx'

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

export default function RecurringForecastModal({ onClose, onSaved }) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      probability: 50,
      stage: 'prospecting',
      total_margin: 0,
      wdrozenie: 'nie',
    }
  })

  const quarters = generateQuarters()
  const months = generateMonths()
  const openQ = watch('open_quarter')
  const closeQ = watch('close_quarter')
  const totalValue = watch('total_value')

  const parse = (q) => {
    if (!q) return 0
    const [qn, yr] = q.split(' ')
    return parseInt(yr) * 4 + parseInt(qn.replace('Q', '')) - 1
  }

  const calcPreview = () => {
    if (!openQ || !closeQ || !totalValue) return null
    const n = parse(closeQ) - parse(openQ) + 1
    if (n <= 0) return null
    return { quarters: n, perQuarter: (parseFloat(totalValue) / n).toFixed(0) }
  }

  const onSubmit = async (data) => {
    if (data.open_quarter && data.close_quarter) {
      if (parse(data.close_quarter) < parse(data.open_quarter)) {
        alert('Kwartał zamknięcia musi być późniejszy niż kwartał otwarcia.')
        return
      }
    }

    const payload = {
      ...data,
      total_value: Number(data.total_value) || 0,
      total_margin: Number(data.total_margin) || 0,
      probability: Number(data.probability) || 50,
    }

    setLoading(true)
    try {
      await forecastApi.createRecurring(payload)
      onSaved()
      onClose()
    } catch (err) {
      if (err.response) {
        const msg = err.response?.data?.detail
        alert(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Błąd zapisu')
      }
    } finally {
      setLoading(false)
    }
  }
  const p = calcPreview()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Forecast rekurencyjny</h2>
            <p className="text-slate-400 text-xs mt-0.5">Projekt podzielony na kwartały</p>
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
            <input className="input" placeholder="np. McDonald's" {...register('client_name', { required: 'Wymagane' })} />
            {errors.client_name && <p className="text-red-600 text-xs mt-1">{errors.client_name.message}</p>}
          </div>

          <div>
            <label className="label">Nazwa projektu</label>
            <input className="input" placeholder="np. Wdrożenie ERP" {...register('project_name')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Wartość całkowita (PLN) *</label>
              <input className="input" type="number" placeholder="2000000"
                {...register('total_value', { required: 'Wymagane' })} />
              {errors.total_value && <p className="text-red-600 text-xs mt-1">{errors.total_value.message}</p>}
            </div>
            <div>
              <label className="label">Marża całkowita (PLN)</label>
              <input className="input" type="number" placeholder="400000" {...register('total_margin')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Kwartał otwarcia *</label>
              <select className="input" {...register('open_quarter', { required: 'Wymagane' })}>
                <option value="">Wybierz...</option>
                {quarters.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              {errors.open_quarter && <p className="text-red-600 text-xs mt-1">{errors.open_quarter.message}</p>}
            </div>
            <div>
              <label className="label">Kwartał zamknięcia *</label>
              <select className="input" {...register('close_quarter', { required: 'Wymagane' })}>
                <option value="">Wybierz...</option>
                {quarters.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              {errors.close_quarter && <p className="text-red-600 text-xs mt-1">{errors.close_quarter.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prawdopodobieństwo (%) *</label>
              <input className="input" type="number" min="0" max="100"
                {...register('probability', { required: 'Wymagane' })} />
            </div>
            <div>
              <label className="label">Etap *</label>
              <select className="input" {...register('stage', { required: true })}>
                {Object.entries(STAGE_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
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
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data płatności</label>
              <select className="input" {...register('data_platnosci')}>
                <option value="">brak</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Architektura</label>
            <textarea className="input resize-none" rows={2} placeholder="np. SD-WAN, NGFW, WiFi 6..." {...register('architektura')} />
          </div>

          <div>
            <label className="label">Notatki</label>
            <textarea className="input resize-none" rows={2} placeholder="Opcjonalne notatki..." {...register('notes')} />
          </div>

          {p && p.quarters > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-blue-700 text-sm font-medium">Podgląd podziału</p>
              <p className="text-slate-600 text-xs mt-1">
                Zostanie utworzonych <span className="text-slate-800 font-medium">{p.quarters} forecastów</span> po{' '}
                <span className="text-slate-800 font-medium">
                  {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 0 }).format(p.perQuarter)}
                </span>{' '}
                każdy.
              </p>
            </div>
          )}

          {p && p.quarters <= 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-600 text-xs">Kwartał zamknięcia musi być po kwartale otwarcia.</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Anuluj</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Tworzenie...' : `Utwórz ${p?.quarters ? p.quarters + ' forecastów' : 'forecasty'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}