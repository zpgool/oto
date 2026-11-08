// features/chart/chartStore.js
// 재생 기록을 남기고, 지난 30일 차트를 받아온다.
//
// 표와 함수는 db/play_chart.sql 에 있다.
//   play_events    한 번 들을 때마다 한 줄
//   my_play_chart  곡별로 묶어서 많이 들은 순으로 돌려주는 함수
import { supabase } from '../../shared/js/supabase.js'
import { failIf, toTrack, ensureSong } from '../../shared/js/songStore.js'

const CHART_DAYS = 30
const CHART_LIMIT = 100

// 곡 하나를 들었다고 남긴다.
// 재생이 막히더라도 화면은 그대로 돌아가야 하므로, 실패해도 던지지 않고 기록만 남긴다.
export async function recordPlay(track) {
  try {
    const songId = await ensureSong(track)

    // user_id 와 played_at 은 표에서 자동으로 채워진다.
    const { error } = await supabase.from('play_events').insert({ song_id: songId })
    failIf(error)
  } catch (error) {
    console.error('재생 기록을 남기지 못했습니다:', error.message)
  }
}

// 지난 30일 동안 많이 들은 순서대로 최대 100곡.
export async function getPlayChart() {
  const { data, error } = await supabase.rpc('my_play_chart', {
    p_days: CHART_DAYS,
    p_limit: CHART_LIMIT,
  })

  failIf(error)

  return data.map((row, index) => ({
    // rpc 가 돌려주는 이름이 songs 표와 조금 달라서 맞춰준다.
    ...toTrack({ ...row, id: row.song_id }),
    rank: index + 1,
    album: row.album,
    duration: row.duration,
    playCount: row.play_count,
  }))
}
