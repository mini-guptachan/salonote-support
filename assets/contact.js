(() => {
  "use strict";
  // The address is assembled at runtime so it is not exposed as plain text to scrapers.
  const address = (el) => `${el.dataset.user}@${el.dataset.domain}`;
  const subject = "【salonote】お問い合わせ";
  const body = [
    "お問い合わせの種類：",
    "アプリのバージョン：",
    "端末とOS：",
    "",
    "内容：",
    "",
    "※ 顧客の氏名・電話番号・写真、ログインパスワードなどの個人情報は記載しないでください。"
  ].join("\n");

  document.querySelectorAll(".js-mail").forEach((el) => {
    el.textContent = address(el);
  });
  document.querySelectorAll(".js-mail-link").forEach((link) => {
    link.href = `mailto:${address(link)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    link.addEventListener("click", () => {
      if (typeof window.salonoteTrack === "function") window.salonoteTrack("contact_email_click", {});
    });
  });
  const note = document.querySelector(".js-mail-note");
  if (note) note.hidden = true;
})();
