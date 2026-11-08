// features/playlist/playlistStore.js
// 플레이리스트 데이터를 Supabase 에서 읽고 쓰는 곳. 화면(DOM)은 건드리지 않는다.
//
// 표 세 개를 쓴다.
//   songs           곡 정보 한 벌. 모두가 같이 쓴다. youtube_id 로 같은 곡인지 가린다.
//   playlists       플레이리스트. user_id 가 주인.
//   playlist_songs  어느 플레이리스트에 어떤 곡. (playlist_id, song_id) 가 유일해서
//                   같은 곡을 같은 플레이리스트에 두 번 담을 수 없다.
//
// songs 에 youtube_id 칸을 더하는 SQL 은 db/youtube_songs.sql 에 있다.
import { supabase } from '../../shared/js/supabase.js'

// 플레이리스트가 새로 생기거나 곡이 들고 날 때 알린다.
// 사이드바처럼 목록을 들고 있는 쪽이 이 신호를 듣고 다시 그린다.
const CHANGED_EVENT = 'oto:playlists-changed'

export function onPlaylistsChanged(callback) {
  document.addEventListener(CHANGED_EVENT, callback)
}

function notifyChanged() {
  document.dispatchEvent(new CustomEvent(CHANGED_EVENT))
}

// Supabase 가 돌려주는 오류를 그대로 던진다. 부르는 쪽에서 사용자에게 보여준다.
function failIf(error) {
  if (error) throw new Error(error.message)
}

// songs 한 줄을 화면에서 쓰는 모양으로 바꾼다.
// 플레이어와 검색 결과가 쓰는 이름(videoId, channel, thumbnail)에 맞춘다.
function toTrack(song) {
  return {
    songId: song.id,
    videoId: song.youtube_id,
    title: song.title,
    channel: song.artist,
    thumbnail: song.album_art_url,
  }
}

// ---- 플레이리스트 ----
// 내 플레이리스트를 만든 순서대로. 곡 수도 같이 센다.
// user_id 조건을 적지 않아도 보안 규칙(RLS)이 내 것만 돌려준다.
export async function listPlaylists() {
  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, playlist_songs(count)')
    .order('created_at', { ascending: true })

  failIf(error)

  return data.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    trackCount: playlist.playlist_songs[0]?.count ?? 0,
  }))
}

// 이름 하나로 새 플레이리스트를 만든다.
// playlists.user_id 는 기본값이 없어서 직접 넣어야 한다.
export async function createPlaylist(name) {
  const { data: account, error: accountError } = await supabase.auth.getUser()
  failIf(accountError)

  if (!account.user) throw new Error('로그인이 필요합니다.')

  const { data, error } = await supabase
    .from('playlists')
    .insert({ name: name.trim(), user_id: account.user.id })
    .select('id, name')
    .single()

  failIf(error)
  notifyChanged()

  return data
}

// 플레이리스트 하나와 담긴 곡 전부. 곡은 position 순서로.
export async function getPlaylist(playlistId) {
  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, playlist_songs(id, position, songs(id, title, artist, album_art_url, youtube_id))')
    .eq('id', playlistId)
    .maybeSingle()

  failIf(error)
  if (!data) return null

  const tracks = data.playlist_songs
    .filter((row) => row.songs)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    // rowId 는 playlist_songs 의 행 번호. 순서를 바꿀 때 이 번호로 찾아 고친다.
    // position 은 지금 순번. 바뀐 행만 골라내는 데 쓴다.
    .map((row) => ({ ...toTrack(row.songs), rowId: row.id, position: row.position }))

  return { id: data.id, name: data.name, tracks }
}

export async function renamePlaylist(playlistId, name) {
  const { data, error } = await supabase
    .from('playlists')
    .update({ name: name.trim() })
    .eq('id', playlistId)
    .select('id, name')
    .single()

  failIf(error)
  notifyChanged()

  return data
}

// 플레이리스트를 지운다. 담긴 곡 연결도 표 설정(on delete cascade)에 따라 같이 지워진다.
// songs 자체는 남는다. 다른 사람의 플레이리스트가 같은 곡을 쓰고 있을 수 있어서다.
export async function deletePlaylist(playlistId) {
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId)

  failIf(error)
  notifyChanged()
}

// ---- 곡 ----
// 유튜브 영상 번호로 songs 에서 찾는다. 없으면 null.
async function findSongId(videoId) {
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

// ---- 담긴 곡 ----
// 이 곡이 이미 들어 있는 플레이리스트의 id 모음.
// 추가 창에서 '담김' 으로 표시하고 다시 누르지 못하게 하는 데 쓴다.
export async function findPlaylistsWithTrack(videoId) {
  const songId = await findSongId(videoId)

  // songs 에 아직 없는 곡이면 어디에도 담겨 있지 않다.
  if (!songId) return new Set()

  const { data, error } = await supabase
    .from('playlist_songs')
    .select('playlist_id')
    .eq('song_id', songId)

  failIf(error)

  return new Set(data.map((row) => row.playlist_id))
}

// 맨 뒤에 붙일 순번.
async function nextPosition(playlistId) {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)

  failIf(error)

  return (data[0]?.position ?? 0) + 1
}

export async function addTrack(playlistId, track) {
  const songId = await ensureSong(track)
  const position = await nextPosition(playlistId)

  const { error } = await supabase
    .from('playlist_songs')
    .insert({ playlist_id: playlistId, song_id: songId, position })

  // 같은 곡을 두 번 담으려 한 경우. 표의 unique (playlist_id, song_id) 가 막는다.
  if (error?.code === '23505') {
    throw new Error('이미 담긴 곡입니다.')
  }

  failIf(error)
  notifyChanged()
}

// 바뀐 순서대로 position 을 1 부터 다시 매긴다.
//
// upsert 로 한 번에 보내면 'cannot insert a non-DEFAULT value into column id' 가 난다.
// playlist_songs.id 는 데이터베이스가 알아서 매기는 칸(generated always as identity)이라
// 값을 직접 넣을 수 없는데, upsert 는 속으로 insert 를 하면서 id 를 같이 보내기 때문이다.
// 그래서 행마다 update 를 보낸다. 자리가 실제로 바뀐 행만 고른다.
export async function reorderTracks(playlistId, tracks) {
  const changed = tracks
    .map((track, index) => ({ track, position: index + 1 }))
    .filter(({ track, position }) => track.position !== position)

  if (changed.length === 0) return

  const results = await Promise.all(
    changed.map(({ track, position }) =>
      supabase.from('playlist_songs').update({ position }).eq('id', track.rowId),
    ),
  )

  failIf(results.find((result) => result.error)?.error)

  // 저장된 순번을 들고 있는 곡 정보에도 반영한다.
  // 안 그러면 다음에 또 옮길 때 바뀐 행을 제대로 못 가려낸다.
  changed.forEach(({ track, position }) => {
    track.position = position
  })
}

export async function removeTrack(playlistId, songId) {
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId)

  failIf(error)
  notifyChanged()
}
