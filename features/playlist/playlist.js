// features/playlist/playlist.js
// 플레이리스트 한 개를 보여준다. 주소의 #/playlist/<id> 에서 id 를 받는다.
import { getPlaylist, removeTrack } from './playlistStore.js'
import { playTrack } from '../../shared/js/player.js'

let playlistId = null
let tracks = []

// ---- DOM ----
// 화면에 들어올 때마다 새로 만들어지므로 init() 에서 다시 찾는다.
let titleEl
let subEl
let playButton
let addSongButton
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

  const like = document.createElement('button')
  like.className = 'col-like'
  like.type = 'button'
  like.setAttribute('aria-label', '즐겨찾기')
  like.textContent = '♡'

  const remove = document.createElement('button')
  remove.className = 'col-del'
  remove.type = 'button'
  remove.setAttribute('aria-label', `${track.title} 빼기`)
  remove.textContent = '×'
  remove.addEventListener('click', async () => {
    remove.disabled = true

    try {
      await removeTrack(playlistId, track.songId)
      await load()
    } catch (failure) {
      alert(`빼지 못했습니다: ${failure.message}`)
      remove.disabled = false
    }
  })

  row.append(
    createCell('col-drag'),
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
    return
  }

  tracks = playlist.tracks

  titleEl.textContent = playlist.name
  subEl.textContent = `${tracks.length}곡`

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
  table = document.querySelector('#pl-table')
  emptyBox = document.querySelector('#pl-empty')

  // 아직 재생 목록 기능이 없어서, 첫 곡만 튼다.
  playButton.addEventListener('click', () => {
    if (tracks.length > 0) playTrack(tracks[0])
  })

  addSongButton.addEventListener('click', () => {
    location.hash = '#/search'
  })

  load()
}
