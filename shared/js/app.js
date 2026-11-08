// shared/js/app.js
// app.html 전체를 맡는다. 로그인 여부를 확인하고, 확인되면 화면 전환(router)을 시작한다.
// 사이드바와 플레이어 바처럼 화면이 바뀌어도 그대로 남는 것들을 여기서 다룬다.
import { signOut, getSession, onAuthChange } from './auth.js'
import { startRouter } from './router.js'
import { openCreatePlaylistModal } from '../../features/playlist/playlistModal.js'

// 이 파일(shared/js/) 기준이라 app.html 을 어디서 열어도 경로가 맞는다.
const SIGNIN_PAGE = new URL('../../features/auth/signIn.html', import.meta.url).href

let routerStarted = false

// ---- 로그인 확인 ----
// 로그아웃 상태면 로그인 페이지로 보내고, 아니면 화면을 열어준다.
// 다른 탭에서 로그아웃해도 onAuthChange 로 같이 로그인 페이지로 이동한다.
function handleSession(session) {
  if (!session) {
    location.replace(SIGNIN_PAGE)
    return
  }

  document.body.hidden = false

  // 화면 전환은 로그인이 확인된 뒤에 한 번만 시작한다.
  if (!routerStarted) {
    routerStarted = true
    startRouter()
  }
}

// ---- 상단 버튼 ----
document.querySelector('#btn-back').addEventListener('click', () => history.back())
document.querySelector('#btn-forward').addEventListener('click', () => history.forward())

document.querySelector('#logout-button').addEventListener('click', async () => {
  const { error } = await signOut()

  if (error) {
    alert(`로그아웃 실패: ${error.message}`)
  }

  // 성공하면 onAuthChange 가 null 세션을 받아서 로그인 페이지로 이동시킨다.
})

// ---- 새 플레이리스트 버튼 ----
// 사이드바의 + 와 홈 화면의 '＋ 새 플레이리스트' 를 같이 받는다.
// 홈 화면은 들어올 때마다 새로 만들어지므로, 버튼이 아니라 document 에 걸어둔다.
document.addEventListener('click', async (event) => {
  if (event.target.closest('.btn-add-playlist, .btn-new-playlist')) {
    const playlist = await openCreatePlaylistModal()

    // 만들었으면 바로 그 플레이리스트를 열어준다.
    if (playlist) location.hash = `#/playlist/${playlist.id}`
  }

  // 아직 갈 곳이 없는 링크(href="#")를 누르면 주소가 비워지면서 홈으로 튀어버린다.
  // 화면이 만들어질 때마다 다시 걸지 않도록 여기서 한 번만 막아둔다.
  const deadLink = event.target.closest('a[href="#"], a[aria-disabled="true"]')
  if (deadLink) event.preventDefault()
})

// ---- 세션 상태 감지 ----
handleSession(await getSession())
onAuthChange(handleSession)
