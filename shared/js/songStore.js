// shared/js/songStore.js
// songs 표를 다루는 곳. 플레이리스트와 재생 차트가 같이 쓴다.
//
// songs 는 모두가 같이 쓰는 곡 목록이다. 유튜브에서 검색한 곡을 여기에 한 번 등록해 두고,
// 플레이리스트와 재생 기록은 그 곡 번호(song_id)만 가리킨다.
// 같은 곡인지는 youtube_id 로 가린다. (db/youtube_songs.sql)
import { supabase } from './supabase.js'

// Supabase 가 돌려주는 오류를 그대로 던진다. 부르는 쪽에서 사용자에게 보여준다.
export function failIf(error) {
  if (error) throw new Error(error.message)
}

// songs 한 줄을 화면에서 쓰는 모양으로 바꾼다.
// 플레이어와 검색 결과가 쓰는 이름(videoId, channel, thumbnail)에 맞춘다.
export function toTrack(song) {
  return {
    songId: song.id,
    videoId: song.youtube_id,
    title: song.title,
    channel: song.artist,
    thumbnail: song.album_art_url,
  }
}

// 유튜브 영상 번호로 songs 에서 찾는다. 없으면 null.
export async function findSongId(videoId) {
  const { data, error } = await supabase
    .from('songs')
    .select('id')
    .eq('youtube_id', videoId)
    .maybeSingle()

  failIf(error)

  return data?.id ?? null
}

// songs 에 이미 있으면 그 곡을, 없으면 새로 넣고 그 곡을 돌려준다.
// 유튜브는 앨범과 재생 시간을 주지 않아서 그 두 칸은 비워 둔다.
export async function ensureSong(track) {
  const found = await findSongId(track.videoId)
  if (found) return found

  const { data, error } = await supabase
    .from('songs')
    .insert({
      youtube_id: track.videoId,
      title: track.title,
      artist: track.channel,
      album_art_url: track.thumbnail,
      audio_url: `https://www.youtube.com/watch?v=${track.videoId}`,
    })
    .select('id')
    .single()

  // 23505 = 같은 값이 이미 있음.
  // 다른 창에서 같은 곡을 바로 직전에 넣은 경우라, 그 곡을 다시 찾아 쓴다.
  if (error?.code === '23505') {
    const added = await findSongId(track.videoId)
    if (added) return added
  }

  failIf(error)

  return data.id
}
