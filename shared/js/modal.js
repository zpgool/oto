// shared/js/modal.js
// 팝업 껍데기. 제목과 닫기 버튼이 달린 빈 창을 띄우고, 내용을 채울 자리를 돌려준다.
//
// <dialog> 를 쓰기 때문에 Esc 로 닫기와 뒤 배경 어둡게가 브라우저 기본으로 된다.
// 모양은 shared/css/modal.css 에 있다.
export function openDialog(title) {
  const dialog = document.createElement('dialog')
  dialog.className = 'modal'

  const head = document.createElement('div')
  head.className = 'modal-head'

  const heading = document.createElement('h2')
  heading.className = 'modal-title'
  heading.textContent = title

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'modal-close'
  closeButton.setAttribute('aria-label', '닫기')
  closeButton.textContent = '×'
  closeButton.addEventListener('click', () => dialog.close())

  head.append(heading, closeButton)

  const body = document.createElement('div')
  body.className = 'modal-body'

  dialog.append(head, body)
  document.body.append(dialog)

  // 닫히면 흔적을 남기지 않는다.
  dialog.addEventListener('close', () => dialog.remove())

  // 팝업 바깥(어두운 부분)을 누르면 닫는다.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })

  dialog.showModal()

  return { dialog, body }
}
