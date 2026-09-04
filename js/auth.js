// js/auth.js
import { supabase } from './supabase.js'

// ---- DOM ----
const signupForm = document.querySelector('#signup-form')
const loginForm = document.querySelector('#login-form')
const logoutButton = document.querySelector('#logout-button')

const authStatus = document.querySelector('#auth-status')
const loggedOutView = document.querySelector('#logged-out-view')
const loggedInView = document.querySelector('#logged-in-view')
const userEmail = document.querySelector('#user-email')
const userId = document.querySelector('#user-id')
const message = document.querySelector('#message')

// ---- 화면 갱신 ----
function showMessage(text) {
  message.textContent = text
}

// session 이 있으면 로그인 화면, 없으면 로그인/회원가입 폼을 보여준다.
function render(session) {
  const user = session?.user ?? null

  loggedInView.hidden = !user
  loggedOutView.hidden = !!user

  if (user) {
    authStatus.textContent = '로그인됨'
    userEmail.textContent = user.email ?? ''
    userId.textContent = user.id
  } else {
    authStatus.textContent = '로그아웃됨'
    userEmail.textContent = ''
    userId.textContent = ''
  }
}

// ---- 회원가입 ----
signupForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  showMessage('회원가입 처리 중...')

  const email = signupForm.email.value.trim()
  const password = signupForm.password.value

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    showMessage(`회원가입 실패: ${error.message}`)
    return
  }

  // Supabase 프로젝트에서 "Confirm email" 이 켜져 있으면 session 이 null 로 오고,
  // 사용자가 메일의 확인 링크를 눌러야 로그인이 된다.
  if (data.session) {
    showMessage('회원가입 완료. 바로 로그인되었습니다.')
  } else {
    showMessage(`회원가입 완료. ${email} 로 보낸 확인 메일의 링크를 눌러주세요.`)
  }

  signupForm.reset()
})

// ---- 로그인 ----
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  showMessage('로그인 처리 중...')

  const email = loginForm.email.value.trim()
  const password = loginForm.password.value

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    showMessage(`로그인 실패: ${error.message}`)
    return
  }

  showMessage('로그인 성공')
  loginForm.reset()
})

// ---- 로그아웃 ----
logoutButton.addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    showMessage(`로그아웃 실패: ${error.message}`)
    return
  }

  showMessage('로그아웃 되었습니다.')
})

// ---- 세션 상태 감지 ----
// 최초 진입 시 저장된 세션(localStorage)을 복구하고,
// 이후 로그인/로그아웃/토큰갱신 때마다 화면을 다시 그린다.
const { data: { session } } = await supabase.auth.getSession()
render(session)

supabase.auth.onAuthStateChange((_event, session) => {
  render(session)
})
