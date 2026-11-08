// features/chart/chart.js
// 지난 30일 동안 많이 들은 노래를 1~3위 시상대와 4위 아래 표로 보여준다.
import { getPlayChart } from './chartStore.js'

// ---- DOM ----
// 화면에 들어올 때마다 새로 만들어지므로 init() 에서 다시 찾는다.
let podium
let rest
let restTitle
let table
let emptyMessage

function createCell(className, text) {
  const cell = document.createElement('span')
  cell.className = className
  if (text !== undefined) cell.textContent = text
  return cell
}

// 초 단위를 3:26 모양으로. 유튜브에서 길이를 받아오지 않아서 대개 비어 있다.
function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '--:--'

  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

// ---- 1 ~ 3위 ----
// 자리는 2위 1위 3위 순서로 늘 세 칸이다.
// 곡이 모자라면 빈 칸을 눈에만 안 보이게 넣는다. 그래야 1위가 늘 가운데에 온다.
function createPodiumItem(track, rank) {
  const item = document.createElement('div')
  item.className = `podium-item rank${rank}`

  const cover = document.createElement('div')
  cover.className = 'podium-cover'

  if (!track) {
    item.classList.add('podium-empty')
    item.setAttribute('aria-hidden', 'true')
    item.append(cover)
    return item
  }

  if (track.thumbnail) cover.style.backgroundImage = `url("${track.thumbnail}")`

  const number = document.createElement('span')
  number.className = 'podium-rank'
  number.textContent = String(rank).padStart(2, '0')

  const name = document.createElement('span')
  name.className = 'podium-name'
  name.textContent = track.title

  const artist = document.createElement('span')
  artist.className = 'podium-artist'
  artist.textContent = track.channel

  const count = document.createElement('span')
  count.className = 'podium-count'
  count.textContent = `${track.playCount}회 재생`

  item.append(cover, number, name, artist, count)

  return item
}

// ---- 4위 아래 ----
function createRow(track) {
  const row = document.createElement('div')
  row.className = 'table-row'

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

  row.append(
    createCell('col-rank', String(track.rank)),
    title,
    createCell('col-album', track.album ?? '-'),
    createCell('col-count', `${track.playCount}회`),
    createCell('col-time', formatDuration(track.duration)),
    like,
  )

  return row
}

// 표에서 헤더 행만 남기고 곡 행을 지운다.
function clearRows() {
  table.querySelectorAll('.table-row').forEach((row) => row.remove())
}

async function load() {
  let chart

  try {
    chart = await getPlayChart()
  } catch (failure) {
    emptyMessage.textContent = `차트를 불러오지 못했습니다: ${failure.message}`
    emptyMessage.hidden = false
    return
  }

  if (chart.length === 0) {
    podium.hidden = true
    rest.hidden = true
    emptyMessage.hidden = false
    return
  }

  emptyMessage.hidden = true

  // 왼쪽부터 2위, 1위, 3위. 곡이 모자라도 세 칸을 그대로 만든다.
  const slots = [2, 1, 3]
  podium.replaceChildren(...slots.map((rank) => createPodiumItem(chart[rank - 1], rank)))
  podium.hidden = false

  const others = chart.slice(3)

  clearRows()
  table.append(...others.map(createRow))

  // 4곡 아래면 표 자체를 보여주지 않는다.
  rest.hidden = others.length === 0
  restTitle.textContent = `4위 - ${chart.length}위`
}

// ---- 시작 ----
// router 가 차트 화면을 #view 에 넣은 뒤에 불러준다.
export function init() {
  podium = document.querySelector('#chart-podium')
  rest = document.querySelector('#chart-rest')
  restTitle = document.querySelector('#chart-rest-title')
  table = document.querySelector('#chart-table')
  emptyMessage = document.querySelector('#chart-empty')

  load()
}
