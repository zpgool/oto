// features/search/recentSearch.js
// 최근 검색어를 브라우저(localStorage)에 저장한다.
// 이 브라우저에만 남고 다른 기기에서는 보이지 않는다.
const STORAGE_KEY = 'oto.recentSearches'
const MAX_ITEMS = 10

export function getRecentSearches() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    // 저장된 값이 깨졌거나 localStorage 를 쓸 수 없는 경우
    return []
  }
}

function save(queries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queries))
  } catch {
    // 시크릿 모드 등에서 저장이 막혀도 검색 자체는 되게 둔다.
  }
}

// 검색어를 맨 앞에 넣는다. 이미 있으면 중복 대신 맨 앞으로 올린다.
export function addRecentSearch(query) {
  const queries = getRecentSearches().filter((item) => item !== query)
  queries.unshift(query)
  save(queries.slice(0, MAX_ITEMS))
}

export function removeRecentSearch(query) {
  save(getRecentSearches().filter((item) => item !== query))
}

export function clearRecentSearches() {
  save([])
}
