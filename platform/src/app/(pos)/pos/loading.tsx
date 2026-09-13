export default function PosLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg, #0D0D0F)',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div className="spinner" style={{ width: 40, height: 40 }} />
      <p style={{ color: 'var(--color-text-secondary, #8E8E93)', fontSize: 14, fontWeight: 600 }}>
        Loading POS Terminal...
      </p>
    </div>
  )
}
