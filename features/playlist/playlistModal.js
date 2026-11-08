// features/playlist/playlistModal.js
// 플레이리스트 관련 팝업 두 개.
//   - openCreatePlaylistModal()       이름을 받아 새 플레이리스트를 만든다
//   - openAddToPlaylistModal(track)   어느 플레이리스트에 담을지 고른다
// <dialog> 를 쓰기 때문에 Esc 로 닫기와 뒤 배경 어둡게가 브라우저 기본으로 된다.
import {
  listPlaylists,
  createPlaylist,
  addTrack,
  findPlaylistsWithTrack,
  renamePlaylist,
  deletePlaylist,
} from './playlistStore.js'
import { showToast } from '../../shared/js/toast.js'

// ---- 팝업 껍데기 ----
// 제목과 닫기 버튼이 달린 빈 팝업을 띄우고, 내용을 채울 자리를 돌려준다.
function openDialog(title) {
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

function createMessage(className, text) {
  const message = document.createElement('p')
  message.className = className
  message.textContent = text
  return message
}

// ---- 새 플레이리스트 만들기 ----
// 만들어진 플레이리스트를 돌려준다. 그냥 닫으면 null.
export function openCreatePlaylistModal() {
  const { dialog, body } = openDialog('새 플레이리스트')

  return new Promise((resolve) => {
    let created = null

    const form = document.createElement('form')
    form.className = 'modal-form'

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'modal-input'
    input.placeholder = '플레이리스트 이름'
    input.maxLength = 60
    input.required = true
    input.autocomplete = 'off'

    const error = createMessage('modal-error', '')
    error.hidden = true

    const actions = document.createElement('div')
    actions.className = 'modal-actions'

    const cancelButton = document.createElement('button')
    cancelButton.type = 'button'
    cancelButton.className = 'modal-btn'
    cancelButton.textContent = '취소'
    cancelButton.addEventListener('click', () => dialog.close())

    const submitButton = document.createElement('button')
    submitButton.type = 'submit'
    submitButton.className = 'modal-btn modal-btn-primary'
    submitButton.textContent = '만들기'

    actions.append(cancelButton, submitButton)
    form.append(input, error, actions)
    body.append(form)

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      const name = input.value.trim()
      if (!name) return

      // 두 번 눌러서 두 개 만들어지는 것을 막는다.
      submitButton.disabled = true
      submitButton.textContent = '만드는 중...'
      error.hidden = true

      try {
        created = await createPlaylist(name)
        dialog.close()
        showToast(`'${created.name}' 플레이리스트를 만들었습니다`)
      } catch (failure) {
        error.textContent = `만들지 못했습니다: ${failure.message}`
        error.hidden = false
        submitButton.disabled = false
        submitButton.textContent = '만들기'
      }
    })

    dialog.addEventListener('close', () => resolve(created))

    input.focus()
  })
}

// ---- 플레이리스트에 곡 담기 ----
export async function openAddToPlaylistModal(track) {
  const { dialog, body } = openDialog('플레이리스트에 추가')

  const subtitle = createMessage('modal-sub', track.title)
  const status = createMessage('modal-status', '불러오는 중...')
  body.append(subtitle, status)

  let playlists
  let taken

  try {
    // 내 플레이리스트 목록과, 이 곡이 이미 담긴 곳을 같이 받아온다.
    ;[playlists, taken] = await Promise.all([
      listPlaylists(),
      findPlaylistsWithTrack(track.videoId),
    ])
  } catch (failure) {
    status.className = 'modal-error'
    status.textContent = `불러오지 못했습니다: ${failure.message}`
    return
  }

  // 팝업을 닫은 뒤에 응답이 도착했을 수 있다.
  if (!dialog.isConnected) return

  status.remove()

  const error = createMessage('modal-error', '')
  error.hidden = true

  // 곡을 담고 팝업을 닫는다.
  async function addAndClose(playlist, button) {
    button.disabled = true
    error.hidden = true

    try {
      await addTrack(playlist.id, track)
      dialog.close()
      showToast(`'${playlist.name}' 에 추가되었습니다`)
    } catch (failure) {
      error.textContent = failure.message
      error.hidden = false
      button.disabled = false
    }
  }

  function createItem(playlist) {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'modal-item'

    const name = document.createElement('span')
    name.className = 'modal-item-name'
    name.textContent = playlist.name

    const note = document.createElement('span')
    note.className = 'modal-item-note'

    // 이미 담긴 곡은 다시 담을 수 없다.
    if (taken.has(playlist.id)) {
      note.textContent = '담김'
      item.disabled = true
    } else {
      note.textContent = `${playlist.trackCount}곡`
      item.addEventListener('click', () => addAndClose(playlist, item))
    }

    item.append(name, note)
    return item
  }

  if (playlists.length === 0) {
    body.append(createMessage('modal-empty', '아직 플레이리스트가 없어요.'))
  } else {
    const list = document.createElement('div')
    list.className = 'modal-list'
    list.append(...playlists.map(createItem))
    body.append(list)
  }

  // 여기서 바로 새 플레이리스트를 만들고, 만든 곳에 이 곡을 담는다.
  const newButton = document.createElement('button')
  newButton.type = 'button'
  newButton.className = 'modal-item modal-item-new'
  newButton.textContent = '＋ 새 플레이리스트 만들기'
  newButton.addEventListener('click', async () => {
    dialog.close()

    const playlist = await openCreatePlaylistModal()
    if (!playlist) return

    try {
      await addTrack(playlist.id, track)
      showToast(`'${playlist.name}' 에 추가되었습니다`)
    } catch (failure) {
      alert(`담지 못했습니다: ${failure.message}`)
    }
  })

  body.append(newButton, error)
}

// ---- 플레이리스트 설정 (이름 변경 / 삭제) ----
// 무엇을 했는지 돌려준다. { action: 'renamed', name } 또는 { action: 'deleted' }, 그냥 닫으면 null.
export function openPlaylistSettingsModal(playlist) {
  const { dialog, body } = openDialog('플레이리스트 설정')

  return new Promise((resolve) => {
    let result = null

    // --- 이름 변경 ---
    const form = document.createElement('form')
    form.className = 'modal-form'

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'modal-input'
    input.value = playlist.name
    input.maxLength = 60
    input.required = true
    input.autocomplete = 'off'
    input.setAttribute('aria-label', '플레이리스트 이름')

    const error = createMessage('modal-error', '')
    error.hidden = true

    const actions = document.createElement('div')
    actions.className = 'modal-actions'

    const saveButton = document.createElement('button')
    saveButton.type = 'submit'
    saveButton.className = 'modal-btn modal-btn-primary'
    saveButton.textContent = '이름 저장'

    actions.append(saveButton)
    form.append(input, error, actions)

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      const name = input.value.trim()
      if (!name || name === playlist.name) return

      saveButton.disabled = true
      saveButton.textContent = '저장 중...'
      error.hidden = true

      try {
        const renamed = await renamePlaylist(playlist.id, name)
        result = { action: 'renamed', name: renamed.name }
        dialog.close()
        showToast('이름을 바꿨습니다')
      } catch (failure) {
        error.textContent = `바꾸지 못했습니다: ${failure.message}`
        error.hidden = false
        saveButton.disabled = false
        saveButton.textContent = '이름 저장'
      }
    })

    // --- 삭제 ---
    // 되돌릴 수 없는 일이라 한 번 더 묻는다.
    const danger = document.createElement('div')
    danger.className = 'modal-danger'

    const deleteButton = document.createElement('button')
    deleteButton.type = 'button'
    deleteButton.className = 'modal-btn modal-btn-danger'
    deleteButton.textContent = '플레이리스트 삭제'

    deleteButton.addEventListener('click', () => {
      const question = createMessage('modal-confirm', '정말 삭제할까요? 담긴 곡 목록도 같이 사라집니다.')

      const confirmActions = document.createElement('div')
      confirmActions.className = 'modal-actions'

      const cancelButton = document.createElement('button')
      cancelButton.type = 'button'
      cancelButton.className = 'modal-btn'
      cancelButton.textContent = '취소'
      cancelButton.addEventListener('click', () => danger.replaceChildren(deleteButton))

      const reallyButton = document.createElement('button')
      reallyButton.type = 'button'
      reallyButton.className = 'modal-btn modal-btn-danger'
      reallyButton.textContent = '삭제'
      reallyButton.addEventListener('click', async () => {
        reallyButton.disabled = true
        cancelButton.disabled = true
        reallyButton.textContent = '삭제 중...'

        try {
          await deletePlaylist(playlist.id)
          result = { action: 'deleted' }
          dialog.close()
          showToast('플레이리스트를 삭제했습니다')
        } catch (failure) {
          danger.replaceChildren(deleteButton)
          error.textContent = `삭제하지 못했습니다: ${failure.message}`
          error.hidden = false
        }
      })

      confirmActions.append(cancelButton, reallyButton)
      danger.replaceChildren(question, confirmActions)
    })

    danger.append(deleteButton)
    body.append(form, danger)

    dialog.addEventListener('close', () => resolve(result))

    input.focus()
    input.select()
  })
}
