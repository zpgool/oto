// shared/js/player.js
// 하단 플레이어 바를 모든 페이지에 넣고, 유튜브 IFrame API 로 소리만 재생한다.
// 쓰는 쪽에서는 playTrack({ videoId, title, channel, thumbnail }) 만 부르면 된다.
const PLAYER_PATH = new URL('../partials/player.html', import.meta.url)
const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api'

let ui = {}
let ytPlayer = null
let progressTimer = null

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
    eq: document.querySelector('#playing-eq'),
    cover: document.querySelector('#track-cover'),
    title: document.querySelector('#track-title'),
    artist: document.querySelector('#track-artist'),
    playButton: document.querySelector('#btn-play'),
    muteButton: document.querySelector('#btn-mute'),
    progressBar: document.querySelector('#progress-bar'),
    volumeBar: document.querySelector('#volume-bar'),
    timeCurrent: document.querySelector('#time-current'),
    timeTotal: document.querySelector('#time-total'),
  }

  return true
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
  const { PLAYING, ENDED } = window.YT.PlayerState

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
  }
}

// ---- 조작 버튼 ----
function setupControls() {
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
  ytPlayer.setVolume(Number(ui.volumeBar.value))
  setFill(ui.volumeBar)
  setupControls()

  return ytPlayer
})()

// ---- 바깥에서 쓰는 함수 ----
// 곡 하나를 재생한다. 플레이어가 아직 준비 중이면 준비될 때까지 기다린다.
export async function playTrack(track) {
  if (!(await ready)) return

  ui.cover.src = track.thumbnail
  ui.title.textContent = track.title
  ui.artist.textContent = track.channel

  ui.progressBar.value = '0'
  setFill(ui.progressBar)
  ui.timeCurrent.textContent = '0:00'

  ytPlayer.loadVideoById(track.videoId)
}
