/** Shown on the Captain screens when the restaurant has no outlet yet. */
export function CaptainNoLocation() {
  return (
    <div className="bz bz-phone-ground">
      <div className="bz-tile" style={{ maxWidth: 420, margin: '80px auto' }}>
        <h1 className="bz-title bz-title--lg">No location set up yet</h1>
        <p className="bz-sub">Ask a manager to add a location, then open this page again.</p>
      </div>
    </div>
  )
}
