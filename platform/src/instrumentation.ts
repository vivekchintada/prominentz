export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return
  const { dodoConfigProblems } = await import('./lib/dodo-payments')
  const problems = dodoConfigProblems()
  if (problems.length > 0) {
    // Loud on purpose: the app still serves the POS, but subscription checkout will refuse to run.
    console.error(`[STARTUP] Dodo billing is NOT ready — ${problems.join('; ')}`)
  }
}
