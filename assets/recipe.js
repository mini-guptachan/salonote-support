(() => {
  "use strict";
  // 髪カルテのデモ：前回のレシピをコピーして、変えた部分だけ直す。
  // 入力した内容はこのページの中だけで使い、どこにも送信・保存しません。
  const $ = (id) => document.getElementById(id);
  const root = $("recipeDemo");
  if (!root) return;

  const PREVIOUS = [
    { place: "根元", shade: "8NB", grams: 60, oxy: "6%", ratio: "1:1", minutes: 25 },
    { place: "中間〜毛先", shade: "9A", grams: 40, oxy: "3%", ratio: "1:2", minutes: 15 }
  ];
  let today = null;

  const copyBtn = $("recipeCopy");
  const editor = $("recipeEditor");
  const list = $("recipeToday");
  const status = $("recipeStatus");
  const timeOut = $("recipeTimeOut");
  const track = (name, params) => { if (typeof window.salonoteTrack === "function") window.salonoteTrack(name, params); };
  let tracked = false;

  const cell = (text, changed) => `<span class="${changed ? "is-changed" : ""}">${text}${changed ? '<em class="recipe-badge">変更</em>' : ""}</span>`;

  function render() {
    let changes = 0;
    list.innerHTML = today.map((row, i) => {
      const before = PREVIOUS[i];
      const shadeChanged = row.shade !== before.shade;
      const timeChanged = row.minutes !== before.minutes;
      changes += (shadeChanged ? 1 : 0) + (timeChanged ? 1 : 0);
      return `<li class="recipe-row">
        <span class="recipe-place">${row.place}</span>
        <span class="recipe-mix">${cell(row.shade, shadeChanged)} ${row.grams}g ＋ オキシ${row.oxy}（${row.ratio}）</span>
        <span class="recipe-time">放置 ${cell(row.minutes + "分", timeChanged)}</span>
      </li>`;
    }).join("");
    timeOut.textContent = today[0].minutes + "分";
    $("recipeTimeDown").disabled = today[0].minutes <= 5;
    $("recipeTimeUp").disabled = today[0].minutes >= 45;
    status.textContent = changes === 0
      ? "前回のレシピをそのままコピーしました。変えたいところだけ直せます。"
      : `前回から変えたのは${changes}か所だけ。ほかの項目は入力し直していません。`;
  }

  copyBtn.addEventListener("click", () => {
    today = PREVIOUS.map((row) => ({ ...row }));
    root.querySelectorAll('input[name="recipeShade"]').forEach((input) => { input.checked = input.value === "9A"; });
    editor.hidden = false;
    copyBtn.hidden = true;
    render();
    if (!tracked) { tracked = true; track("demo_interact", { demo_action: "copy_recipe" }); }
    $("recipeEditorTitle").focus({ preventScroll: true });
  });

  root.querySelectorAll('input[name="recipeShade"]').forEach((input) => {
    input.addEventListener("change", () => { if (today && input.checked) { today[1].shade = input.value; render(); } });
  });
  const step = (delta) => { today[0].minutes = Math.min(45, Math.max(5, today[0].minutes + delta)); render(); };
  $("recipeTimeDown").addEventListener("click", () => step(-5));
  $("recipeTimeUp").addEventListener("click", () => step(5));

  $("recipeReset").addEventListener("click", () => {
    today = null;
    editor.hidden = true;
    copyBtn.hidden = false;
    status.textContent = "";
    copyBtn.focus({ preventScroll: true });
  });

  // 初期状態：スクリプトが動くときだけ、操作できる形に切り替える
  root.classList.add("is-live");
  editor.hidden = true;
  copyBtn.hidden = false;
  $("recipeControls").hidden = false;
  status.textContent = "";
})();
