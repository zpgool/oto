// features/favorite/favorite.js
// 즐겨찾기 화면 한 개를 보여준다.
// 화면에 들어올 때 DB 에서 내 즐겨찾기 목록을 불러와 표로 그린다.
//
// 이 화면은 router 에서 keep: false 로 등록돼 있어서, 들어올 때마다 새로 만들어진다.
// 그래서 검색 화면에서 방금 즐겨찾기한 곡도 이 화면에 들어오면 바로 보인다.
import { listFavorites, removeFavorite } from './favoriteStore.js'
import { playTrack } from '../../shared/js/player.js'
import { showToast } from '../../shared/js/toast.js'

// ---- DOM ----
// 화면에 들어올 때마다 HTML 이 새로 만들어지므로 init() 에서 다시 찾는다.
let table
let emptyBox
let subEl
let playButton

// 지금 화면에 보이는 곡들. 재생 버튼이 첫 곡을 틀 때 쓴다.
// 하트로 해제하면 화면에서 지우는 것과 함께 이 목록에서도 뺀다.
let tracks = []

// class 와 글자만 넣은 <span> 칸 하나를 만든다. (검색·플레이리스트 화면과 같은 도우미)
function createCell(className, text) {
  const cell = document.createElement('span')
  cell.className = className
  if (text !== undefined) cell.textContent = text
  return cell
}

// 즐겨찾기 곡 하나를 표의 한 행으로 만든다.
// track 모양: { songId, videoId, title, channel, thumbnail } (favoriteStore 가 돌려준 것)
function createRow(track) {
  const row = document.createElement('div')
  row.className = 'table-row'

  // 행을 누르면 재생한다. 단, 하트 버튼을 누른 경우는 재생하지 않는다.
  // (하트는 '즐겨찾기 해제'라는 자기 동작이 따로 있어서 제외한다)
  row.addEventListener('click', (event) => {
    if (event.target.closest('button')) return
    playTrack(track)
  })

  // 제목 칸: 썸네일 + (곡 제목 / 아티스트)
  const title = createCell('col-title')

  const thumb = document.createElement('img')
  thumb.className = 'row-thumb'
  thumb.src = track.thumbnail
  thumb.alt = ''

  const info = createCell('row-info')
  info.append(createCell('row-name', track.title), createCell('row-artist', track.channel))
  title.append(thumb, info)

  // 하트 버튼: 즐겨찾기 화면에 있는 곡은 전부 즐겨찾기된 상태이므로 처음부터 채워진(♥) 모양.
  // 누르면 즐겨찾기를 해제하고, 그 행을 화면에서도 바로 지운다.
  const like = document.createElement('button')
  like.className = 'col-like liked'
  like.type = 'button'
  like.setAttribute('aria-label', '즐겨찾기 해제')
  like.textContent = '♥'
  like.addEventListener('click', async () => {
    // 응답을 기다리는 동안 두 번 눌리지 않게 잠근다.
    like.disabled = true

    try {
      await removeFavorite(track.videoId)
      row.remove()       // DB 에서 지웠으니 화면에서도 뺀다
      tracks = tracks.filter((item) => item.videoId !== track.videoId)
      updateCount()      // 남은 곡 수 / 빈 상태 / 재생 버튼을 다시 맞춘다
      showToast('즐겨찾기에서 뺐습니다')
    } catch (failure) {
      // 실패하면 행을 그대로 두고 버튼을 다시 풀어, 또 눌러볼 수 있게 한다.
      alert(`해제하지 못했습니다: ${failure.message}`)
      like.disabled = false
    }
  })

  // 칸 순서는 favoriteScreen.html 의 헤더(제목·앨범·시간·하트)와 같아야 어긋나지 않는다.
  row.append(
    title,
    createCell('col-album', track.channel),
    createCell('col-time', '--:--'), // 유튜브 검색은 재생 시간을 주지 않아 비워 둔다
    like,
  )

  return row
}

// 남은 곡 수를 세어 부제목·"빈 상태" 안내·재생 버튼을 다시 맞춘다.
// 곡을 해제해서 0 개가 되면 표를 숨기고 빈 상태 안내를 보여준다.
function updateCount() {
  const count = tracks.length

  subEl.textContent = `${count}곡`
  emptyBox.hidden = count > 0
  table.hidden = count === 0
  playButton.disabled = count === 0
}

// ---- 시작 ----
// router 가 즐겨찾기 화면을 #view 에 넣은 뒤에 불러준다.
export async function init() {
  table = document.querySelector('#fav-table')
  emptyBox = document.querySelector('#fav-empty')
  subEl = document.querySelector('#fav-sub')
  playButton = document.querySelector('#fav-play')
  tracks = []

  // 아직 재생 목록 기능이 없어서 첫 곡만 튼다. (플레이리스트 화면과 같다)
  playButton.addEventListener('click', () => {
    if (tracks.length > 0) playTrack(tracks[0])
  })

  try {
    tracks = await listFavorites()

    // 헤더 행만 남기고(혹시 모를) 기존 행을 지운 뒤, 불러온 곡으로 채운다.
    table.querySelectorAll('.table-row').forEach((row) => row.remove())
    table.append(...tracks.map(createRow))

    updateCount()
  } catch (failure) {
    console.error('즐겨찾기를 불러오지 못했습니다:', failure)
    subEl.textContent = '불러오지 못했습니다'
  }
}
