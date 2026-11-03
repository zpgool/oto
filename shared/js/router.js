// shared/js/router.js
// 주소 끝의 #/... 을 보고 app.html 가운데(#view)만 갈아 끼운다.
// 페이지를 새로 읽지 않기 때문에 사이드바와 플레이어 바는 그대로 살아 있고, 음악도 끊기지 않는다.
import { markActiveSidebar } from './sidebar.js'

// 화면 하나하나의 정보.
// view   : #view 에 넣을 HTML 조각
// title  : 브라우저 탭에 보일 이름
// klass  : .content 뒤에 더 붙일 클래스 (없으면 .content 만)
// load   : 그 화면에서만 쓰는 스크립트. 화면을 넣은 뒤에 init() 을 부른다.
const ROUTES = {
  '/home': {
    view: '../../features/home/homeScreen.html',
    title: '홈',
  },
  '/search': {
    view: '../../features/search/searchScreen.html',
    title: '검색',
    load: () => import('../../features/search/search.js'),
  },
  '/chart': {
    view: '../../features/chart/personalChartScreen.html',
    title: '내 재생 차트',
  },
  '/playlist': {
    view: '../../features/playlist/playlistScreen.html',
    title: '플레이리스트',
    klass: 'content-pl',
  },
  '/playlist/new': {
    view: '../../features/playlist/newPlaylistScreen.html',
    title: '새 플레이리스트',
    klass: 'content-pl',
  },
}

const DEFAULT_PATH = '/home'

// 빠르게 여러 번 눌렀을 때 늦게 도착한 옛 화면이 새 화면을 덮지 않도록 번호를 매긴다.
let renderCount = 0

// 한 번 만든 화면은 버리지 않고 들고 있는다.
// 그래야 검색 화면을 나갔다 들어와도 검색 결과와 스크롤 위치가 그대로 남는다.
// DOM 을 떼었다 다시 붙이는 것이라 걸어둔 클릭 처리도 그대로 살아 있다.
const kept = new Map()
let shownPath = null

// 지금 보고 있는 화면을 떼어서 보관한다.
function keepCurrent(view) {
  if (!shownPath) return

  kept.set(shownPath, {
    nodes: [...view.childNodes],
    scrollTop: view.scrollTop,
  })
}

// '#/search' 에서 '/search' 만 꺼낸다. 모르는 주소면 홈으로 본다.
function currentPath() {
  const path = location.hash.slice(1)
  return ROUTES[path] ? path : DEFAULT_PATH
}

async function render() {
  const path = currentPath()
  const route = ROUTES[path]
  const view = document.querySelector('#view')
  const myTurn = ++renderCount

  // 주소가 비었거나 엉뚱하면 홈으로 적어둔다.
  // replaceState 는 hashchange 를 일으키지 않아서 render 가 두 번 돌지 않는다.
  if (location.hash.slice(1) !== path) {
    history.replaceState(null, '', `#${path}`)
  }

  markActiveSidebar()

  // 전에 들렀던 화면이면 그때 모습 그대로 다시 붙인다. 새로 읽지 않는다.
  const saved = kept.get(path)
  if (saved) {
    keepCurrent(view)
    shownPath = path

    view.className = route.klass ? `content ${route.klass}` : 'content'
    view.replaceChildren(...saved.nodes)
    view.scrollTop = saved.scrollTop
    document.title = `Oto. · ${route.title}`
    return
  }

  const response = await fetch(new URL(route.view, import.meta.url))
  if (!response.ok) {
    console.error('화면을 불러오지 못했습니다:', route.view, response.status)
    return
  }

  const html = await response.text()
  if (myTurn !== renderCount) return

  keepCurrent(view)
  shownPath = path

  view.className = route.klass ? `content ${route.klass}` : 'content'
  view.replaceChildren(document.createRange().createContextualFragment(html))
  view.scrollTop = 0
  document.title = `Oto. · ${route.title}`

  // 그 화면에서만 쓰는 스크립트를 붙인다.
  // 화면을 보관해 두고 다시 쓰기 때문에 init() 은 화면마다 딱 한 번만 불린다.
  if (route.load) {
    const module = await route.load()
    if (myTurn !== renderCount) return

    module.init?.()
  }
}

export function startRouter() {
  window.addEventListener('hashchange', render)
  render()
}
