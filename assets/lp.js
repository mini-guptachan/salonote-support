(() => {
  "use strict";

  const APP_STORE_URL = "https://apps.apple.com/jp/app/id6805546874";
  const PRO_PRICE = 15000;
  const TAX_RATE = 10;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const yen = (value) => "¥" + Math.round(value).toLocaleString("ja-JP");
  const $ = (id) => document.getElementById(id);

  /* ---------- header border on scroll & sticky CTA ---------- */
  const header = document.querySelector(".site-header");
  const sticky = $("stickyCta");
  const hero = document.querySelector(".hero");
  const finalCta = document.querySelector(".final-cta");
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
    if (!sticky) return;
    const heroBottom = hero.getBoundingClientRect().bottom;
    const finalTop = finalCta.getBoundingClientRect().top;
    const visible = heroBottom < 0 && finalTop > window.innerHeight;
    sticky.classList.toggle("visible", visible);
    sticky.setAttribute("aria-hidden", String(!visible));
    sticky.querySelector("a").tabIndex = visible ? 0 : -1;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- live pricing demo (mirrors PricingCalculator.swift) ---------- */
  const menu = [
    { id: "one", name: "ワンカラー", category: "基本コース", price: 6500, unit: "回" },
    { id: "off", name: "他店ジェルオフ", category: "オフ", price: 1500, unit: "回" },
    { id: "mag", name: "マグネット変更", category: "追加デザイン", price: 1000, unit: "回" },
    { id: "art", name: "アート追加", category: "追加デザイン", price: 500, unit: "本" },
    { id: "stone", name: "ストーンM", category: "パーツ", price: 150, unit: "個" },
    { id: "len", name: "長さ出し", category: "補強・長さ出し", price: 800, unit: "本" }
  ];
  const state = { order: ["one"], qty: { one: 1 }, discount: false };

  const totalEl = $("demoTotal");
  const deltaEl = $("demoDelta");
  const linesEl = $("demoLines");
  const menuEl = $("demoMenu");
  const discountEl = $("demoDiscount");
  let shownTotal = 0;
  let animationFrame = null;

  function calculate() {
    const subtotal = state.order.reduce((sum, id) => sum + find(id).price * state.qty[id], 0);
    const discount = state.discount ? Math.floor(subtotal * 10 / 100) : 0;
    const total = subtotal - discount;
    const tax = Math.floor(total * TAX_RATE / (100 + TAX_RATE));
    return { subtotal, discount, total, tax };
  }

  function find(id) { return menu.find((item) => item.id === id); }

  function animateTotal(target) {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (reduceMotion) { shownTotal = target; totalEl.textContent = yen(target); return; }
    const start = shownTotal;
    const startTime = performance.now();
    const duration = 420;
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      shownTotal = start + (target - start) * eased;
      totalEl.textContent = yen(shownTotal);
      if (t < 1) animationFrame = requestAnimationFrame(step);
      else shownTotal = target;
    };
    animationFrame = requestAnimationFrame(step);
  }

  function showDelta(amount) {
    if (!amount) return;
    deltaEl.textContent = (amount > 0 ? "+" : "−") + yen(Math.abs(amount));
    deltaEl.classList.remove("show");
    void deltaEl.offsetWidth;
    deltaEl.classList.add("show");
  }

  function renderMenu() {
    menuEl.innerHTML = "";
    menu.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "demo-chip" + (state.qty[item.id] ? " active" : "") + (index === 4 && !state.qty[item.id] ? " nudge" : "");
      button.setAttribute("aria-label", `${item.name}を追加（1${item.unit} ${yen(item.price)}）`);
      button.innerHTML = `<span class="demo-chip-name">${item.name}</span><span class="demo-chip-price">${yen(item.price)} / ${item.unit}</span>`;
      button.addEventListener("click", () => changeQty(item.id, 1));
      menuEl.appendChild(button);
    });
  }

  function renderLines() {
    linesEl.innerHTML = "";
    if (!state.order.length) {
      linesEl.innerHTML = '<li class="demo-empty">下のメニューから施術内容を追加してください</li>';
      return;
    }
    state.order.forEach((id) => {
      const item = find(id);
      const qty = state.qty[id];
      const li = document.createElement("li");
      li.className = "demo-line";
      li.innerHTML = `
        <span class="demo-line-name">${item.name}</span>
        <span class="demo-line-sub">${yen(item.price * qty)}</span>
        <span class="demo-line-meta">${yen(item.price)} × ${qty}${item.unit}</span>
        <span class="demo-qty">
          <button type="button" aria-label="${item.name}を1${item.unit}減らす">−</button>
          <span aria-label="数量">${qty}</span>
          <button type="button" aria-label="${item.name}を1${item.unit}増やす">＋</button>
        </span>`;
      const [minus, plus] = li.querySelectorAll("button");
      minus.addEventListener("click", () => changeQty(id, -1));
      plus.addEventListener("click", () => changeQty(id, 1));
      linesEl.appendChild(li);
    });
    linesEl.scrollTop = linesEl.scrollHeight;
  }

  function changeQty(id, delta) {
    const before = calculate().total;
    const next = (state.qty[id] || 0) + delta;
    if (next <= 0) {
      delete state.qty[id];
      state.order = state.order.filter((value) => value !== id);
    } else {
      if (!state.qty[id]) state.order.push(id);
      state.qty[id] = next;
    }
    render();
    showDelta(calculate().total - before);
  }

  function render() {
    renderLines();
    renderMenu();
    animateTotal(calculate().total);
  }

  if (totalEl && linesEl && menuEl) {
    discountEl.addEventListener("change", () => {
      const before = calculate().total;
      state.discount = discountEl.checked;
      render();
      showDelta(calculate().total - before);
    });

    const staffView = $("demoStaff");
    const presentView = $("demoPresent");
    $("demoPresentBtn").addEventListener("click", () => {
      const result = calculate();
      $("presentLines").innerHTML = state.order.length
        ? state.order.map((id) => {
            const item = find(id);
            const qty = state.qty[id];
            const meta = qty > 1 ? `${item.category}・${yen(item.price)} × ${qty}${item.unit}` : item.category;
            return `<li class="present-line"><span><b>${item.name}</b><small>${meta}</small></span><span>${yen(item.price * qty)}</span></li>`;
          }).join("")
        : '<li class="demo-empty">施術内容がありません</li>';
      $("presentSubtotal").textContent = yen(result.subtotal);
      $("presentDiscountRow").hidden = !result.discount;
      $("presentDiscount").textContent = "−" + yen(result.discount);
      $("presentTotal").textContent = yen(result.total);
      $("presentTax").textContent = `うち消費税 ${yen(result.tax)}（税率${TAX_RATE}%）`;
      staffView.hidden = true;
      presentView.hidden = false;
      $("demoBackBtn").focus({ preventScroll: true });
    });
    $("demoBackBtn").addEventListener("click", () => {
      presentView.hidden = true;
      staffView.hidden = false;
      $("demoPresentBtn").focus({ preventScroll: true });
    });

    render();
  }

  /* ---------- subscription cost simulator ---------- */
  const fee = $("simFee");
  if (fee) {
    const update = () => {
      const monthly = Number(fee.value);
      const threeYears = monthly * 36;
      const breakEven = Math.ceil(PRO_PRICE / monthly) + (PRO_PRICE % monthly === 0 ? 1 : 0);
      $("simFeeOut").textContent = yen(monthly);
      $("simOther").textContent = yen(threeYears);
      $("simBarOther").style.width = "100%";
      $("simBarOurs").style.width = Math.max(3, (PRO_PRICE / threeYears) * 100) + "%";
      $("simResult").innerHTML =
        `月額${yen(monthly)}のサービスなら、<strong>${breakEven}か月目</strong>からsalonoteのほうがおトク。3年間で<strong>${yen(threeYears - PRO_PRICE)}</strong>の差になります。`;
    };
    fee.addEventListener("input", update);
    update();
  }

  /* ---------- QR code for desktop visitors ---------- */
  window.addEventListener("load", () => {
    const target = $("qrCode");
    if (!target) return;
    if (typeof window.qrcode !== "function") {
      target.closest(".qr").classList.add("unavailable");
      return;
    }
    const qr = window.qrcode(0, "M");
    qr.addData(APP_STORE_URL);
    qr.make();
    target.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  });
})();
