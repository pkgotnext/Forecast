export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1">Anuluj</button>
          <button onClick={onConfirm} className="btn-danger flex-1 py-2">Usuń</button>
        </div>
      </div>
    </div>
  )
}