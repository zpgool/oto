# oto
간편한 무료 음악 웹서비스

## 화면 구조

로그인 전과 후가 나뉜다.

- **로그인 전** — `features/auth/signIn.html`, `signUp.html`. 평범한 페이지다.
- **로그인 후** — `app.html` 한 장이 전부다. 사이드바에서 메뉴를 눌러도 페이지가
  바뀌지 않고, 주소 끝의 `#/...` 만 바뀌면서 가운데 내용만 갈아 끼워진다.
  그래서 화면을 옮겨도 음악이 끊기지 않는다.

```
app.html#/home           홈
app.html#/search         검색
app.html#/chart          내 재생 차트
app.html#/playlist/<id>  플레이리스트 하나
```

`features/*/...Screen.html` 들은 통째로 된 페이지가 아니라 **가운데에 들어가는
조각**이다. 브라우저로 직접 열면 디자인 없이 글자만 보이는 게 정상이다.

## 폴더 구조

```
index.html              진입점 (로그인 페이지로 이동)
app.html                로그인 후 쓰는 화면 한 장 (사이드바 + 플레이어 바 + 내용)
features/               기능 단위로 html + css + js 를 함께 둔다
  auth/      signIn.html, signUp.html + 각 css, js
  home/      homeScreen.html, homeScreen.css
  search/    searchScreen.html, searchScreen.css, search.js,
             recentSearch.js(최근 검색어), youtube.js(API 키)
  playlist/  playlistScreen.html, playlistScreen.css, playlist.js,
             playlistStore.js(Supabase 읽고 쓰기), playlistModal.js(팝업)
  chart/     personalChartScreen.html, personalChartScreen.css
shared/                 여러 화면이 같이 쓰는 것
  css/       reset.css, common.css, modal.css, toast.css
  js/        supabase.js(접속 정보), auth.js(로그인 함수),
             app.js(로그인 확인 + 상단 버튼), router.js(화면 전환),
             sidebar.js, player.js(음악 재생), toast.js(알림),
             passwordToggle.js
  partials/  sidebar.html, player.html (한 벌만 두고 같이 쓴다)
db/        youtube_songs.sql (기존 Supabase 표에 모자란 것만 더하는 SQL)
img/
```

## 플레이리스트

Supabase 에 이미 있는 표 세 개를 쓴다.

- `songs` — 곡 정보 한 벌. 모두가 같이 쓴다. `youtube_id` 로 같은 곡인지 가린다.
- `playlists` — 플레이리스트. `user_id` 가 주인.
- `playlist_songs` — 어느 플레이리스트에 어떤 곡. `position` 이 순서.

- 사이드바 '내 플레이리스트' 옆 **+** → 이름을 넣는 팝업 → 만들면 그 화면으로 이동
- 검색 결과의 **+** → 어디에 담을지 고르는 팝업
- 같은 곡을 같은 플레이리스트에 두 번 담을 수 없다. 이미 담긴 곳은 '담김' 으로
  표시되고 눌리지 않으며, 표에도 `unique (playlist_id, song_id)` 로 막혀 있다.

검색 결과를 담으면 `songs` 에 그 곡이 있는지 `youtube_id` 로 찾아보고,
없으면 새로 넣은 다음 `playlist_songs` 로 잇는다.

플레이리스트 화면에서는

- 곡을 끌어서 순서를 바꾼다. 놓는 순간 `playlist_songs.position` 을 1 부터 다시 매긴다.
- **설정** 에서 이름을 바꾸거나 플레이리스트를 지운다. 지우면 담긴 곡 목록도 같이
  사라지지만 `songs` 자체는 남는다. 다른 사람이 같은 곡을 쓰고 있을 수 있어서다.

무언가를 담고 바꾸고 지우면 화면 위쪽에 알림이 잠깐 뜬다. (`shared/js/toast.js`)

남의 플레이리스트가 보이지 않는 건 Supabase 의 보안 규칙(RLS) 덕분이다.
anon key 는 공개되는 값이라 이 규칙이 유일한 울타리다. 끄면 안 된다.

## 화면을 하나 더 만들려면

1. `features/<기능>/<이름>.html` 에 가운데에 들어갈 내용만 적는다. (`<main>` 없이)
2. 스타일이 필요하면 `features/<기능>/<이름>.css` 를 만들고 `app.html` 에 `<link>` 를 더한다.
3. `shared/js/router.js` 의 `ROUTES` 에 주소를 추가한다.
4. 사이드바에 넣으려면 `shared/partials/sidebar.html` 에 `<a href="#/주소">` 를 더한다.

그 화면에서만 쓰는 스크립트가 있으면 `export function init()` 로 감싸고
`ROUTES` 에 `load` 로 적어둔다. 화면에 들어올 때마다 `init()` 이 다시 불린다.
화면이 매번 새로 만들어지므로, DOM 을 찾는 코드는 `init()` 안에 있어야 한다.

## 처음 받았을 때

키가 들어간 두 파일은 깃에 올라가지 않으니 직접 만들어야 한다.

- `shared/js/supabase.js` — Supabase URL 과 anon key
- `features/search/youtube.js` — `features/search/youtube.example.js` 를 복사해서 YouTube API 키 입력

표는 이미 만들어져 있다. 모자란 것(songs 의 youtube_id 칸, 곡 추가 권한)만
한 번 더해주면 된다. Supabase 대시보드 > SQL Editor 에 `db/youtube_songs.sql` 을
붙여넣고 실행한다.

Live Server 등 로컬 서버로 열어야 한다. 파일을 직접 열면(file://) 사이드바와 화면을
불러오지 못한다.
