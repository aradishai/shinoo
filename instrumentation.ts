export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runLiveSync, MIN_INTERVAL_MS } = await import('./lib/live-sync')

    // Background sync — keeps match data fresh even when no clients are polling
    setInterval(async () => {
      try {
        await runLiveSync()
      } catch (err) {
        console.error('[background-sync] Error:', err)
      }
    }, MIN_INTERVAL_MS)
  }
}
