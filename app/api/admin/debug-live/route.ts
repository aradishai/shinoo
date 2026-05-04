import { NextResponse } from 'next/server'
import axios from 'axios'

const FD_API = 'https://api.football-data.org/v4'
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY

export async function GET() {
  if (!FD_KEY) return NextResponse.json({ error: 'no API key' })

  const results = await Promise.allSettled([
    axios.get(`${FD_API}/competitions/PD/matches?status=IN_PLAY,PAUSED`, { headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000 }),
    axios.get(`${FD_API}/competitions/CL/matches?status=IN_PLAY,PAUSED`, { headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000 }),
  ])

  const matches = results.flatMap(r => r.status === 'fulfilled' ? (r.value.data?.matches ?? []) : [])

  return NextResponse.json({
    count: matches.length,
    matches: matches.map((m: any) => ({
      id: m.id,
      home: m.homeTeam?.name,
      away: m.awayTeam?.name,
      status: m.status,
      minute: m.minute,
      score: m.score,
    }))
  })
}
