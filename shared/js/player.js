// shared/js/player.js
// 하단 플레이어 바를 모든 페이지에 넣고, 유튜브 IFrame API 로 소리만 재생한다.
// 쓰는 쪽에서는 playTrack({ videoId, title, channel, thumbnail }) 만 부르면 된다.
// 여러 곡을 이어서 틀려면 playQueue(tracks) 를 쓴다. (플레이리스트 전체 재생)
import { recordPlay } from '../../features/chart/chartStore.js'
import { attachHeart } from '../../features/favorite/favoriteHeart.js'

const PLAYER_PATH = new URL('../partials/player.html', import.meta.url)
const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api'

// 새로고침해도 듣던 자리에서 이어 듣도록 저장해 두는 곳.
// sessionStorage 라서 그 탭에서만 쓰이고, 탭을 닫으면 지워진다.
const STORAGE_KEY = 'oto.player'

let ui = {}
let ytPlayer = null
let progressTimer = null
let currentTrack = null

// ---- 재생목록 ----
// 이어서 틀 곡들. 한 곡만 튼 경우(검색·차트)에는 지금 그 곡 하나만 들어 있다.
// queueIndex 는 그중 지금 재생 중인 자리.
let queue = []
let queueIndex = -1

// 재생목록이 바뀌면 알린다. 열려 있는 재생목록 팝업이 이 신호를 듣고 다시 그린다.
const QUEUE_EVENT = 'oto:queue-changed'

export function onQueueChanged(callback) {
  document.addEventListener(QUEUE_EVENT, callback)
}

export function offQueueChanged(callback) {
  document.removeEventListener(QUEUE_EVENT, callback)
}

function notifyQueueChanged() {
  document.dispatchEvent(new CustomEvent(QUEUE_EVENT))
}

// 재생목록 팝업이 그릴 재료.
export function getQueue() {
  return { tracks: [...queue], index: queueIndex }
}

// 곡이 바뀌면 하트를 다시 칠하라고 부르는 함수. attachHeart 가 돌려준다.
let refreshHeart = null

// ---- 화면 ----
// 초 단위를 0:00 모양으로 바꾼다.
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'

  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

// 막대의 지나간 부분 길이를 CSS 변수로 알려준다. (common.css 의 --fill)
function setFill(input) {
  const min = Number(input.min)
  const max = Number(input.max)
  const ratio = (Number(input.value) - min) / (max - min)

  input.style.setProperty('--fill', `${ratio * 100}%`)
}

// 첫 곡을 걸면 잠가둔 버튼들을 풀고 회색 상태를 벗긴다.
function unlockControls() {
  ui.player.classList.remove('is-empty')
  ui.locked.forEach((element) => {
    element.disabled = false
  })
}

// 재생 중인지 아닌지를 화면에 반영한다.
function setPlaying(isPlaying) {
  ui.playButton.textContent = isPlaying ? '⏸' : '▶'
  ui.player.classList.toggle('is-playing', isPlaying)
  ui.eq.toggleAttribute('hidden', !isPlaying)
}

async function renderPlayerBar() {
  const placeholder = document.querySelector('#player')
  if (!placeholder) return false

  const response = await fetch(PLAYER_PATH)
  if (!response.ok) {
    console.error('플레이어를 불러오지 못했습니다:', response.status)
    return false
  }

  const fragment = document.createRange().createContextualFragment(await response.text())
  placeholder.replaceWith(fragment)

  ui = {
    player: document.querySelector('.player'),
    // 곡을 걸기 전까지 잠가둔 버튼과 재생바
    locked: [...document.querySelectorAll('.player [disabled]')],
    eq: document.querySelector('#playing-eq'),
    cover: document.querySelector('#track-cover'),
    title: document.querySelector('#track-title'),
    artist: document.querySelector('#track-artist'),
    playButton: document.querySelector('#btn-play'),
    likeButton: document.querySelector('#btn-like'),
    prevButton: document.querySelector('#btn-prev'),
    nextButton: document.querySelector('#btn-next'),
    queueButton: document.querySelector('#btn-queue'),
    muteButton: document.querySelector('#btn-mute'),
    progressBar: document.querySelector('#progress-bar'),
    volumeBar: document.querySelector('#volume-bar'),
    timeCurrent: document.querySelector('#time-current'),
    timeTotal: document.querySelector('#time-total'),
  }

  return true
}

// ---- 듣던 자리 기억하기 ----
// 저장소를 못 쓰는 상황(사생활 보호 모드 등)이 있어서 전부 try 로 감싼다.
function saveState() {
  if (!ytPlayer || !currentTrack) return

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        track: currentTrack,
        queue,
        queueIndex,
        seconds: ytPlayer.getCurrentTime(),
        volume: Number(ui.volumeBar.value),
        wasPlaying: ytPlayer.getPlayerState() === window.YT.PlayerState.PLAYING,
      }),
    )
  } catch {
    // 저장이 안 돼도 재생에는 지장이 없으니 그냥 넘어간다.
  }
}

function loadState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    return saved?.track?.videoId ? saved : null
  } catch {
    return null
  }
}

// ---- 유튜브 플레이어 ----
// IFrame API 스크립트를 한 번만 불러온다. 준비되면 전역 onYouTubeIframeAPIReady 가 호출된다.
function loadIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)

  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }

    if (!document.querySelector('#yt-iframe-api')) {
      const script = document.createElement('script')
      script.id = 'yt-iframe-api'
      script.src = IFRAME_API_SRC
      document.head.append(script)
    }
  })
}

function createPlayer(YT) {
  return new Promise((resolve) => {
    const player = new YT.Player('yt-frame', {
      height: '1',
      width: '1',
      playerVars: { controls: 0, disablekb: 1, playsinline: 1 },
      events: {
        onReady: () => resolve(player),
        onStateChange: handleStateChange,
      },
    })
  })
}

// 재생 중일 때만 진행바를 움직인다.
function startProgressTimer() {
  stopProgressTimer()
  progressTimer = setInterval(updateProgress, 500)
}

function stopProgressTimer() {
  clearInterval(progressTimer)
  progressTimer = null
}

function updateProgress() {
  const current = ytPlayer.getCurrentTime()
  const total = ytPlayer.getDuration()
  if (!total) return

  ui.progressBar.value = String((current / total) * 100)
  setFill(ui.progressBar)
  ui.timeCurrent.textContent = formatTime(current)
  ui.timeTotal.textContent = formatTime(total)
}

function handleStateChange(event) {
  const { PLAYING, PAUSED, ENDED } = window.YT.PlayerState

  setPlaying(event.data === PLAYING)

  if (event.data === PLAYING) {
    startProgressTimer()
  } else {
    stopProgressTimer()
  }

  if (event.data === ENDED) {
    ui.progressBar.value = '0'
    setFill(ui.progressBar)
    ui.timeCurrent.textContent = '0:00'

    // 이어서 틀 곡이 있으면 저절로 넘어간다. 마지막 곡이면 그대로 멈춘다.
    if (playNext()) return
  }

  // 곡을 불러오는 중(BUFFERING)에는 재생 위치가 아직 0 이라서 저장하지 않는다.
  // 그때 저장하면 새로고침으로 되살려둔 위치를 0 으로 덮어쓴다.
  if ([PLAYING, PAUSED, ENDED].includes(event.data)) {
    saveState()
  }
}

// ---- 조작 버튼 ----
function setupControls() {
  // 하트: 지금 걸려 있는 곡을 즐겨찾기에 넣고 뺀다.
  // 목록 화면의 하트와 같은 함수를 써서, 한쪽에서 켜면 다른 쪽도 따라 바뀐다.
  refreshHeart = attachHeart(ui.likeButton, () => currentTrack)

  ui.prevButton.addEventListener('click', playPrevious)
  ui.nextButton.addEventListener('click', playNext)

  // 재생목록 팝업. 쓸 때만 불러온다. (player.js 와 서로 가져다 쓰는 사이라 정적 import 를 피한다)
  ui.queueButton.addEventListener('click', async () => {
    const { openQueueModal } = await import('./queueModal.js')
    openQueueModal()
  })

  // 재생 / 일시정지
  ui.playButton.addEventListener('click', () => {
    const { PLAYING } = window.YT.PlayerState

    if (ytPlayer.getPlayerState() === PLAYING) {
      ytPlayer.pauseVideo()
    } else {
      ytPlayer.playVideo()
    }
  })

  // 진행바를 끌면 그 위치로 이동
  ui.progressBar.addEventListener('input', () => {
    const total = ytPlayer.getDuration()
    if (!total) return

    const seconds = (Number(ui.progressBar.value) / 100) * total
    ytPlayer.seekTo(seconds, true)
    setFill(ui.progressBar)
    ui.timeCurrent.textContent = formatTime(seconds)
  })

  // 음량
  ui.volumeBar.addEventListener('input', () => {
    const volume = Number(ui.volumeBar.value)

    ytPlayer.setVolume(volume)
    setFill(ui.volumeBar)

    // 0 으로 내리면 음소거와 같은 상태가 된다.
    if (volume === 0) {
      ytPlayer.mute()
    } else {
      ytPlayer.unMute()
    }

    ui.muteButton.textContent = volume === 0 ? '🔇' : '🔈'
  })

  // 음소거 토글. 끌 때는 음량 막대 위치로 되돌린다.
  ui.muteButton.addEventListener('click', () => {
    if (ytPlayer.isMuted()) {
      ytPlayer.unMute()
      ui.muteButton.textContent = '🔈'
      ui.volumeBar.value = String(ytPlayer.getVolume())
      setFill(ui.volumeBar)
    } else {
      ytPlayer.mute()
      ui.muteButton.textContent = '🔇'
      ui.volumeBar.value = '0'
      setFill(ui.volumeBar)
    }
  })
}

// ---- 준비 ----
// 페이지가 열리면 플레이어 바를 넣고 유튜브 플레이어를 만든다.
const ready = (async () => {
  if (!(await renderPlayerBar())) return null

  ytPlayer = await createPlayer(await loadIframeApi())
  setupControls()

  // 새로고침 직전에 듣던 곡이 있으면 그 자리에 다시 걸어둔다.
  const saved = loadState()

  ui.volumeBar.value = String(saved?.volume ?? Number(ui.volumeBar.value))
  ytPlayer.setVolume(Number(ui.volumeBar.value))
  setFill(ui.volumeBar)

  if (saved) {
    // 듣던 재생목록도 되살린다. 옛 저장본이면 그 곡 하나만 들어 있는 셈 친다.
    queue = saved.queue?.length ? saved.queue : [saved.track]
    queueIndex = saved.queueIndex ?? 0

    showTrack(saved.track)

    // showTrack 안의 unlockControls 가 잠긴 버튼을 모두 풀어버리므로,
    // 이전/다음 버튼 상태는 그 뒤에 맞춘다.
    updateQueueButtons()

    const where = { videoId: saved.track.videoId, startSeconds: saved.seconds }

    // 듣고 있었으면 이어서 틀고, 멈춰 있었으면 걸어만 둔다.
    // 다만 브라우저가 '사용자가 누르지 않은 재생'을 막는 경우가 있어서,
    // 소리가 안 나면 재생 버튼을 한 번 눌러야 한다.
    if (saved.wasPlaying) {
      ytPlayer.loadVideoById(where)
    } else {
      ytPlayer.cueVideoById(where)
    }
  }

  // 페이지를 떠나기 직전(새로고침 포함)에 듣던 자리를 적어둔다.
  window.addEventListener('pagehide', saveState)

  return ytPlayer
})()

// 곡 정보를 플레이어 바에 올린다.
function showTrack(track) {
  currentTrack = track

  unlockControls()

  ui.cover.src = track.thumbnail
  ui.title.textContent = track.title
  ui.artist.textContent = track.channel

  ui.progressBar.value = '0'
  setFill(ui.progressBar)
  ui.timeCurrent.textContent = '0:00'

  // 새로 건 곡이 이미 즐겨찾기인지에 맞춰 하트를 다시 칠한다.
  refreshHeart?.()
}

// 갈 곳이 없는 쪽 버튼은 잠근다.
function updateQueueButtons() {
  ui.prevButton.disabled = queueIndex <= 0
  ui.nextButton.disabled = queueIndex + 1 >= queue.length
}

// 재생목록의 index 번째 곡을 실제로 건다.
function playAt(index) {
  const track = queue[index]
  if (!track) return

  queueIndex = index

  showTrack(track)
  ytPlayer.loadVideoById(track.videoId)

  // 재생 차트에 쓸 기록. 기다리지 않는다. 실패해도 재생에는 지장이 없다.
  recordPlay(track)

  updateQueueButtons()
  notifyQueueChanged()
}

// ---- 바깥에서 쓰는 함수 ----
// 곡 하나를 재생한다. 플레이어가 아직 준비 중이면 준비될 때까지 기다린다.
//
// 이어서 틀 곡은 없다. 검색 결과나 차트에서 한 곡을 고른 경우가 이것이다.
// 듣고 있던 재생목록이 있었다면 거기서 빠져나온다.
export async function playTrack(track) {
  if (!(await ready)) return

  queue = [track]
  playAt(0)
}

// 여러 곡을 순서대로 재생한다. 플레이리스트 전체 재생이 이것을 쓴다.
// startIndex 번째 곡부터 틀고, 끝나면 다음 곡으로 저절로 넘어간다.
export async function playQueue(tracks, startIndex = 0) {
  if (!(await ready)) return
  if (tracks.length === 0) return

  queue = [...tracks]
  playAt(Math.min(Math.max(startIndex, 0), queue.length - 1))
}

// 재생목록에서 고른 곡으로 건너뛴다. (재생목록 팝업에서 누를 때)
export async function playQueueIndex(index) {
  if (!(await ready)) return

  playAt(index)
}

// 다음 곡. 마지막 곡이면 아무 일도 하지 않는다.
export function playNext() {
  if (queueIndex + 1 >= queue.length) return false

  playAt(queueIndex + 1)
  return true
}

// 이전 곡. 첫 곡이면 아무 일도 하지 않는다.
export function playPrevious() {
  if (queueIndex <= 0) return false

  playAt(queueIndex - 1)
  return true
}
