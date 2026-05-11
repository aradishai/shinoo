export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const port = process.env.PORT || 3000
    const url = `http://localhost:${port}/api/sync/lifecycle`

    const tick = async () => {
      try {
        await fetch(url)
        console.log('[background] lifecycle sync ok')
      } catch (e) {
        console.error('[background] lifecycle sync error:', e)
      }
    }

    // Wait for server to be ready, then start
    setTimeout(async () => {
      await tick()
      setInterval(tick, 5 * 60 * 1000)
    }, 15_000)
  }
}
