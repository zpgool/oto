# oto
간편한 무료 음악 웹서비스

## 폴더 구조

```
index.html              진입점 (로그인 페이지로 이동)
features/               기능 단위로 html + css + js 를 함께 둔다
  auth/      signIn.html, signUp.html + 각 css, js
  home/      homeScreen.html, homeScreen.css, home.js
  search/    searchScreen.html, searchScreen.css, search.js,
             recentSearch.js(최근 검색어), youtube.js(API 키)
  playlist/  playlistScreen.html, newPlaylistScreen.html, playlistScreen.css
  chart/     personalChartScreen.html, personalChartScreen.css
shared/                 여러 페이지가 같이 쓰는 것
  css/       reset.css, common.css
  js/        supabase.js(접속 정보), auth.js(로그인 함수),
             sidebar.js, passwordToggle.js
  partials/  sidebar.html (사이드바 마크업 한 벌)
img/
```

## 처음 받았을 때

키가 들어간 두 파일은 깃에 올라가지 않으니 직접 만들어야 한다.

- `shared/js/supabase.js` — Supabase URL 과 anon key
- `features/search/youtube.js` — `features/search/youtube.example.js` 를 복사해서 YouTube API 키 입력

Live Server 등 로컬 서버로 열어야 한다. 파일을 직접 열면(file://) 사이드바를 불러오지 못한다.

