// js/signIn.js
import { signIn, getSession, onAuthChange } from './auth.js'
import { setupPasswordToggle } from './passwordToggle.js'

const HOME_PAGE = 'home.html'

// ---- DOM ----
const loginForm = document.querySelector('#login-form')
const loggedOutView = document.querySelector('#logged-out-view')
const passwordInput = document.querySelector('#login-password')
const passwordToggle = document.querySelector('#password-toggle')

// 로그인 상태면 home 으로 보내고, 아니면 로그인 폼을 보여준다.
// replace 를 써서 뒤로가기로 로그인 페이지에 돌아오지 않게 한다.
function handleSession(session) {
  if (session) {
    location.replace(HOME_PAGE)
    return
  }

  loggedOutView.hidden = false
}

// ---- 로그인 ----
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const email = loginForm.email.value.trim()
  const password = loginForm.password.value

  const { error } = await signIn(email, password)

  if (error) {
    alert(`로그인 실패: ${error.message}`)
  }

  // 성공하면 onAuthChange 가 세션을 받아서 home 으로 이동시킨다.
})

// ---- 비밀번호 보기 / 숨기기 ----
setupPasswordToggle(passwordInput, passwordToggle)

// ---- 세션 상태 감지 ----
// 이미 로그인된 채로 들어왔을 때, 확인 메일 링크로 돌아왔을 때,
// 방금 로그인했을 때 모두 여기서 home 으로 이동한다.
handleSession(await getSession())
onAuthChange(handleSession)
