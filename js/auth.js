// js/auth.js
// 로그인/회원가입 페이지가 같이 쓰는 인증 함수 모음.
// 화면(DOM)은 건드리지 않고, 각 페이지 스크립트(signIn.js, signUp.js)가 가져다 쓴다.
import { supabase } from './supabase.js'

// 회원가입
// 확인 메일의 링크를 누르면 redirectPath 페이지로 돌아온다.
export async function signUp(email, password, redirectPath = 'signIn.html') {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: new URL(redirectPath, location.href).href,
    },
  })
}

// 로그인
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

// 로그아웃
export async function signOut() {
  return supabase.auth.signOut()
}

// 현재 세션 (없으면 null). 새로고침해도 localStorage 에서 복구된다.
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// 로그인/로그아웃/토큰 갱신 때마다 callback(session) 호출
export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => callback(session))
}
