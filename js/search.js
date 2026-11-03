// js/search.js
// 검색창에 입력하고 엔터를 누르면 YouTube 에서 음악을 검색해 결과 표에 보여준다.
// 검색한 말은 최근 검색어로 저장해서 다시 누르면 바로 검색된다.
import { searchMusic } from './youtube.js'
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from './recentSearch.js'

// ---- DOM ----
const searchForm = document.querySelector('#search-form')
const searchInput = document.querySelector('#search-input')
const recentBox = document.querySelector('#recent-box')
const recentList = document.querySelector('#recent-list')
const clearRecentButton = document.querySelector('#clear-recent')
const resultBox = document.querySelector('#result-box')
const resultSummary = document.querySelector('#result-summary')
const resultTable = document.querySelector('#result-table')

// ---- 최근 검색어 ----
// 검색어 하나를 둥근 칩 모양 <li> 로 만든다.
function createRecentItem(query) {
  const item = document.createElement('li')
  item.className = 'recent-item'

  // 검색어를 누르면 그 말로 다시 검색한다.
  const text = document.createElement('span')
  text.className = 'recent-text'
  text.textContent = query
  text.addEventListener('click', () => {
    searchInput.value = query
    runSearch(query)
  })

  // × 를 누르면 그 검색어만 지운다.
  const removeButton = document.createElement('button')
  removeButton.className = 'recent-del'
  removeButton.type = 'button'
  removeButton.setAttribute('aria-label', `${query} 삭제`)
  removeButton.textContent = '×'
  removeButton.addEventListener('click', () => {
    removeRecentSearch(query)
    renderRecentSearches()
  })

  item.append(text, removeButton)
  return item
}

function renderRecentSearches() {
  const queries = getRecentSearches()

  recentList.replaceChildren(...queries.map(createRecentItem))

  // 저장된 검색어가 없으면 영역 자체를 숨긴다.
  recentBox.hidden = queries.length === 0
}

clearRecentButton.addEventListener('click', () => {
  clearRecentSearches()
  renderRecentSearches()
})

// ---- 검색 결과 ----
// 검색 결과를 보여줄 때는 최근 검색어 영역을 숨긴다.
function showResults(isSearching) {
  resultBox.hidden = !isSearching

  if (isSearching) {
    recentBox.hidden = true
  } else {
    renderRecentSearches()
  }
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
async function runSearch(query) {
  showResults(true)
  clearRows()
  resultSummary.textContent = `"${query}" 검색 중...`

  try {
    const videos = await searchMusic(query, 30)

    // 검색이 성공했을 때만 최근 검색어로 남긴다.
    addRecentSearch(query)

    if (videos.length === 0) {
      resultSummary.textContent = `"${query}" 검색 결과가 없습니다.`
      return
    }

    resultSummary.textContent = `"${query}" 검색 결과 · ${videos.length}곡`
    resultTable.append(...videos.map(createRow))
  } catch (error) {
    resultSummary.textContent = `검색 실패: ${error.message}`
  }
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const query = searchInput.value.trim()
  if (!query) return

  runSearch(query)
})

// 검색창을 비우거나 X 를 누르면 최근 검색어 화면으로 돌아온다.
searchInput.addEventListener('search', () => {
  if (!searchInput.value.trim()) {
    showResults(false)
  }
})

// ---- 첫 화면 ----
renderRecentSearches()
