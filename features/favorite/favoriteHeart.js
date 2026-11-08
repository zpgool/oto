// features/favorite/favoriteHeart.js
// 하트 버튼 하나를 즐겨찾기에 잇는다.
//
// 하트는 검색·플레이리스트·재생 차트·플레이어 바 네 곳에 있다. 누를 때 하는 일이
// 똑같아서(넣거나 빼고, 모양을 바꾸고, 알림을 띄운다) 여기 한 벌만 두고 같이 쓴다.
//
// 한 곡을 어느 화면에서 켜든 다른 화면의 같은 곡 하트도 같이 바뀐다.
// favoriteStore 가 보내는 'oto:favorites-changed' 신호를 모든 하트가 듣고 있어서다.
import {
  toggleFavorite,
  loadFavoriteIds,
  isFavorite,
  onFavoritesChanged,
  offFavoritesChanged,
} from './favoriteStore.js'
import { showToast } from '../../shared/js/toast.js'

// 하트 버튼을 즐겨찾기와 연결한다.
//
// button   : 하트 <button>
// getTrack : 지금 이 버튼이 가리키는 곡을 돌려주는 함수.
//            목록의 행은 곡이 고정이지만 플레이어 바는 곡이 바뀌어서 함수로 받는다.
//            곡이 없으면 null 을 돌려주면 된다. (플레이어에 아직 아무것도 안 걸린 상태)
//
// 곡이 바뀌었을 때 다시 칠하라고 부를 수 있는 함수를 돌려준다.
export function attachHeart(button, getTrack) {
  // 모양을 상태에 맞춘다. (♥ = 즐겨찾기됨)
  function paint(on) {
    button.classList.toggle('liked', on)
    button.textContent = on ? '♥' : '♡'
    button.setAttribute('aria-label', on ? '즐겨찾기 해제' : '즐겨찾기')
    button.setAttribute('aria-pressed', String(on))
  }

  async function refresh() {
    const track = getTrack()

    // 걸린 곡이 없으면 누를 것도 없다. (플레이어 바의 처음 상태)
    if (!track) {
      button.disabled = true
      paint(false)
      return
    }

    try {
      await loadFavoriteIds()
      paint(isFavorite(track.videoId))
      button.disabled = false
    } catch (failure) {
      // 즐겨찾기 목록을 못 받아도 화면 전체가 멈추면 안 된다.
      // 하트만 빈 모양으로 두고 넘어간다.
      console.error('즐겨찾기 상태를 불러오지 못했습니다:', failure)
      paint(false)
    }
  }

  button.addEventListener('click', async (event) => {
    // 행 전체를 누르면 재생되는 화면이 있어서, 하트 클릭은 거기까지 가지 않게 막는다.
    event.stopPropagation()

    const track = getTrack()
    if (!track) return

    const wasFavorite = button.classList.contains('liked')

    // 답을 기다리는 동안 두 번 눌리지 않게 잠근다.
    button.disabled = true

    try {
      const nowFavorite = await toggleFavorite(track, wasFavorite)

      paint(nowFavorite)
      showToast(nowFavorite ? '즐겨찾기에 추가했습니다' : '즐겨찾기에서 뺐습니다')
    } catch (failure) {
      alert(`즐겨찾기에 실패했습니다: ${failure.message}`)
    } finally {
      button.disabled = false
    }
  })

  // 다른 화면에서 같은 곡을 켜고 끄면 이 하트도 따라 바뀐다.
  //
  // 구독 해지는 여기서만 판단한다. refresh 안에서 하면 안 된다 —
  // 목록의 행은 표에 붙기 전에 만들어져서, 처음 칠할 때는 아직 문서에 없다.
  function handleChange() {
    // 화면이 바뀌어 이 버튼이 사라졌으면 더 듣지 않는다.
    if (!button.isConnected) {
      offFavoritesChanged(handleChange)
      return
    }

    refresh()
  }

  onFavoritesChanged(handleChange)

  // 목록을 받아오기 전에도 하트 모양은 보여야 한다. 먼저 빈 하트로 칠해 둔다.
  paint(false)
  refresh()

  return refresh
}
