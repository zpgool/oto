// shared/js/queueModal.js
// 재생바의 ☰ 버튼을 누르면 뜨는 재생목록 팝업.
// 지금 재생 중인 곡과, 이어서 틀 곡들을 보여준다.
//
// 한 곡만 튼 경우(검색 결과나 차트에서 고른 경우)에는 이어서 틀 곡이 없다.
// 플레이리스트에서 전체 재생을 누르면 그 순서대로 여기에 들어온다.
import { openDialog } from './modal.js'
import { getQueue, playQueueIndex, onQueueChanged, offQueueChanged } from './player.js'

// 곡 하나를 줄 하나로. 누르면 그 곡으로 건너뛴다.
function createItem(track, index, isCurrent) {
  const item = document.createElement('button')
  item.type = 'button'
  item.className = isCurrent ? 'modal-item queue-current' : 'modal-item'

  const name = document.createElement('span')
  name.className = 'modal-item-name'
  name.textContent = track.title

  const note = document.createElement('span')
  note.className = 'modal-item-note'
  note.textContent = isCurrent ? '재생 중' : track.channel

  item.append(name, note)

  // 지금 듣고 있는 곡을 다시 누르면 처음부터 되감기므로 막아 둔다.
  if (isCurrent) {
    item.disabled = true
  } else {
    item.addEventListener('click', () => playQueueIndex(index))
  }

  return item
}

export function openQueueModal() {
  const { dialog, body } = openDialog('재생목록')

  function render() {
    const { tracks, index } = getQueue()

    // 지금 곡과 그 뒤만 보여준다. 이미 지나간 곡은 빼서 '다음에 뭐가 나오는지' 에 집중한다.
    const upcoming = tracks.slice(index)

    if (upcoming.length === 0) {
      body.replaceChildren(createMessage('아직 재생 중인 곡이 없어요.'))
      return
    }

    const list = document.createElement('div')
    list.className = 'modal-list'
    list.append(...upcoming.map((track, offset) => createItem(track, index + offset, offset === 0)))

    const parts = [list]

    // 이어서 틀 곡이 없으면 왜 없는지 알려준다.
    if (upcoming.length === 1) {
      parts.push(
        createMessage('다음 곡이 없어요. 플레이리스트에서 전체 재생을 누르면 이어서 재생됩니다.'),
      )
    }

    body.replaceChildren(...parts)
  }

  function createMessage(text) {
    const message = document.createElement('p')
    message.className = 'modal-empty'
    message.textContent = text
    return message
  }

  // 팝업이 열려 있는 동안 곡이 넘어가면 목록도 따라 바뀐다.
  onQueueChanged(render)
  dialog.addEventListener('close', () => offQueueChanged(render))

  render()
}
