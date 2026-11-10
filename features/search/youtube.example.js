// js/youtube.example.js
// 이 파일을 js/youtube.js 로 복사한 뒤, 본인 API 키를 넣어서 쓴다.
// (js/youtube.js 는 키가 들어가므로 .gitignore 로 깃에서 제외됨)
//
// YouTube Data API v3 로 음악 영상을 검색한다.
// 키는 Google Cloud Console → API 및 서비스 → 사용자 인증 정보에서 발급받는다.
const YOUTUBE_API_KEY = "API 키";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

// 유튜브가 돌려주는 제목의 &amp; &#39; 같은 기호를 원래 글자로 바꿔준다.
function decodeHtml(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

// 제목에 이런 단어가 들어간 영상은 음원이 아니라 모음집/영상일 가능성이 높아서 거른다.
const BLOCK_WORDS = [
  "playlist",
  "플레이리스트",
  "모음",
  "모음집",
  "mix",
  "1시간",
  "2시간",
  "3시간",
  "full album",
  "전곡",
  "live",
  "라이브",
  "직캠",
  "fancam",
  "reaction",
  "리액션",
  "cover",
  "커버",
  "lyrics",
  "가사",
  "STUDIO CHOOM",
  "뮤직뱅크",
  "music bank",
  "인기가요",
  "음악중심",
  "MusicCore",
  "무대",
  "Visualizer",
  "SBS",
  "MBC",
  "MBN",
  "KBS",
  "리무진서비스",
  "Dance Practice",
  "REACTS",
];

// 60초 이하는 쇼츠로 보고 거른다.
const MIN_DURATION = 90;

// "PT1M30S", "PT45S", "PT1H2M3S" 같은 ISO 8601 길이를 초 단위 숫자로 바꾼다.
function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = Number(match?.[1] ?? 0);
  const minutes = Number(match?.[2] ?? 0);
  const seconds = Number(match?.[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

// 초 단위 숫자를 "3:26" 같은 보기 좋은 문자열로 바꾼다.
function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// query 로 음악 영상을 검색해서 배열로 돌려준다.
export async function searchMusic(query, maxResults = 15) {
  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    q: query,
    part: "snippet", // 제목, 채널명, 썸네일을 받아온다
    type: "video", // 채널/재생목록은 빼고 영상만
    videoCategoryId: "10", // 10 = Music 카테고리
    videoEmbeddable: "true", // 우리 페이지에 삽입해서 재생할 수 있는 영상만
    maxResults: String(maxResults),
    regionCode: "KR",
  });

  const response = await fetch(`${SEARCH_URL}?${params}`);
  const data = await response.json();

  // 키가 틀렸거나 할당량을 다 쓰면 여기로 들어온다.
  if (!response.ok) {
    throw new Error(data.error?.message ?? "검색에 실패했습니다.");
  }

  // 1) videoId 가 없는 결과 + 제목에 거를 단어가 든 영상을 먼저 뺀다.
  const candidates = data.items
    .filter((item) => item.id?.videoId)
    .filter((item) => {
      const title = item.snippet.title.toLowerCase();
      return !BLOCK_WORDS.some((word) => title.includes(word.toLowerCase()));
    });

  // 거를 것 다 거르고 남은 게 없으면 더 요청할 필요 없이 빈 배열.
  if (candidates.length === 0) return [];

  // 2) 남은 영상들의 길이를 videos.list 로 한 번에 받아온다. (호출당 1유닛)
  const ids = candidates.map((item) => item.id.videoId).join(",");
  const detailParams = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: "contentDetails", // 영상 길이(duration)가 여기 들어있다
    id: ids,
  });

  const detailResponse = await fetch(`${VIDEOS_URL}?${detailParams}`);
  const detailData = await detailResponse.json();

  if (!detailResponse.ok) {
    throw new Error(
      detailData.error?.message ?? "영상 정보를 불러오지 못했습니다.",
    );
  }

  // videoId → 길이(초) 로 바로 찾을 수 있게 정리해 둔다.
  const durationById = {};
  for (const video of detailData.items) {
    durationById[video.id] = parseDuration(video.contentDetails.duration);
  }

  // 3) 길이 정보를 붙이고, 60초 이하(쇼츠)는 거른 뒤 화면용 형태로 돌려준다.
  return candidates
    .map((item) => {
      const seconds = durationById[item.id.videoId] ?? 0;
      return {
        videoId: item.id.videoId,
        title: decodeHtml(item.snippet.title),
        channel: decodeHtml(item.snippet.channelTitle),
        thumbnail: item.snippet.thumbnails.medium.url,
        duration: formatDuration(seconds), // "3:26" 형태
        durationSeconds: seconds, // 혹시 숫자로 쓸 일 있을까봐 같이 보냄
      };
    })
    .filter((video) => video.durationSeconds >= MIN_DURATION);
}
