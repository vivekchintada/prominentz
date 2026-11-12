/** Bento-shaped placeholder while the POS loads. */
export default function PosLoading() {
  return (
    <div className="bz" aria-busy="true" aria-label="Loading POS">
      <div className="bz-wrap">
        <div className="bz-skel" style={{ height: 64, borderRadius: 22 }} />
        <div className="bz-grid" style={{ gridAutoRows: 'minmax(220px, auto)' }}>
          <div className="bz-skel bz-c3 bz-r2" />
          <div className="bz-skel bz-c5 bz-r2" />
          <div className="bz-skel bz-c4 bz-r3" />
          <div className="bz-skel bz-c4" />
          <div className="bz-skel bz-c4" />
        </div>
      </div>
    </div>
  )
}
