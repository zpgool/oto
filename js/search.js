// js/search.js
// 검색창에 입력하고 엔터를 누르면 YouTube 에서 음악을 검색해 목록으로 보여준다.
import { searchMusic } from './youtube.js'

// ---- DOM ----
const searchForm = document.querySelector('#search-form')
const searchInput = document.querySelector('#search-input')
const resultSection = document.querySelector('#search-results')
const resultList = document.querySelector('#search-result-list')
const resultTitle = document.querySelector('#search-result-title')

// 검색 결과를 보여줄 때 숨길 기본 화면들
const defaultSections = document.querySelectorAll('.greeting, .shortcuts, .playlists')

function showResultView(isSearching) {
  resultSection.hidden = !isSearching
  defaultSections.forEach((section) => {
    section.hidden = isSearching
  })
}

// 영상 하나를 <li> 로 만든다.
// 제목에 특수문자가 들어올 수 있으니 innerHTML 대신 textContent 를 쓴다.
function createResultItem(video) {
  const item = document.createElement('li')
  item.className = 'track-card'
  item.dataset.videoId = video.videoId

  const thumb = document.createElement('img')
  thumb.className = 'track-card__thumb'
  thumb.src = video.thumbnail
  thumb.alt = ''

  const info = document.createElement('div')
  info.className = 'track-card__info'

  const title = document.createElement('p')
  title.className = 'track-card__title'
  title.textContent = video.title

  const channel = document.createElement('p')
  channel.className = 'track-card__channel'
  channel.textContent = video.channel

  info.append(title, channel)
  item.append(thumb, info)

  return item
}

function renderResults(videos) {
  resultList.replaceChildren(...videos.map(createResultItem))
}

// ---- 검색 ----
searchForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const query = searchInput.value.trim()
  if (!query) return

  showResultView(true)
  resultTitle.textContent = `"${query}" 검색 중...`
  resultList.replaceChildren()

  try {
    const videos = await searchMusic(query, 15)

    resultTitle.textContent = `"${query}" 검색 결과`

    if (videos.length === 0) {
      resultTitle.textContent = `"${query}" 검색 결과가 없습니다.`
      return
    }

    renderResults(videos)
  } catch (error) {
    resultTitle.textContent = `검색 실패: ${error.message}`
  }
})

// 검색창을 비우고 엔터를 누르거나 X 를 누르면 기본 화면으로 돌아온다.
searchInput.addEventListener('search', () => {
  if (!searchInput.value.trim()) {
    showResultView(false)
  }
})
