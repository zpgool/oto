// js/passwordToggle.js
// 눈 아이콘 버튼을 누르면 비밀번호를 보여주거나 숨긴다. (로그인/회원가입 공통)
// 버튼 안에 .icon-eye, .icon-eye-off 두 SVG 가 있어야 한다.
export function setupPasswordToggle(passwordInput, toggleButton) {
  const eyeIcon = toggleButton.querySelector('.icon-eye')
  const eyeOffIcon = toggleButton.querySelector('.icon-eye-off')

  toggleButton.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password'

    passwordInput.type = isHidden ? 'text' : 'password'

    // SVG 는 .hidden 속성이 없어서 hidden 속성(attribute)을 직접 넣고 뺀다.
    eyeIcon.toggleAttribute('hidden', isHidden)
    eyeOffIcon.toggleAttribute('hidden', !isHidden)

    toggleButton.setAttribute('aria-pressed', String(isHidden))
    toggleButton.setAttribute('aria-label', isHidden ? '비밀번호 숨기기' : '비밀번호 보기')
  })
}
