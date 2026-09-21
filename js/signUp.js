// js/signUp.js
import { signUp, getSession } from './auth.js'
import { setupPasswordToggle } from './passwordToggle.js'

const HOME_PAGE = 'home.html'

// ---- DOM ----
const signupForm = document.querySelector('#signup-form')
const signupView = document.querySelector('#signup-view')
const passwordInput = document.querySelector('#signup-password')
const passwordToggle = document.querySelector('#password-toggle')

// ---- 회원가입 ----
signupForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const email = signupForm.email.value.trim()
  const password = signupForm.password.value

  const { data, error } = await signUp(email, password)

  if (error) {
    alert(`회원가입 실패: ${error.message}`)
    return
  }

  // Supabase 프로젝트에서 "Confirm email" 이 꺼져 있으면 바로 세션이 생긴다.
  if (data.session) {
    location.replace(HOME_PAGE)
    return
  }

  // 켜져 있으면 session 이 null 로 오고, 메일의 확인 링크를 눌러야 로그인된다.
  alert(`${email} 로 보낸 확인 메일의 링크를 눌러주세요.`)
  signupForm.reset()
})

// ---- 비밀번호 보기 / 숨기기 ----
setupPasswordToggle(passwordInput, passwordToggle)

// ---- 세션 확인 ----
// 이미 로그인된 상태면 회원가입할 필요가 없으니 home 으로 보내고, 아니면 화면을 보여준다.
if (await getSession()) {
  location.replace(HOME_PAGE)
} else {
  signupView.hidden = false
}
