// js/search.js
// 검색창에 입력하고 엔터를 누르면 YouTube 에서 음악을 검색해 결과 표에 보여준다.
import { searchMusic } from './youtube.js'

// ---- DOM ----
const searchForm = document.querySelector('#search-form')
const searchInput = document.querySelector('#search-input')
const recentBox = document.querySelector('#recent-box')
const resultBox = document.querySelector('#result-box')
const resultSummary = document.querySelector('#result-summary')
const resultTable = document.querySelector('#result-table')

// 검색 결과를 보여줄 때는 최근 검색어 영역을 숨긴다.
function showResults(isSearching) {
  resultBox.hidden = !isSearching
  recentBox.hidden = isSearching
}

// 표에서 헤더 행만 남기고 결과 행을 지운다.
function clearRows() {
  resultTable.querySelectorAll('.table-row').forEach((row) => row.remove())
}

function createCell(className, text) {
  const cell = document.createElement('span')
  cell.className = className
  if (text !== undefined) cell.textContent = text
  return cell
}

// 영상 하나를 표의 한 행으로 만든다.
// 제목에 특수문자가 들어올 수 있으니 innerHTML 대신 textContent 를 쓴다.
function createRow(video, index) {
  const row = document.createElement('div')
  row.className = 'table-row'
  row.dataset.videoId = video.videoId

  const title = createCell('col-title')

  const thumb = document.createElement('img')
  thumb.className = 'row-thumb'
  thumb.src = video.thumbnail
  thumb.alt = ''

  const info = createCell('row-info')
  info.append(createCell('row-name', video.title), createCell('row-artist', video.channel))
  title.append(thumb, info)

  const like = document.createElement('button')
  like.className = 'col-like'
  like.type = 'button'
  like.setAttribute('aria-label', '즐겨찾기')
  like.textContent = '♡'

  const add = document.createElement('button')
  add.className = 'col-add'
  add.type = 'button'
  add.setAttribute('aria-label', '추가')
  add.textContent = '+'

  row.append(
    createCell('col-num', String(index + 1)),
    title,
    createCell('col-album', video.channel),
    like,
    add,
    createCell('col-time', '--:--'),
  )

  return row
}

// ---- 검색 ----
searchForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const query = searchInput.value.trim()
  if (!query) return

  showResults(true)
  clearRows()
  resultSummary.textContent = `"${query}" 검색 중...`

  try {
    const videos = await searchMusic(query, 30)

    if (videos.length === 0) {
      resultSummary.textContent = `"${query}" 검색 결과가 없습니다.`
      return
    }

    resultSummary.textContent = `"${query}" 검색 결과 · ${videos.length}곡`
    resultTable.append(...videos.map(createRow))
  } catch (error) {
    resultSummary.textContent = `검색 실패: ${error.message}`
  }
})

// 검색창을 비우거나 X 를 누르면 최근 검색어 화면으로 돌아온다.
searchInput.addEventListener('search', () => {
  if (!searchInput.value.trim()) {
    showResults(false)
  }
})
