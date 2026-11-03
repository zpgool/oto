// js/sidebar.js
// partials/sidebar.html 을 읽어서 각 페이지의 <div id="sidebar"> 를 진짜 사이드바로 바꾼다.
// 페이지마다 사이드바를 복사해 두지 않아도 되고, 고칠 때 partials/sidebar.html 하나만 고치면 된다.
import { getSession, onAuthChange } from './auth.js'

const SIDEBAR_PATH = 'partials/sidebar.html'

// 지금 보고 있는 페이지의 파일 이름 (예: homeScreen.html)
function currentPage() {
  return location.pathname.split('/').pop() || 'homeScreen.html'
}

// 지금 페이지에 해당하는 메뉴에 .active 를 붙인다.
function markActiveLink(sidebar) {
  const page = currentPage()

  sidebar.querySelectorAll('.nav-main a').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === page)
  })
}

// 이메일에서 이름 부분만 꺼낸다. (jungwon@oto.com -> jungwon)
function nameFromEmail(email) {
  return email.split('@')[0]
}

// 로그인한 사용자의 이름과 이메일을 사이드바에 채운다.
// 이메일/비밀번호 가입에는 이름이 따로 없어서, 있으면 가입 때 저장한 이름을,
// 없으면 이메일 앞부분을 이름으로 쓴다.
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

  const metadata = user.user_metadata ?? {}
  nameEl.textContent = metadata.display_name ?? metadata.name ?? nameFromEmail(user.email)
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

  markActiveLink(sidebar)

  // 자리표시용 div 를 통째로 바꾼다.
  // div 를 남겨두면 .app 그리드의 칸을 div 가 차지해서 레이아웃이 틀어진다.
  placeholder.replaceWith(sidebar)

  // 사이드바를 넣은 뒤에 사용자 정보를 채운다.
  renderUser(await getSession())

  // 로그인/로그아웃 되면 사이드바 표시도 같이 바뀐다.
  onAuthChange(renderUser)
}

renderSidebar()
