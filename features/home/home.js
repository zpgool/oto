// features/home/home.js
// 홈 화면의 '플레이리스트' 칸을 내가 만든 플레이리스트로 채운다.
// 위쪽 '바로 가기' 는 아직 예시 그대로다.
import { listPlaylists, onPlaylistsChanged } from '../playlist/playlistStore.js'

let grid
let emptyMessage

function createCard(playlist) {
  const card = document.createElement('li')
  card.className = 'playlist-card'

  const link = document.createElement('a')
  link.href = `#/playlist/${playlist.id}`

  const cover = document.createElement('span')
  cover.className = 'card-cover'

  const title = document.createElement('span')
  title.className = 'card-title'
  title.textContent = playlist.name

  const desc = document.createElement('span')
  desc.className = 'card-desc'
  desc.textContent = `${playlist.trackCount}곡`

  link.append(cover, title, desc)
  card.append(link)

  return card
}

async function render() {
  // 홈 화면을 떠난 뒤에 신호가 올 수 있다. 그때는 그릴 곳이 없다.
  if (!grid?.isConnected) return

  let playlists

  try {
    playlists = await listPlaylists()
  } catch (error) {
    console.error('플레이리스트를 불러오지 못했습니다:', error.message)
    return
  }

  grid.replaceChildren(...playlists.map(createCard))
  emptyMessage.hidden = playlists.length > 0
}

// ---- 시작 ----
// router 가 홈 화면을 #view 에 넣은 뒤에 불러준다.
export function init() {
  grid = document.querySelector('#playlist-grid')
  emptyMessage = document.querySelector('#playlist-empty')

  render()

  // 플레이리스트가 생기거나 곡이 들고 나면 다시 그린다.
  onPlaylistsChanged(render)
}
