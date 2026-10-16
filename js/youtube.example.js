// js/youtube.example.js
// 이 파일을 js/youtube.js 로 복사한 뒤, 본인 API 키를 넣어서 쓴다.
// (js/youtube.js 는 키가 들어가므로 .gitignore 로 깃에서 제외됨)
//
// YouTube Data API v3 로 음악 영상을 검색한다.
// 키는 Google Cloud Console → API 및 서비스 → 사용자 인증 정보에서 발급받는다.
const YOUTUBE_API_KEY = '여기에_본인_API_키'

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'

// query 로 음악 영상을 검색해서 배열로 돌려준다.
export async function searchMusic(query, maxResults = 15) {
  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    q: query,
    part: 'snippet',        // 제목, 채널명, 썸네일을 받아온다
    type: 'video',          // 채널/재생목록은 빼고 영상만
    videoCategoryId: '10',  // 10 = Music 카테고리
    videoEmbeddable: 'true', // 우리 페이지에 삽입해서 재생할 수 있는 영상만
    maxResults: String(maxResults),
    regionCode: 'KR',
  })

  const response = await fetch(`${SEARCH_URL}?${params}`)
  const data = await response.json()

  // 키가 틀렸거나 할당량을 다 쓰면 여기로 들어온다.
  if (!response.ok) {
    throw new Error(data.error?.message ?? '검색에 실패했습니다.')
  }

  // 화면에서 쓰기 쉬운 형태로 정리해서 돌려준다.
  return data.items.map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium.url,
  }))
}
