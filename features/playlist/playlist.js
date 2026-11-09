// features/playlist/playlist.js
// 플레이리스트 한 개를 보여준다. 주소의 #/playlist/<id> 에서 id 를 받는다.
import { getPlaylist, removeTrack, reorderTracks } from './playlistStore.js'
import { openPlaylistSettingsModal } from './playlistModal.js'
import { playTrack } from '../../shared/js/player.js'
import { attachHeart } from '../favorite/favoriteHeart.js'
import { showToast } from '../../shared/js/toast.js'

let playlistId = null
let playlistName = ''
let tracks = []
let draggingRow = null

// ---- DOM ----
// 화면에 들어올 때마다 새로 만들어지므로 init() 에서 다시 찾는다.
let titleEl
let subEl
let playButton
let addSongButton
let settingsButton
let table
let emptyBox

function createCell(className, text) {
  const cell = document.createElement('span')
  cell.className = className
  if (text !== undefined) cell.textContent = text
  return cell
}

// 곡 하나를 표의 한 행으로 만든다.
function createRow(track, index) {
  const row = document.createElement('div')
  row.className = 'table-row'

  // 끌어서 순서를 바꿀 수 있다. 어느 행인지는 rowId 로 알아낸다.
  row.draggable = true
  row.dataset.rowId = String(track.rowId)

  // 행을 누르면 재생한다. (삭제 같은 버튼은 각자 동작하므로 제외)
  row.addEventListener('click', (event) => {
    if (event.target.closest('button')) return
    playTrack(track)
  })

  const title = createCell('col-title')

  const thumb = document.createElement('img')
  thumb.className = 'row-thumb'
  thumb.src = track.thumbnail
  thumb.alt = ''

  const info = createCell('row-info')
  info.append(createCell('row-name', track.title), createCell('row-artist', track.channel))
  title.append(thumb, info)

  // 하트: 누르면 즐겨찾기에 넣고 뺀다. 모양·알림은 attachHeart 가 맡는다.
  const like = document.createElement('button')
  like.className = 'col-like'
  like.type = 'button'
  attachHeart(like, () => track)

  const remove = document.createElement('button')
  remove.className = 'col-del'
  remove.type = 'button'
  remove.setAttribute('aria-label', `${track.title} 빼기`)
  remove.textContent = '×'
  remove.addEventListener('click', async () => {
    remove.disabled = true

    try {
      await removeTrack(playlistId, track.songId)
      showToast('곡을 뺐습니다')
      await load()
    } catch (failure) {
      alert(`빼지 못했습니다: ${failure.message}`)
      remove.disabled = false
    }
  })

  row.append(
    createCell('col-drag', '⠿'),
    createCell('col-num', String(index + 1).padStart(2, '0')),
    title,
    createCell('col-album', track.channel),
    like,
    remove,
    createCell('col-time', '--:--'),
  )

  return row
}

// 표에서 헤더 행만 남기고 곡 행을 지운다.
function clearRows() {
  table.querySelectorAll('.table-row').forEach((row) => row.remove())
}

// ---- 순서 바꾸기 ----
// 끌고 있는 행이 들어갈 자리를 찾는다. 커서보다 아래에서 시작하는 첫 행 앞에 넣는다.
function rowAfterPoint(y) {
  const rows = [...table.querySelectorAll('.table-row:not(.dragging)')]

  return rows.find((row) => {
    const box = row.getBoundingClientRect()
    return y < box.top + box.height / 2
  })
}

// 화면에 보이는 순서대로 번호를 다시 매긴다.
function renumber() {
  table.querySelectorAll('.table-row').forEach((row, index) => {
    row.querySelector('.col-num').textContent = String(index + 1).padStart(2, '0')
  })
}

async function saveOrder() {
  const rowIds = [...table.querySelectorAll('.table-row')].map((row) => row.dataset.rowId)
  const moved = rowIds.map((rowId) => tracks.find((track) => String(track.rowId) === rowId))

  // 못 찾은 행이 있으면 건드리지 않는다.
  if (moved.some((track) => !track)) return

  // 끌었다가 제자리에 놓은 경우에는 아무것도 하지 않는다.
  if (moved.every((track, index) => track === tracks[index])) return

  tracks = moved
  renumber()

  try {
    await reorderTracks(playlistId, tracks)
  } catch (failure) {
    alert(`순서를 저장하지 못했습니다: ${failure.message}`)
    await load()
  }
}

function setupDragging() {
  table.addEventListener('dragstart', (event) => {
    const row = event.target.closest('.table-row')
    if (!row) return

    draggingRow = row
    row.classList.add('dragging')
    event.dataTransfer.effectAllowed = 'move'

    // 파이어폭스는 데이터가 들어 있어야 끌기가 시작된다.
    event.dataTransfer.setData('text/plain', row.dataset.rowId)
  })

  // 끌고 다니는 동안 행을 미리 옮겨서 어디에 놓이는지 보여준다.
  table.addEventListener('dragover', (event) => {
    if (!draggingRow) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    const next = rowAfterPoint(event.clientY)
    if (next) {
      table.insertBefore(draggingRow, next)
    } else {
      table.append(draggingRow)
    }
  })

  // 기본 동작(주소창으로 받기 등)을 막는다.
  table.addEventListener('drop', (event) => event.preventDefault())

  table.addEventListener('dragend', async () => {
    if (!draggingRow) return

    draggingRow.classList.remove('dragging')
    draggingRow = null

    await saveOrder()
  })
}

// ---- 불러오기 ----
async function load() {
  let playlist

  try {
    playlist = await getPlaylist(playlistId)
  } catch (failure) {
    titleEl.textContent = '불러오지 못했습니다'
    subEl.textContent = failure.message
    return
  }

  // 지워졌거나 남의 플레이리스트면 보안 규칙 때문에 아무것도 오지 않는다.
  if (!playlist) {
    titleEl.textContent = '없는 플레이리스트'
    subEl.textContent = ''
    table.hidden = true
    emptyBox.hidden = true
    settingsButton.disabled = true
    return
  }

  playlistName = playlist.name
  tracks = playlist.tracks

  titleEl.textContent = playlistName
  subEl.textContent = `${tracks.length}곡`

  // 저장된 커버 사진이 있으면 보여주고, 없으면 기본 그라데이션을 쓴다.
  const cover = document.querySelector('.pl-cover')
  if (cover) {
    if (playlist.coverUrl) {
      cover.style.backgroundImage = `url(${playlist.coverUrl})`
    } else {
      cover.style.backgroundImage = ''
    }
  }

  clearRows()
  table.append(...tracks.map(createRow))

  table.hidden = tracks.length === 0
  emptyBox.hidden = tracks.length > 0
  playButton.disabled = tracks.length === 0
}


// ---- 시작 ----
// router 가 화면을 넣은 뒤에 주소에서 뽑은 id 를 담아서 불러준다.
export function init(params) {
  playlistId = params.id

  titleEl = document.querySelector('#pl-title')
  subEl = document.querySelector('#pl-sub')
  playButton = document.querySelector('#pl-play')
  addSongButton = document.querySelector('#pl-add-song')
  settingsButton = document.querySelector('#pl-settings')
  table = document.querySelector('#pl-table')
  emptyBox = document.querySelector('#pl-empty')

  // 아직 재생 목록 기능이 없어서, 첫 곡만 튼다.
  playButton.addEventListener('click', () => {
    if (tracks.length > 0) playTrack(tracks[0])
  })

  addSongButton.addEventListener('click', () => {
    location.hash = '#/search'
  })

  settingsButton.addEventListener('click', async () => {
    const done = await openPlaylistSettingsModal({ id: playlistId, name: playlistName })
    if (!done) return

    // 지웠으면 더 볼 화면이 없으니 홈으로 보낸다.
    if (done.action === 'deleted') {
      location.hash = '#/home'
      return
    }

    playlistName = done.name
    titleEl.textContent = playlistName
  })

  setupDragging()
  load()
}
