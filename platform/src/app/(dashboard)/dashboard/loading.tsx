/** Bento-shaped placeholder shown while a dashboard page loads. */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 6px' }}>
        <div className="bz-skel" style={{ width: 160, height: 14, borderRadius: 6 }} />
        <div className="bz-skel" style={{ width: 'min(520px, 80%)', height: 40, borderRadius: 10 }} />
      </div>
      <div className="bz-grid" style={{ gridAutoRows: 'minmax(200px, auto)' }}>
        <div className="bz-skel bz-c6 bz-r2" style={{ minHeight: 420 }} />
        <div className="bz-skel bz-c3" />
        <div className="bz-skel bz-c3" />
        <div className="bz-skel bz-c3" />
        <div className="bz-skel bz-c3" />
        <div className="bz-skel bz-c4" />
        <div className="bz-skel bz-c5" />
        <div className="bz-skel bz-c3" />
      </div>
    </div>
  )
}
