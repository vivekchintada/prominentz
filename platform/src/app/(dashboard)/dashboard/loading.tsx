export default function DashboardLoading() {
  return (
    <main className="main-content">
      <header className="page-header" style={{ flexShrink: 0 }}>
        <div style={{ width: 160, height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 60, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ width: 100, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </header>
      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Welcome skeleton */}
        <div
          style={{
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-6)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
            height: 140,
          }}
        />
        {/* KPI grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 'var(--space-4)' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                background: 'var(--color-bg-card)',
                borderTop: '3px solid rgba(255,255,255,0.06)',
                boxShadow: 'inset 0 0 0 0.5px var(--color-border)',
                height: 130,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
        {/* Content skeleton */}
        <div
          style={{
            borderRadius: 'var(--radius-xl)',
            background: 'var(--color-bg-card)',
            boxShadow: 'inset 0 0 0 0.5px var(--color-border)',
            height: 300,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>
    </main>
  )
}
