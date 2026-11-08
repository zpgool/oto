// shared/js/sidebar.js
// shared/partials/sidebar.html 을 읽어서 각 페이지의 <div id="sidebar"> 를 진짜 사이드바로 바꾼다.
// 페이지마다 사이드바를 복사해 두지 않아도 되고, 고칠 때 shared/partials/sidebar.html 하나만 고치면 된다.
import { getSession, onAuthChange, displayName } from './auth.js'
import { listPlaylists, onPlaylistsChanged } from '../../features/playlist/playlistStore.js'

// 이 파일(shared/js/)을 기준으로 찾기 때문에 어느 페이지에서 불러도 경로가 맞는다.
const SIDEBAR_PATH = new URL('../partials/sidebar.html', import.meta.url)

// 지금 보고 있는 화면의 메뉴에 .active 를 붙인다.
// 주소가 바뀔 때마다 router 가 다시 불러준다.
export function markActiveSidebar() {
  const current = location.hash || '#/home'

  document.querySelectorAll('.nav-main a, .nav-playlist a').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === current)
  })
}

// ---- 내 플레이리스트 ----
function createPlaylistItem(playlist) {
  const item = document.createElement('li')

  const link = document.createElement('a')
  link.href = `#/playlist/${playlist.id}`

  const thumb = document.createElement('span')
  thumb.className = 'pl-thumb'

  const info = document.createElement('span')
  info.className = 'pl-info'

  const name = document.createElement('span')
  name.className = 'pl-name'
  name.textContent = playlist.name

  const count = document.createElement('span')
  count.className = 'pl-count'
  count.textContent = `${playlist.trackCount}곡`

  info.append(name, count)
  link.append(thumb, info)
  item.append(link)

  return item
}

// 플레이리스트가 생기거나 곡이 들고 날 때마다 다시 그린다.
export async function renderPlaylists() {
  const list = document.querySelector('#playlist-list')
  if (!list) return

  try {
    const playlists = await listPlaylists()
    list.replaceChildren(...playlists.map(createPlaylistItem))
  } catch (error) {
    console.error('플레이리스트를 불러오지 못했습니다:', error.message)
    return
  }

  // 지금 보고 있는 플레이리스트에 표시를 붙인다.
  markActiveSidebar()
}

// 로그인한 사용자의 이름과 이메일을 사이드바에 채운다.
function renderUser(session) {
  const nameEl = document.querySelector('#user-name')
  const emailEl = document.querySelector('#user-email')
  if (!nameEl || !emailEl) return

  const user = session?.user
  if (!user) {
    nameEl.textContent = ''
    emailEl.textContent = ''
    return
  }

  nameEl.textContent = displayName(user)
  emailEl.textContent = user.email
}

export async function renderSidebar() {
  const placeholder = document.querySelector('#sidebar')
  if (!placeholder) return

  const response = await fetch(SIDEBAR_PATH)
  if (!response.ok) {
    console.error('사이드바를 불러오지 못했습니다:', response.status)
    return
  }

  // 받아온 HTML 에서 <aside> 만 꺼낸다.
  const html = await response.text()
  const sidebar = document.createRange().createContextualFragment(html).querySelector('.sidebar')
  if (!sidebar) return

  // 자리표시용 div 를 통째로 바꾼다.
  // div 를 남겨두면 .app 그리드의 칸을 div 가 차지해서 레이아웃이 틀어진다.
  placeholder.replaceWith(sidebar)

  markActiveSidebar()

  // 사이드바를 넣은 뒤에 사용자 정보를 채운다.
  renderUser(await getSession())

  renderPlaylists()
  onPlaylistsChanged(renderPlaylists)

  // 로그인/로그아웃 되면 사이드바 표시도 같이 바뀐다.
  onAuthChange(renderUser)
}

renderSidebar()
