// js/home.js
import { signOut, getSession, onAuthChange } from './auth.js'

const SIGNIN_PAGE = 'signIn.html'

// ---- DOM ----
const homeView = document.querySelector('#home-view')
const logoutButton = document.querySelector('#logout-button')

// 로그아웃 상태면 로그인 페이지로 보내고, 아니면 화면을 보여준다.
// 다른 탭에서 로그아웃해도 onAuthChange 로 같이 로그인 페이지로 이동한다.
function handleSession(session) {
  if (!session) {
    location.replace(SIGNIN_PAGE)
    return
  }

  homeView.hidden = false
}

// ---- 로그아웃 ----
logoutButton.addEventListener('click', async () => {
  const { error } = await signOut()

  if (error) {
    alert(`로그아웃 실패: ${error.message}`)
  }

  // 성공하면 onAuthChange 가 null 세션을 받아서 로그인 페이지로 이동시킨다.
})

// ---- 세션 상태 감지 ----
handleSession(await getSession())
onAuthChange(handleSession)
