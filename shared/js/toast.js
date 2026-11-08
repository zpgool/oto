// shared/js/toast.js
// 화면 위쪽에 잠깐 떴다 사라지는 알림.
// showToast('플레이리스트에 추가되었습니다') 처럼 부르면 된다.
const VISIBLE_MS = 2600
const FADE_MS = 300

let area = null

// 알림들이 쌓일 자리. 처음 부를 때 한 번만 만든다.
function ensureArea() {
  if (area?.isConnected) return area

  area = document.createElement('div')
  area.className = 'toast-area'

  // 화면 낭독기가 새로 뜬 알림을 읽어준다.
  area.setAttribute('aria-live', 'polite')

  document.body.append(area)
  return area
}

export function showToast(message) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message

  ensureArea().append(toast)

  // 붙인 다음 프레임에 클래스를 붙여야 나타나는 모습이 보인다.
  requestAnimationFrame(() => toast.classList.add('toast-shown'))

  setTimeout(() => {
    toast.classList.remove('toast-shown')

    // 사라지는 모습이 끝나면 지운다. 움직임이 꺼져 있어도 남지 않도록 시간으로도 지운다.
    setTimeout(() => toast.remove(), FADE_MS)
  }, VISIBLE_MS)
}
