# oto

간편한 무료 음악 웹서비스

유튜브에서 음악을 찾아 듣고, 플레이리스트와 즐겨찾기로 모아두고,
내가 많이 들은 곡을 차트로 볼 수 있습니다.

바닐라 HTML · CSS · JavaScript 로 만들었습니다. 빌드 도구를 쓰지 않습니다.

---

## 시작하기

### 1. 내려받기

```bash
git clone https://github.com/zpgool/oto.git
cd oto
```

### 2. YouTube API 키 넣기

**직접 만들어야 하는 파일은 이거 하나뿐입니다.** 키가 들어 있어서 깃에 올리지 않습니다.
이 파일이 없으면 검색이 동작하지 않습니다.

옆에 있는 예시 파일을 복사한 뒤, 맨 위의 `"API 키"` 자리에 본인 키를 넣습니다.

```bash
cp features/search/youtube.example.js features/search/youtube.js
```

```js
const YOUTUBE_API_KEY = "여기에 본인 키";
```

> 키 발급: [Google Cloud Console](https://console.cloud.google.com/) →
> **API 및 서비스** → **라이브러리** 에서 `YouTube Data API v3` 사용 설정 →
> **사용자 인증 정보** → **API 키 만들기**

**데이터베이스는 따로 만들 필요 없습니다.** `shared/js/supabase.js` 가 깃에 들어 있어서,
clone 하면 이미 연결된 Supabase 를 그대로 씁니다. 회원가입만 하면 바로 쓸 수 있습니다.

> anon key 는 원래 브라우저에 그대로 내려가는 공개 값이라 숨길 이유가 없습니다.
> 데이터를 지키는 것은 키가 아니라 보안 규칙(RLS)입니다. 그래서 RLS 는 절대 끄면 안 됩니다.

### 3. 로컬 서버로 열기

**파일을 더블클릭해서 열면 안 됩니다.** `file://` 로 열면 사이드바와 화면 조각을
불러오지 못해 빈 페이지만 보입니다. 반드시 로컬 서버로 열어야 합니다.

가장 쉬운 방법은 VS Code 의 **Live Server** 확장입니다.

1. VS Code 확장 탭에서 `Live Server` 설치
2. `index.html` 에서 **마우스 오른쪽 클릭** → **Open with Live Server**
3. 브라우저가 `http://127.0.0.1:5500` 으로 열립니다

VS Code 를 안 쓴다면 아래 중 아무거나 써도 됩니다.

```bash
python3 -m http.server 5500     # 파이썬
npx serve .                      # Node.js
```

### 4. 회원가입하고 둘러보기

브라우저가 로그인 화면으로 넘어갑니다. 회원가입 후 바로 쓸 수 있습니다.

---

## 기능

### 🔍 검색

| 기능 | 설명 |
| --- | --- |
| 음악 검색 | YouTube Data API 로 검색합니다 |
| 결과 거르기 | 모음집 · 직캠 · 리액션 · 커버 · 60초 미만 쇼츠를 빼고 보여줍니다 |
| 최근 검색어 | 검색한 말이 칩으로 남습니다. 누르면 바로 재검색, `×` 로 하나씩 삭제 |
| 바로 재생 | 결과를 누르면 바로 재생됩니다 |

### ▶️ 재생

| 기능 | 설명 |
| --- | --- |
| 하단 플레이어 바 | 재생/일시정지, 진행바로 구간 이동, 음량·음소거 |
| 끊기지 않는 재생 | **화면을 옮겨도 음악이 이어집니다.** 페이지를 새로 읽지 않기 때문입니다 |
| 이어 듣기 | 새로고침해도 듣던 곡과 위치가 그대로 복원됩니다 |
| 재생목록 | `☰` 버튼으로 다음에 나올 곡을 확인하고, 눌러서 건너뜁니다 |
| 자동 넘김 | 곡이 끝나면 다음 곡으로 넘어갑니다. 이전/다음 버튼도 씁니다 |

### 🎵 플레이리스트

| 기능 | 설명 |
| --- | --- |
| 만들기 | 사이드바 `+` → 이름과 **커버 사진**을 넣어 만듭니다 |
| 곡 담기 | 검색 결과의 `+` → 어디에 담을지 고릅니다 |
| 중복 방지 | 이미 담긴 곳은 `담김` 으로 표시되고 눌리지 않습니다 |
| 순서 바꾸기 | 곡을 **끌어다 놓으면** 순서가 저장됩니다 |
| 전체 재생 | 담긴 순서대로 재생목록에 넣고 이어서 틀어줍니다 |
| 설정 | 이름과 커버 사진을 바꾸거나 플레이리스트를 삭제합니다 |

### ❤️ 즐겨찾기

| 기능 | 설명 |
| --- | --- |
| 어디서나 하트 | 검색 · 플레이리스트 · 차트 · 플레이어 바 **어디서 눌러도 됩니다** |
| 화면 간 동기화 | 한 곳에서 켜면 다른 화면의 같은 곡도 같이 바뀝니다 |
| 모아 보기 | 즐겨찾기 화면에서 한눈에 보고, 하트를 다시 눌러 뺍니다 |

### 📊 내 재생 차트

| 기능 | 설명 |
| --- | --- |
| 지난 30일 | 그 기간에 많이 들은 곡만 셉니다 |
| 1~3위 시상대 | 상단에 크게, 자리는 항상 고정입니다 |
| 4위~100위 | 재생 횟수와 함께 표로 보여줍니다 |

### 🏠 홈

| 기능 | 설명 |
| --- | --- |
| 인사말 | 로그인한 사람의 이름이 표시됩니다 |
| 바로 가기 | 즐겨찾기 곡 수를 보여주고, 누르면 이동합니다 |
| 내 플레이리스트 | 커버 사진과 곡 수가 담긴 카드로 보여줍니다 |

### 🔐 계정

회원가입 · 로그인 · 로그아웃. 비밀번호 입력칸의 눈 아이콘으로 입력한 값을 확인할 수 있습니다.
로그인하지 않으면 로그인 화면으로 돌려보냅니다.

---

## 화면 구조

로그인 전과 후가 나뉜다.

- **로그인 전** — `features/auth/signIn.html`, `signUp.html`. 평범한 페이지다.
- **로그인 후** — `app.html` 한 장이 전부다. 사이드바에서 메뉴를 눌러도 페이지가
  바뀌지 않고, 주소 끝의 `#/...` 만 바뀌면서 가운데 내용만 갈아 끼워진다.
  그래서 화면을 옮겨도 음악이 끊기지 않는다.

```
app.html#/home           홈
app.html#/search         검색
app.html#/favorite       즐겨찾기
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
  home/      homeScreen.html, homeScreen.css, home.js
  search/    searchScreen.html, searchScreen.css, search.js,
             recentSearch.js(최근 검색어), youtube.js(검색 + API 키)
  playlist/  playlistScreen.html, playlistScreen.css, playlist.js,
             playlistStore.js(Supabase 읽고 쓰기), playlistModal.js(팝업)
  favorite/  favoriteScreen.html, favoriteScreen.css, favorite.js,
             favoriteStore.js(Supabase 읽고 쓰기), favoriteHeart.js(하트 버튼)
  chart/     personalChartScreen.html, personalChartScreen.css, chart.js,
             chartStore.js(재생 기록 + 차트)
shared/                 여러 화면이 같이 쓰는 것
  css/       reset.css, common.css, modal.css, toast.css
  js/        supabase.js(접속 정보), auth.js(로그인 함수),
             app.js(로그인 확인 + 상단 버튼), router.js(화면 전환),
             sidebar.js, player.js(음악 재생 + 재생목록),
             queueModal.js(재생목록 팝업), modal.js(팝업 껍데기),
             toast.js(알림), songStore.js(songs 표), passwordToggle.js
  partials/  sidebar.html, player.html (한 벌만 두고 같이 쓴다)
img/
```

## 플레이리스트

Supabase 에 있는 표 세 개를 쓴다.

- `songs` — 곡 정보 한 벌. 모두가 같이 쓴다. `youtube_id` 로 같은 곡인지 가린다.
- `playlists` — 플레이리스트. `user_id` 가 주인. `cover_url` 에 커버 사진 주소.
- `playlist_songs` — 어느 플레이리스트에 어떤 곡. `position` 이 순서.

검색 결과를 담으면 `songs` 에 그 곡이 있는지 `youtube_id` 로 찾아보고,
없으면 새로 넣은 다음 `playlist_songs` 로 잇는다.

- 같은 곡을 같은 플레이리스트에 두 번 담을 수 없다. 표에 `unique (playlist_id, song_id)` 로 막혀 있다.
- 곡을 끌어서 순서를 바꾼다. 놓는 순간 `playlist_songs.position` 을 1 부터 다시 매긴다.
- 플레이리스트를 지우면 담긴 곡 목록도 같이 사라지지만 `songs` 자체는 남는다.
  다른 사람이 같은 곡을 쓰고 있을 수 있어서다.
- 커버 사진은 Storage 의 `playlist-covers` 버킷에 올리고, 주소만 `cover_url` 에 적는다.

## 즐겨찾기

`favorites` 표가 누가(`user_id`) 어떤 곡(`song_id`)을 좋아하는지 들고 있다.
곡 정보 자체는 `songs` 에 있고 `song_id` 로 가리키기만 한다.

하트 버튼은 화면마다 따로 만들지 않고 `favoriteHeart.js` 의 `attachHeart()` 한 벌을
가져다 쓴다. 모양·잠금·알림·오류 처리가 거기 모여 있고, 한 화면에서 켜면
`oto:favorites-changed` 신호로 다른 화면의 같은 곡 하트도 따라 바뀐다.

## 재생 차트

곡을 틀 때마다 `play_events` 에 한 줄씩 쌓고, 지난 30일치를 곡별로 세서 보여준다.
세는 일은 `my_play_chart` 함수가 데이터베이스 안에서 한다.

이미 있는 `play_counts` 는 쓰지 않는다. 누적 횟수만 들고 있어서 기간을 잘라 셀 수 없다.

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

내용이 바뀌는 화면이면 `keep: false` 를 적는다. 적지 않으면 화면을 보관해 두었다가
그대로 다시 붙이기 때문에, 곡 수 같은 숫자가 옛날 값으로 남는다.
