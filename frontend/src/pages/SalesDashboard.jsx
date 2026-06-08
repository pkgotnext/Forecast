import { useState, useEffect, useCallback } from 'react'
import { forecastApi } from '../utils/api'
import { useAuth } from '../store/AuthContext'
import Navbar from '../components/Navbar'
import StatsCards from '../components/StatsCards'
import ForecastTable from '../components/ForecastTable'
import ForecastModal from '../components/ForecastModal'
import { STAGE_CONFIG } from '../utils/format'
import ConfirmModal from '../components/ConfirmModal'
import RecurringForecastModal from '../components/RecurringForecastModal'
import GroupEditModal from '../components/GroupEditModal'

export default function SalesDashboard() {
  const { user } = useAuth()
  const [forecasts, setForecasts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ sort_by: 'expected_close_date', sort_dir: 'asc' })
  const [total, setTotal] = useState(0)
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [recurringModal, setRecurringModal] = useState(false)
  const PAGE_SIZE = 20
  const [recurringFilter, setRecurringFilter] = useState('')
  const [groupEditModal, setGroupEditModal] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE, ...sort }
      if (stageFilter) params.stage = stageFilter
      if (recurringFilter === 'recurring') params.recurring = true
      if (recurringFilter === 'normal') params.recurring = false
      const { data } = await forecastApi.getMy(params)
      setForecasts(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, stageFilter, sort, recurringFilter])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const { data } = await forecastApi.getMyStats()
      setStats(data)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchStats() }, [fetchStats])

  const doEditGroup = async (data) => {
    await forecastApi.updateGroup(groupEditModal.recurring_group_id, data)
    setGroupEditModal(null)
    fetchData()
    fetchStats()
  }

  const handleDelete = (f) => {
    setConfirmDelete(f)
  }

  const doDelete = async () => {
    if (confirmDelete._isGroup) {
      await forecastApi.removeGroup(confirmDelete.recurring_group_id)
    } else {
      await forecastApi.remove(confirmDelete.id)
    }
    setConfirmDelete(null)
    fetchData()
    fetchStats()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-screen-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Moje Forecasty</h1>
            <p className="text-slate-500 text-sm mt-0.5">Witaj, {user?.full_name}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => setModal('new')}>
              + Nowy forecast
            </button>
            <button className="btn-primary" onClick={() => setRecurringModal(true)}>
              + Forecast Rekurencyjny
            </button>
          </div>
        </div>

        <StatsCards stats={stats} loading={statsLoading} />

        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="input w-auto"
            value={recurringFilter}
            onChange={(e) => { setRecurringFilter(e.target.value); setPage(1) }}
          >
            <option value="">Wszystkie typy</option>
            <option value="normal">Tylko zwykłe</option>
            <option value="recurring">Tylko rekurencyjne</option>
          </select>
          
          <select
            className="input w-auto"
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setPage(1) }}
          >
            <option value="">Wszystkie etapy</option>
            {Object.entries(STAGE_CONFIG).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            className="input w-auto"
            value={`${sort.sort_by}:${sort.sort_dir}`}
            onChange={(e) => {
              const [sort_by, sort_dir] = e.target.value.split(':')
              setSort({ sort_by, sort_dir })
              setPage(1)
            }}
          >
            <option value="expected_close_date:asc">Data zamknięcia ↑</option>
            <option value="expected_close_date:desc">Data zamknięcia ↓</option>
            <option value="deal_value:desc">Wartość ↓</option>
            <option value="deal_value:asc">Wartość ↑</option>
            <option value="probability:desc">Prawdopodobieństwo ↓</option>
            <option value="client_name:asc">Klient A-Z</option>
          </select>

          {(stageFilter || recurringFilter) && (
            <button onClick={() => { setStageFilter(''); setRecurringFilter(''); setPage(1) }} className="btn-ghost text-sm">
              Wyczyść
            </button>
          )}
          <span className="text-slate-600 text-sm ml-auto">{total} dealów</span>
        </div>

        <ForecastTable
          forecasts={forecasts}
          loading={loading}
          onEdit={(f) => setModal(f)}
          onEditGroup={(group) => setGroupEditModal(group)}
          onDelete={handleDelete}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              className="btn-ghost text-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >Poprzednia</button>
            <span className="text-slate-500 text-sm font-mono">{page} / {totalPages}</span>
            <button
              className="btn-ghost text-sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >Następna</button>
          </div>
        )}
      </main>

      {modal && (
        <ForecastModal
          forecast={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { fetchData(); fetchStats() }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete._isGroup ? 'Usuń grupę rekurencyjną' : 'Usuń forecast'}
          message={
            confirmDelete._isGroup
              ? `Czy na pewno chcesz usunąć wszystkie ${confirmDelete.count} forecasty projektu "${confirmDelete.project_name}" dla "${confirmDelete.client_name}"? Tej operacji nie można cofnąć.`
              : `Czy na pewno chcesz usunąć forecast dla "${confirmDelete.client_name}"? Tej operacji nie można cofnąć.`
          }
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {recurringModal && (
        <RecurringForecastModal
          onClose={() => setRecurringModal(false)}
          onSaved={() => { fetchData(); fetchStats() }}
        />
      )}

      {groupEditModal && (
        <GroupEditModal
          group={groupEditModal}
          onClose={() => setGroupEditModal(null)}
          onSaved={doEditGroup}
        />
      )}
      
    </div>
  )
}