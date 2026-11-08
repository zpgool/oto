// features/favorite/favoriteStore.js
// 즐겨찾기를 Supabase 에서 읽고 쓰는 곳. 화면(DOM)은 건드리지 않는다.
//
// 표 두 개를 쓴다.
//   songs      곡 정보 한 벌. 모두가 같이 쓴다. youtube_id 로 같은 곡인지 가린다.
//   favorites  누가(user_id) 어떤 곡(song_id)을 좋아하는지. (user_id, song_id) 가
//              유일해서 같은 곡을 두 번 즐겨찾기할 수 없다.
//
// 곡 정보 자체는 songs 에 있고, favorites 는 song_id 로 그 곡을 가리키기만 한다.
// 그래서 즐겨찾기를 넣으려면 "먼저 songs 에 곡이 있어야" 한다. 그 일은 플레이리스트와
// 똑같아서, playlistStore 의 ensureSong 을 가져다 쓴다. (곡 넣는 코드가 두 벌이 되지 않게)
import { supabase } from '../../shared/js/supabase.js'
import { ensureSong } from '../playlist/playlistStore.js'

// 즐겨찾기가 바뀌면 알린다. 목록을 들고 있는 다른 화면이 이 신호를 듣고 다시 그릴 수 있다.
// (playlistStore 의 onPlaylistsChanged 와 같은 방식)
const CHANGED_EVENT = 'oto:favorites-changed'

export function onFavoritesChanged(callback) {
  document.addEventListener(CHANGED_EVENT, callback)
}

function notifyChanged() {
  document.dispatchEvent(new CustomEvent(CHANGED_EVENT))
}

// Supabase 가 돌려주는 오류를 그대로 던진다. 부르는 쪽에서 사용자에게 보여준다.
// (playlistStore 와 같은 이름·같은 방식으로 맞췄다)
function failIf(error) {
  if (error) throw new Error(error.message)
}

// songs 한 줄을 화면에서 쓰는 모양으로 바꾼다.
// 플레이어와 검색 결과가 쓰는 이름(videoId, channel, thumbnail)에 맞춘다.
// 이렇게 통일해 두면 여기서 돌려준 track 을 playTrack 에 그대로 넘길 수 있다.
function toTrack(song) {
  return {
    songId: song.id,
    videoId: song.youtube_id,
    title: song.title,
    channel: song.artist,
    thumbnail: song.album_art_url,
  }
}

// ---- 읽기 ----

// 내 즐겨찾기 곡 전부. 최근에 누른 것부터 (created_at 내림차순).
// user_id 조건을 적지 않아도 보안 규칙(RLS)이 내 것만 돌려준다.
// favorites 한 줄마다 연결된 songs 를 같이 받아온다. (조인)
export async function listFavorites() {
  const { data, error } = await supabase
    .from('favorites')
    .select('created_at, songs(id, title, artist, album_art_url, youtube_id)')
    .order('created_at', { ascending: false })

  failIf(error)

  // songs 가 없는 줄(곡이 지워진 경우 등)은 걸러내고, 나머지를 화면용 모양으로 바꾼다.
  return data.filter((row) => row.songs).map((row) => toTrack(row.songs))
}

// 내가 즐겨찾기한 곡들의 youtube_id 모음(Set).
// 검색 결과에서 "이미 즐겨찾기한 곡"의 하트를 처음부터 채워(♥) 보여주는 데 쓴다.
// Set 으로 돌려주면 has(videoId) 로 빠르게 확인할 수 있다.
export async function listFavoriteVideoIds() {
  const { data, error } = await supabase
    .from('favorites')
    .select('songs(youtube_id)')

  failIf(error)

  // songs 가 없거나 youtube_id 가 비는 줄은 걸러낸다.
  return new Set(data.map((row) => row.songs?.youtube_id).filter(Boolean))
}

// ---- 쓰기 ----

// 곡 하나를 즐겨찾기에 넣는다.
// track 모양: { videoId, title, channel, thumbnail } (검색 결과·플레이어가 쓰는 모양)
export async function addFavorite(track) {
  // favorites.user_id 는 기본값이 없어서 직접 넣어야 한다. 지금 로그인한 사람을 가져온다.
  const { data: account, error: accountError } = await supabase.auth.getUser()
  failIf(accountError)
  if (!account.user) throw new Error('로그인이 필요합니다.')

  // songs 에 이 곡이 있으면 그 번호를, 없으면 새로 넣고 그 번호를 받는다. (플레이리스트와 공유)
  const songId = await ensureSong(track)

  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: account.user.id, song_id: songId })

  // 23505 = 같은 값이 이미 있음(이미 즐겨찾기한 곡).
  // 빠르게 두 번 눌렀거나 다른 탭에서 먼저 넣은 경우라, 오류로 보지 않고 넘어간다.
  if (error && error.code !== '23505') failIf(error)

  notifyChanged()
}

// 곡 하나를 즐겨찾기에서 뺀다. 검색 결과는 videoId 만 들고 있어서 videoId 로 받는다.
export async function removeFavorite(videoId) {
  // favorites 는 song_id(숫자)로 저장돼 있으니, 먼저 youtube_id 로 songs 의 번호를 찾는다.
  const { data: song, error: findError } = await supabase
    .from('songs')
    .select('id')
    .eq('youtube_id', videoId)
    .maybeSingle()

  failIf(findError)

  // songs 에 아예 없는 곡이면 즐겨찾기에도 있을 수 없으니 그냥 끝낸다.
  if (!song) return

  // 찾은 번호로 내 즐겨찾기에서 지운다. (RLS 가 내 행만 지우도록 막아준다)
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('song_id', song.id)

  failIf(error)
  notifyChanged()
}

// 하트를 눌렀을 때 쓰는 함수.
// 지금 켜져 있으면(isCurrentlyFavorite=true) 빼고, 꺼져 있으면 넣는다.
// 바뀐 뒤의 상태를 돌려준다(true = 즐겨찾기됨). 부르는 쪽은 이 값으로 하트 모양을 바꾼다.
export async function toggleFavorite(track, isCurrentlyFavorite) {
  if (isCurrentlyFavorite) {
    await removeFavorite(track.videoId)
    return false
  }

  await addFavorite(track)
  return true
}
