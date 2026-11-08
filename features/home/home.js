// features/home/home.js
// 홈 화면의 '바로 가기' 와 '플레이리스트' 칸을 실제 내 자료로 채운다.
import { listPlaylists, onPlaylistsChanged } from '../playlist/playlistStore.js'
import { loadFavoriteIds, onFavoritesChanged } from '../favorite/favoriteStore.js'
import { getSession, onAuthChange, displayName } from '../../shared/js/auth.js'

// 바로 가기에 둘 플레이리스트 개수. 즐겨찾기 카드까지 합쳐 한 줄(3칸)에 맞춘다.
const SHORTCUT_PLAYLISTS = 2

let greeting
let shortcutGrid
let grid
let emptyMessage

// 인사말에 로그인한 사람 이름을 넣는다.
function renderGreeting(session) {
  if (!greeting?.isConnected) return

  const name = displayName(session?.user)
  greeting.textContent = name ? `${name} 님` : ''
}

// ---- 바로 가기 ----
// 카드 하나. favorite 이면 썸네일에 하트가 들어간다. (homeScreen.css 의 .favorite)
function createShortcut({ href, name, count, favorite = false }) {
  const card = document.createElement('li')
  card.className = 'shortcut-card'

  const link = document.createElement('a')
  link.href = href

  const thumb = document.createElement('span')
  thumb.className = favorite ? 'shortcut-thumb favorite' : 'shortcut-thumb'

  const info = document.createElement('span')
  info.className = 'shortcut-info'

  const nameEl = document.createElement('span')
  nameEl.className = 'shortcut-name'
  nameEl.textContent = name

  const countEl = document.createElement('span')
  countEl.className = 'shortcut-count'
  countEl.textContent = `${count}곡`

  info.append(nameEl, countEl)
  link.append(thumb, info)
  card.append(link)

  return card
}

// 즐겨찾기 + 최근에 만든 플레이리스트 몇 개.
// 플레이리스트는 아래 목록을 받을 때 같이 오므로 따로 더 물어보지 않는다.
function renderShortcuts(playlists, favoriteCount) {
  // listPlaylists 는 만든 순서(오래된 것부터)로 주므로 뒤에서부터 가져온다.
  const recent = [...playlists].reverse().slice(0, SHORTCUT_PLAYLISTS)

  shortcutGrid.replaceChildren(
    createShortcut({
      href: '#/favorite',
      name: '즐겨찾기',
      count: favoriteCount,
      favorite: true,
    }),
    ...recent.map((playlist) =>
      createShortcut({
        href: `#/playlist/${playlist.id}`,
        name: playlist.name,
        count: playlist.trackCount,
      }),
    ),
  )
}

// ---- 플레이리스트 ----
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

  // 즐겨찾기를 못 받아도 바로 가기는 보여준다. 곡 수만 0 으로 둔다.
  let favoriteCount = 0

  try {
    favoriteCount = (await loadFavoriteIds()).size
  } catch (error) {
    console.error('즐겨찾기를 불러오지 못했습니다:', error.message)
  }

  // 화면을 떠났는지 다시 본다. 위에서 기다리는 동안 바뀌었을 수 있다.
  if (!shortcutGrid?.isConnected) return

  renderShortcuts(playlists, favoriteCount)
}

// ---- 시작 ----
// router 가 홈 화면을 #view 에 넣은 뒤에 불러준다.
export async function init() {
  greeting = document.querySelector('#greeting-name')
  shortcutGrid = document.querySelector('#shortcut-grid')
  grid = document.querySelector('#playlist-grid')
  emptyMessage = document.querySelector('#playlist-empty')

  render()

  renderGreeting(await getSession())
}

// ---- 구독 ----
// 홈은 들어올 때마다 init() 이 다시 불리므로, 구독을 거기서 걸면 리스너가 쌓인다.
// 모듈은 한 번만 불러오니 여기서 한 번만 건다.
// 홈을 떠난 사이에 신호가 와도 render 가 isConnected 로 걸러낸다.

// 다른 탭에서 계정이 바뀌어도 따라간다.
onAuthChange(renderGreeting)

// 플레이리스트가 생기거나 곡이 들고 나면 다시 그린다.
onPlaylistsChanged(render)

// 어느 화면에서든 하트를 누르면 바로 가기의 곡 수도 따라 바뀐다.
onFavoritesChanged(render)
