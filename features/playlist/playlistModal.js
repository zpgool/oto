// features/playlist/playlistModal.js
// 플레이리스트 관련 팝업 세 개.
//   - openCreatePlaylistModal()         이름과 커버를 받아 새 플레이리스트를 만든다
//   - openAddToPlaylistModal(track)     어느 플레이리스트에 담을지 고른다
//   - openPlaylistSettingsModal(pl)     이름·커버를 바꾸거나 삭제한다
// 팝업 껍데기는 shared/js/modal.js 에 있다. (재생목록 팝업도 같은 것을 쓴다)
import { openDialog } from "../../shared/js/modal.js";
import {
  listPlaylists,
  createPlaylist,
  addTrack,
  findPlaylistsWithTrack,
  renamePlaylist,
  deletePlaylist,
  uploadCover,
  setCover,
} from "./playlistStore.js";
import { showToast } from "../../shared/js/toast.js";

function createMessage(className, text) {
  const message = document.createElement("p");
  message.className = className;
  message.textContent = text;
  return message;
}

// ---- 새 플레이리스트 만들기 ----
// 만들어진 플레이리스트를 돌려준다. 그냥 닫으면 null.
export function openCreatePlaylistModal() {
  const { dialog, body } = openDialog("새 플레이리스트");

  return new Promise((resolve) => {
    let created = null;

    const form = document.createElement("form");
    form.className = "modal-form";

    const cover = createCoverPicker(null);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "modal-input";
    input.placeholder = "플레이리스트 이름";
    input.maxLength = 60;
    input.required = true;
    input.autocomplete = "off";

    const error = createMessage("modal-error", "");
    error.hidden = true;

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "modal-btn";
    cancelButton.textContent = "취소";
    cancelButton.addEventListener("click", () => dialog.close());

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "modal-btn modal-btn-primary";
    submitButton.textContent = "만들기";

    actions.append(cancelButton, submitButton);
    form.append(cover.button, cover.fileInput, input, error, actions);
    body.append(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = input.value.trim();
      if (!name) return;

      // 두 번 눌러서 두 개 만들어지는 것을 막는다.
      submitButton.disabled = true;
      submitButton.textContent = "만드는 중...";
      error.hidden = true;

      try {
        created = await createPlaylist(name);

        // 사진을 골랐으면 올린 뒤 커버로 저장한다.
        // 플레이리스트는 이미 만들어졌으니, 사진 올리기만 실패해도 치명적이지 않다.
        const coverFile = cover.getFile();
        if (coverFile) {
          try {
            const coverUrl = await uploadCover(coverFile);
            await setCover(created.id, coverUrl);
          } catch (coverFailure) {
            console.error("커버 업로드 실패:", coverFailure);
            showToast(
              "플레이리스트는 만들어졌지만 커버 사진 저장에 실패했어요",
            );
          }
        }

        dialog.close();
        showToast(`'${created.name}' 플레이리스트를 만들었습니다`);
      } catch (failure) {
        error.textContent = `만들지 못했습니다: ${failure.message}`;
        error.hidden = false;
        submitButton.disabled = false;
        submitButton.textContent = "만들기";
      }
    });

    dialog.addEventListener("close", () => resolve(created));

    input.focus();
  });
}

// ---- 플레이리스트에 곡 담기 ----
export async function openAddToPlaylistModal(track) {
  const { dialog, body } = openDialog("플레이리스트에 추가");

  const subtitle = createMessage("modal-sub", track.title);
  const status = createMessage("modal-status", "불러오는 중...");
  body.append(subtitle, status);

  let playlists;
  let taken;

  try {
    // 내 플레이리스트 목록과, 이 곡이 이미 담긴 곳을 같이 받아온다.
    [playlists, taken] = await Promise.all([
      listPlaylists(),
      findPlaylistsWithTrack(track.videoId),
    ]);
  } catch (failure) {
    status.className = "modal-error";
    status.textContent = `불러오지 못했습니다: ${failure.message}`;
    return;
  }

  // 팝업을 닫은 뒤에 응답이 도착했을 수 있다.
  if (!dialog.isConnected) return;

  status.remove();

  const error = createMessage("modal-error", "");
  error.hidden = true;

  // 곡을 담고 팝업을 닫는다.
  async function addAndClose(playlist, button) {
    button.disabled = true;
    error.hidden = true;

    try {
      await addTrack(playlist.id, track);
      dialog.close();
      showToast(`'${playlist.name}' 에 추가되었습니다`);
    } catch (failure) {
      error.textContent = failure.message;
      error.hidden = false;
      button.disabled = false;
    }
  }

  function createItem(playlist) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "modal-item";

    const name = document.createElement("span");
    name.className = "modal-item-name";
    name.textContent = playlist.name;

    const note = document.createElement("span");
    note.className = "modal-item-note";

    // 이미 담긴 곡은 다시 담을 수 없다.
    if (taken.has(playlist.id)) {
      note.textContent = "담김";
      item.disabled = true;
    } else {
      note.textContent = `${playlist.trackCount}곡`;
      item.addEventListener("click", () => addAndClose(playlist, item));
    }

    item.append(name, note);
    return item;
  }

  if (playlists.length === 0) {
    body.append(createMessage("modal-empty", "아직 플레이리스트가 없어요."));
  } else {
    const list = document.createElement("div");
    list.className = "modal-list";
    list.append(...playlists.map(createItem));
    body.append(list);
  }

  // 여기서 바로 새 플레이리스트를 만들고, 만든 곳에 이 곡을 담는다.
  const newButton = document.createElement("button");
  newButton.type = "button";
  newButton.className = "modal-item modal-item-new";
  newButton.textContent = "＋ 새 플레이리스트 만들기";
  newButton.addEventListener("click", async () => {
    dialog.close();

    const playlist = await openCreatePlaylistModal();
    if (!playlist) return;

    try {
      await addTrack(playlist.id, track);
      showToast(`'${playlist.name}' 에 추가되었습니다`);
    } catch (failure) {
      alert(`담지 못했습니다: ${failure.message}`);
    }
  });

  body.append(newButton, error);
}

// ---- 플레이리스트 설정 (이름·커버 변경 / 삭제) ----
// 무엇을 했는지 돌려준다. 그냥 닫으면 null.
//   { action: 'saved', name, coverUrl }   이름이나 커버를 저장함 (coverUrl 은 안 바꿨으면 null)
//   { action: 'deleted' }                 삭제함
export function openPlaylistSettingsModal(playlist) {
  const { dialog, body } = openDialog("플레이리스트 설정");

  return new Promise((resolve) => {
    let result = null;

    // --- 이름·커버 변경 ---
    const form = document.createElement("form");
    form.className = "modal-form";

    // 만들기 팝업과 같은 UI. 지금 커버를 미리 보여준다.
    const cover = createCoverPicker(playlist.coverUrl);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "modal-input";
    input.value = playlist.name;
    input.maxLength = 60;
    input.required = true;
    input.autocomplete = "off";
    input.setAttribute("aria-label", "플레이리스트 이름");

    const error = createMessage("modal-error", "");
    error.hidden = true;

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "modal-btn modal-btn-primary";
    saveButton.textContent = "저장";

    actions.append(saveButton);
    form.append(cover.button, cover.fileInput, input, error, actions);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = input.value.trim();
      if (!name) return;

      const coverFile = cover.getFile();
      const nameChanged = name !== playlist.name;

      // 둘 다 그대로면 할 일이 없다.
      if (!nameChanged && !coverFile) {
        dialog.close();
        return;
      }

      saveButton.disabled = true;
      saveButton.textContent = "저장 중...";
      error.hidden = true;

      try {
        if (nameChanged) {
          const renamed = await renamePlaylist(playlist.id, name);

          // 뒤의 사진 올리기가 실패하더라도 이름은 이미 바뀌었다.
          // 여기서 result 를 채워두면, 팝업을 닫을 때 화면 제목이 따라간다.
          result = { action: "saved", name: renamed.name, coverUrl: null };
        }

        // 사진 올리기는 이름 저장보다 오래 걸리고 실패할 수도 있다.
        if (coverFile) {
          const coverUrl = await uploadCover(coverFile);
          await setCover(playlist.id, coverUrl);

          result = {
            action: "saved",
            name: result?.name ?? playlist.name,
            coverUrl,
          };
        }

        dialog.close();

        if (nameChanged && coverFile) showToast("이름과 커버를 바꿨습니다");
        else if (nameChanged) showToast("이름을 바꿨습니다");
        else showToast("커버 사진을 바꿨습니다");
      } catch (failure) {
        error.textContent = `저장하지 못했습니다: ${failure.message}`;
        error.hidden = false;
        saveButton.disabled = false;
        saveButton.textContent = "저장";
      }
    });

    // --- 삭제 ---
    // 되돌릴 수 없는 일이라 한 번 더 묻는다.
    const danger = document.createElement("div");
    danger.className = "modal-danger";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "modal-btn modal-btn-danger";
    deleteButton.textContent = "플레이리스트 삭제";

    deleteButton.addEventListener("click", () => {
      const question = createMessage(
        "modal-confirm",
        "정말 삭제할까요? 담긴 곡 목록도 같이 사라집니다.",
      );

      const confirmActions = document.createElement("div");
      confirmActions.className = "modal-actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "modal-btn";
      cancelButton.textContent = "취소";
      cancelButton.addEventListener("click", () =>
        danger.replaceChildren(deleteButton),
      );

      const reallyButton = document.createElement("button");
      reallyButton.type = "button";
      reallyButton.className = "modal-btn modal-btn-danger";
      reallyButton.textContent = "삭제";
      reallyButton.addEventListener("click", async () => {
        reallyButton.disabled = true;
        cancelButton.disabled = true;
        reallyButton.textContent = "삭제 중...";

        try {
          await deletePlaylist(playlist.id);
          result = { action: "deleted" };
          dialog.close();
          showToast("플레이리스트를 삭제했습니다");
        } catch (failure) {
          danger.replaceChildren(deleteButton);
          error.textContent = `삭제하지 못했습니다: ${failure.message}`;
          error.hidden = false;
        }
      });

      confirmActions.append(cancelButton, reallyButton);
      danger.replaceChildren(question, confirmActions);
    });

    danger.append(deleteButton);
    body.append(form, danger);

    dialog.addEventListener("close", () => resolve(result));

    input.focus();
    input.select();
  });
}
