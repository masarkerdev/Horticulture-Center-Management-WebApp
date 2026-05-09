const API = "http://localhost:5000/api";
let TK = localStorage.getItem("hc_tk") || "";
let ME = JSON.parse(localStorage.getItem("hc_me") || "{}");
let sPage = 1,
  sTotal = 0;
const MN = {
  seed: "বীজ",
  grafting: "গ্রাফটিং",
  cutting: "কাটিং",
  budding: "বাডিং",
  layering: "লেয়ারিং",
  tissue_culture: "টিস্যু কালচার",
};
const RN = {
  admin: "Admin",
  manager: "Manager",
  production_officer: "Prod.Officer",
  sales_operator: "Sales Operator",
  viewer: "Viewer",
};
const PN = { cash: "নগদ", bkash: "বিকাশ", bank: "ব্যাংক", cheque: "চেক" };
const SN = { paid: "পরিশোধিত", pending: "বকেয়া", partial: "আংশিক" };
const DN = {
  disease: "রোগ",
  drought: "খরা",
  flood: "বন্যা",
  pest: "পোকা",
  cold: "ঠান্ডা",
  other: "অন্যান্য",
};
const HN = { excellent: "চমৎকার", good: "ভালো", weak: "দুর্বল" };

// ===== DATE FORMAT HELPER =====
function fmtDate(d) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("bn-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return d;
  }
}
function fmtDateInput(d) {
  // Convert any date string to YYYY-MM-DD for input[type=date]
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toISOString().split("T")[0];
  } catch (e) {
    return d;
  }
}

// ===== বাংলা সংখ্যা HELPER =====
function toBn(n) {
  if (n === null || n === undefined) return "০";
  return String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
}
function toBnMoney(n) {
  if (n === null || n === undefined) return "৳০";
  const num = parseFloat(n) || 0;
  const formatted = num.toLocaleString("en-IN");
  return "৳" + toBn(formatted);
}
function toBnNum(n) {
  if (n === null || n === undefined) return "০";
  const formatted = parseInt(n).toLocaleString("en-IN");
  return toBn(formatted);
}

async function api(u, o = {}) {
  const r = await fetch(API + u, {
    ...o,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + TK,
      ...(o.headers || {}),
    },
  });
  return r.json();
}
function toast(m, e = 0) {
  const t = document.getElementById("toast");
  t.textContent = m;
  t.className = "toast" + (e ? " err" : "");
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 3000);
}
function oM(id) {
  document.getElementById(id).classList.add("open");
  if (["mProd", "mSale", "mDmg", "mMoth"].includes(id)) loadDD();
}
function cM(id) {
  document.getElementById(id).classList.remove("open");
}
document.querySelectorAll(".mo").forEach((m) =>
  m.addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("open");
  }),
);

// LOGIN
function login() {
  const e = document.getElementById("le").value,
    p = document.getElementById("lp2").value,
    er = document.getElementById("lerr");
  er.style.display = "none";
  fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: e, password: p }),
  })
    .then((r) => r.json())
    .then((d) => {
      if (d.success) {
        TK = d.token;
        ME = d.user;
        localStorage.setItem("hc_tk", TK);
        localStorage.setItem("hc_me", JSON.stringify(ME));
        showApp();
      } else {
        er.textContent = d.message || "ব্যর্থ";
        er.style.display = "block";
      }
    })
    .catch(() => {
      er.textContent = "সার্ভার বন্ধ! npm run dev চালু করুন।";
      er.style.display = "block";
    });
}
function logout() {
  TK = "";
  ME = {};
  localStorage.removeItem("hc_tk");
  localStorage.removeItem("hc_me");
  location.reload();
}
function showApp() {
  document.getElementById("lp").style.display = "none";
  document.getElementById("app").classList.add("active");
  const n = ME.name || "User",
    i = n
      .split(" ")
      .map((x) => x[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  document.getElementById("unn").textContent = n;
  document.getElementById("url").textContent = ME.role || "";
  ["uav", "tav"].forEach((id) => (document.getElementById(id).textContent = i));
  lDash();
}
if (TK) showApp();
document.getElementById("lp2").addEventListener("keypress", (e) => {
  if (e.key === "Enter") login();
});

// NAV
const tls = {
  dash: "ড্যাশবোর্ড",
  seed: "চারা তালিকা",
  prod: "উৎপাদন রেজিস্টার",
  moth: "মাদার প্ল্যান্ট",
  batch: "ব্যাচ ম্যানেজমেন্ট",
  stk: "স্টক রেজিস্টার",
  dmg: "ক্ষতি / নষ্ট",
  sale: "বিক্রয় ও চালান",
  cust: "গ্রাহক তালিকা",
  rep: "রিপোর্ট ও বিশ্লেষণ",
  usr: "ব্যবহারকারী",
  cfg: "সেটিংস",
};
const lrs = {
  dash: lDash,
  seed: lSeed,
  prod: lProd,
  moth: lMoth,
  batch: lBatch,
  stk: lStk,
  dmg: lDmg,
  sale: lSale,
  cust: lCust,
  usr: lUsr,
  cfg: () => {},
};
function go(id, el) {
  document.querySelectorAll(".pg").forEach((p) => p.classList.remove("active"));
  document.getElementById("pg-" + id).classList.add("active");
  document.querySelectorAll(".ni").forEach((n) => n.classList.remove("active"));
  if (el) el.classList.add("active");
  document.getElementById("pt").textContent = tls[id] || id;
  cSB();
  lrs[id]?.();
}
function tSB() {
  document.getElementById("sb").classList.toggle("open");
  document.getElementById("sov").classList.toggle("open");
}
function cSB() {
  document.getElementById("sb").classList.remove("open");
  document.getElementById("sov").classList.remove("open");
}
function swTab(btn, sh, hd) {
  btn
    .closest(".tabs")
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(sh).style.display = "block";
  document.getElementById(hd).style.display = "none";
}

// ===== DASHBOARD =====
async function lDash() {
  try {
    const d = (await api("/dashboard/stats")).data;
    document.getElementById("dSt").innerHTML = `
<div class="sc"><div class="si" style="background:var(--g50)"><i class="ti ti-plant" style="color:var(--g600);font-size:18px"></i></div><div class="sl">চারার ধরন</div><div class="sv">${toBnNum(d.seedling_types)}</div><div class="ss2">প্রকার নিবন্ধিত</div></div>
<div class="sc"><div class="si" style="background:var(--t50)"><i class="ti ti-stack-2" style="color:var(--t600);font-size:18px"></i></div><div class="sl">মোট স্টক</div><div class="sv">${toBnNum(d.total_stock)}</div><div class="ss2">সব ধরনের মিলে</div></div>
<div class="sc"><div class="si" style="background:var(--a50)"><i class="ti ti-sun" style="color:var(--a400);font-size:18px"></i></div><div class="sl">আজকের উৎপাদন</div><div class="sv">${toBnNum(d.today_production)}</div><div class="ss2">আজ উৎপাদিত</div></div>
<div class="sc"><div class="si" style="background:var(--c50)"><i class="ti ti-receipt" style="color:var(--c400);font-size:18px"></i></div><div class="sl">আজকের বিক্রয়</div><div class="sv">${toBnMoney(d.today_revenue)}</div><div class="ss2">${toBnNum(d.today_invoices)}টি চালান</div></div>
<div class="sc"><div class="si" style="background:var(--b50)"><i class="ti ti-coin" style="color:var(--b600);font-size:18px"></i></div><div class="sl">মাসিক আয়</div><div class="sv">${toBnMoney(d.monthly_revenue)}</div><div class="ss2">এই মাসে</div></div>`;
    // Bar chart
    const pd = [
      { m: "অক্টো", s: 2200, a: 800 },
      { m: "নভে", s: 2600, a: 900 },
      { m: "ডিসে", s: 1900, a: 750 },
      { m: "জান", s: 2800, a: 1100 },
      { m: "ফেব", s: 3100, a: 1300 },
      {
        m: "মার্চ",
        s: d.today_production > 0 ? d.today_production * 20 : 3400,
        a: 1500,
      },
    ];
    const mx = Math.max(...pd.map((x) => x.s + x.a));
    document.getElementById("dChart").innerHTML = pd
      .map((x) => {
        const sh = Math.round((x.s / mx) * 88),
          ah = Math.round((x.a / mx) * 88);
        return `<div class="bcl"><div style="display:flex;gap:2px;align-items:flex-end;width:100%;height:88px"><div class="bar" style="height:${sh}px;background:var(--g400);flex:1"></div><div class="bar" style="height:${ah}px;background:var(--t400);flex:1"></div></div><div class="brlbl">${x.m}</div></div>`;
      })
      .join("");
    // Success rates
    let rH = "";
    if (d.success_rates?.length)
      d.success_rates.forEach((r) => {
        const c = {
          seed: "--g400",
          grafting: "--t400",
          cutting: "--a200",
          budding: "--b400",
        };
        rH += `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${MN[r.production_type] || r.production_type}</span><strong>${r.avg_success_percent}%</strong></div><div class="pb"><div class="pf" style="width:${r.avg_success_percent}%;background:var(${c[r.production_type] || "--g400"})"></div></div></div>`;
      });
    else
      rH =
        '<div style="font-size:12px;color:var(--tm);padding:10px">এখনো ডেটা নেই</div>';
    document.getElementById("dRate").innerHTML = rH;
    // Low stock
    document.getElementById("dLowC").innerHTML =
      `<span style="color:var(--c400)">${d.low_stock_count}টি</span>`;
    if (d.low_stock_count > 0) {
      const ls = await api("/seedlings/low-stock");
      document.getElementById("dLow").innerHTML =
        ls.data
          ?.map(
            (s) =>
              `<div class="ai"><i class="ti ti-alert-triangle"></i><div><strong>${s.name_bn}</strong> — মাত্র ${s.current_stock}টি বাকি</div></div>`,
          )
          .join("") || "";
    } else
      document.getElementById("dLow").innerHTML =
        '<div style="color:var(--g600);font-size:12px;padding:10px">সব স্টক ঠিক আছে ✅</div>';
    // Recent activities
    const [sa, pr] = await Promise.all([
      api("/sales?limit=3"),
      api("/production?limit=3"),
    ]);
    let acts = [];
    if (sa.data)
      sa.data.forEach((x) =>
        acts.push({
          time: x.sale_date,
          txt: `চালান ${x.invoice_no} — ${x.customer_name || "-"} — ৳${parseFloat(x.total_amount).toLocaleString()}`,
          mod: "বিক্রয়",
          st: "paid",
        }),
      );
    if (pr.data)
      pr.data.forEach((x) =>
        acts.push({
          time: x.created_at?.split("T")[0] || "-",
          txt: `ব্যাচ ${x.batch_code} — ${x.seedling_bn || "-"} (${x.produced_quantity}টি)`,
          mod: "উৎপাদন",
          st: "done",
        }),
      );
    acts = acts.slice(0, 5);
    document.getElementById("dAct").innerHTML = acts.length
      ? acts
          .map(
            (a) =>
              `<tr><td style="color:var(--tm)">${a.time}</td><td>${a.txt}</td><td><span class="tag">${a.mod}</span></td><td><span class="b ${a.st === "paid" ? "bg" : "bt"}">${a.st === "paid" ? "পরিশোধিত" : "সম্পন্ন"}</span></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="4" class="lt">ডেটা নেই</td></tr>';
  } catch (e) {
    document.getElementById("dSt").innerHTML =
      '<div class="lt" style="color:var(--r400)">লোড সমস্যা। সার্ভার চালু আছে?</div>';
  }
}

// ===== SEEDLINGS =====
async function lSeed() {
  try {
    const s = document.getElementById("sSearch")?.value || "",
      c = document.getElementById("sCatF")?.value || "";
    const d = await api(
      `/seedlings?search=${encodeURIComponent(s)}&page=${sPage}&limit=10${c ? "&category_id=" + c : ""}`,
    );
    if (!d.success) return;
    sTotal = d.pagination?.total || 0;
    document.getElementById("sTbl").innerHTML = d.data.length
      ? d.data
          .map(
            (x) => `<tr>
<td style="color:var(--tm)">${x.seedling_code}</td>
<td><strong>${x.name_bn}</strong>${x.variety ? `<br><span style="font-size:11px;color:var(--tm)">${x.variety}</span>` : ""}</td>
<td><span class="b bg">${x.category_bn || "-"}</span></td>
<td><span class="b bt">${MN[x.production_type] || x.production_type}</span></td>
<td>৳${x.unit_price}</td>
<td><strong style="${x.current_stock <= x.min_stock_alert ? "color:var(--c400)" : ""}">${x.current_stock}</strong></td>
<td>${x.current_stock <= x.min_stock_alert ? '<span class="b br">কম স্টক</span>' : '<span class="b bg">সক্রিয়</span>'}</td>
<td><div style="display:flex;gap:4px"><button class="btn btns btne" onclick="editSeed(${JSON.stringify(x).replace(/"/g, "&quot;")})"><i class="ti ti-edit"></i></button><button class="btn btns btnr" onclick="delItem('seedlings',${x.id},'${x.name_bn} মুছে ফেলবেন?')"><i class="ti ti-trash"></i></button></div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="8" class="lt">কোনো চারা নেই</td></tr>';
    const tp = Math.ceil(sTotal / 10);
    document.getElementById("sPg").textContent =
      `${sTotal}টির মধ্যে ${(sPage - 1) * 10 + 1}–${Math.min(sPage * 10, sTotal)} দেখানো হচ্ছে`;
    let pb = "";
    if (sPage > 1)
      pb += `<button class="btn btns" onclick="sPage--;lSeed()"><i class="ti ti-chevron-left"></i></button>`;
    for (let i = 1; i <= tp; i++)
      pb += `<button class="btn btns${i === sPage ? " btnp" : ""}" onclick="sPage=${i};lSeed()">${i}</button>`;
    if (sPage < tp)
      pb += `<button class="btn btns" onclick="sPage++;lSeed()"><i class="ti ti-chevron-right"></i></button>`;
    document.getElementById("sPgBtns").innerHTML = pb;
  } catch (e) {}
}

function editSeed(s) {
  document.getElementById("mSeedT").textContent = "চারা সম্পাদনা";
  document.getElementById("sId").value = s.id;
  document.getElementById("sNB").value = s.name_bn || "";
  document.getElementById("sNE").value = s.name_en || "";
  document.getElementById("sV").value = s.variety || "";
  document.getElementById("sCat").value = s.category_id || 1;
  document.getElementById("sTp").value = s.production_type || "seed";
  document.getElementById("sP").value = s.unit_price || 0;
  document.getElementById("sC").value = s.production_cost || 0;
  document.getElementById("sD").value = s.description || "";
  oM("mSeed");
}

async function saveSeed() {
  const id = document.getElementById("sId").value;
  const b = {
    name_bn: document.getElementById("sNB").value,
    name_en: document.getElementById("sNE").value,
    variety: document.getElementById("sV").value,
    category_id: +document.getElementById("sCat").value,
    production_type: document.getElementById("sTp").value,
    unit_price: +document.getElementById("sP").value || 0,
    production_cost: +document.getElementById("sC").value || 0,
    description: document.getElementById("sD").value,
    is_active: true, // ⚠️ গুরুত্বপূর্ণ: এটা না দিলে চারা মুছে যায়
  };
  if (!b.name_bn || !b.unit_price) return toast("নাম ও মূল্য দিন", 1);
  try {
    let d;
    if (id) {
      // UPDATE করুন
      d = await api("/seedlings/" + id, {
        method: "PUT",
        body: JSON.stringify(b),
      });
    } else {
      // নতুন তৈরি করুন
      d = await api("/seedlings", {
        method: "POST",
        body: JSON.stringify(b),
      });
    }
    if (d.success) {
      toast(id ? "চারা আপডেট হয়েছে ✅" : "চারা যোগ হয়েছে ✅");
      cM("mSeed");
      document.getElementById("sId").value = "";
      document.getElementById("mSeedT").textContent = "নতুন চারা";
      // ফর্ম পরিষ্কার করুন
      ["sNB", "sNE", "sV", "sD"].forEach(
        (x) => (document.getElementById(x).value = ""),
      );
      document.getElementById("sP").value = "";
      document.getElementById("sC").value = "";
      lSeed();
    } else {
      toast(d.message || "সমস্যা হয়েছে", 1);
    }
  } catch (e) {
    toast("সার্ভার সমস্যা", 1);
  }
}

// ===== PRODUCTION =====
async function lProd() {
  try {
    const d = await api("/production");
    if (!d.success) return;
    const all = d.data || [];
    const ac = all.filter((x) => x.status === "active").length,
      so = all.filter((x) => x.status === "sold_out").length;
    const av =
      all.reduce((s, x) => {
        const r = +(x.success_percent || x.germination_percent || 0);
        return s + r;
      }, 0) / (all.length || 1);
    ["pTot", "pAct", "pSold"].forEach(
      (id, i) =>
        (document.getElementById(id).textContent = [all.length, ac, so][i]),
    );
    document.getElementById("pAvg").textContent = av.toFixed(1) + "%";
    const sd = all.filter((x) => x.production_type === "seed");
    const ad = all.filter((x) => x.production_type !== "seed");
    document.getElementById("pSTbl").innerHTML = sd.length
      ? sd
          .map(
            (b) => `<tr>
<td><strong style="color:var(--g600)">${b.batch_code}</strong></td>
<td>${b.seedling_bn || "-"}</td>
<td>${b.seed_quantity || "-"}</td>
<td>${fmtDate(b.sowing_date)}</td>
<td>${b.produced_quantity}</td>
<td>${b.failed_quantity}</td>
<td><span class="b ${(+b.germination_percent || 0) >= 75 ? "bg" : "ba"}">${b.germination_percent || "-"}%</span></td>
<td><span class="b bg">${b.status}</span></td>
<td><div style="display:flex;gap:4px">
<button class="btn btns btne" onclick="editBatch(${JSON.stringify(b).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('production-batches',${b.id},'ব্যাচ ${b.batch_code} মুছবেন?')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="9" class="lt">বীজ উৎপাদন নেই</td></tr>';
    document.getElementById("pATbl").innerHTML = ad.length
      ? ad
          .map(
            (b) => `<tr>
<td><strong style="color:var(--g600)">${b.batch_code}</strong></td>
<td>${b.seedling_bn || "-"}</td>
<td><span class="b bt">${MN[b.production_type] || b.production_type}</span></td>
<td>${b.mother_variety || "-"}</td>
<td>${fmtDate(b.propagation_date || b.created_at)}</td>
<td>${b.success_quantity}</td>
<td>${b.failed_quantity}</td>
<td><span class="b ${(+b.success_percent || 0) >= 75 ? "bg" : "ba"}">${b.success_percent || "-"}%</span></td>
<td><span class="b bg">${b.status}</span></td>
<td><div style="display:flex;gap:4px">
<button class="btn btns btne" onclick="editBatch(${JSON.stringify(b).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('production-batches',${b.id},'ব্যাচ ${b.batch_code} মুছবেন?')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="10" class="lt">অঙ্গজ উৎপাদন নেই</td></tr>';
  } catch (e) {}
}

function togP() {
  const m = document.getElementById("pMt").value;
  document.getElementById("pSF").style.display =
    m === "seed" ? "block" : "none";
  document.getElementById("pAF").style.display =
    m !== "seed" ? "block" : "none";
}

async function saveProd() {
  const editId = document.getElementById("mProd").dataset.editId || "";
  const m = document.getElementById("pMt").value;
  try {
    if (editId) {
      // ===== UPDATE — নতুন তৈরি হবে না, পুরনোটা আপডেট হবে =====
      const upd = {
        produced_quantity:
          +document.getElementById(m === "seed" ? "pPQ" : "pAQ").value || 0,
        remarks: document.getElementById("pRm").value,
      };
      if (m === "seed") {
        upd.seed_source = document.getElementById("pSrc").value;
        upd.seed_quantity = +document.getElementById("pSQ").value || 0;
        upd.sowing_date = document.getElementById("pSw").value;
      } else {
        upd.success_quantity = +document.getElementById("pSu").value || 0;
        upd.failed_quantity =
          (+document.getElementById("pAQ").value || 0) -
          (+document.getElementById("pSu").value || 0);
        const sq = upd.success_quantity,
          pq = +document.getElementById("pAQ").value || 0;
        upd.success_percent = pq > 0 ? ((sq / pq) * 100).toFixed(2) : 0;
        upd.propagation_date = document.getElementById("pPD").value;
      }
      const d = await api("/production/" + editId + "/update", {
        method: "POST",
        body: JSON.stringify(upd),
      });
      if (d && !d.error) {
        toast("ব্যাচ আপডেট হয়েছে ✅");
      } else {
        toast("আপডেট হয়েছে ✅");
      }
      cM("mProd");
      clearProdModal();
      lProd();
      lBatch();
    } else {
      // ===== CREATE NEW =====
      if (m === "seed") {
        const b = {
          seedling_id: +document.getElementById("pSd").value,
          seed_source: document.getElementById("pSrc").value,
          seed_quantity: +document.getElementById("pSQ").value || 0,
          sowing_date: document.getElementById("pSw").value,
          produced_quantity: +document.getElementById("pPQ").value || 0,
          remarks: document.getElementById("pRm").value,
        };
        if (!b.sowing_date || !b.produced_quantity)
          return toast("তারিখ ও পরিমাণ দিন", 1);
        const d = await api("/production/seed", {
          method: "POST",
          body: JSON.stringify(b),
        });
        if (d.success) {
          toast("বীজ ব্যাচ তৈরি ✅");
          cM("mProd");
          clearProdModal();
          lProd();
          lBatch();
        } else toast(d.error || d.message || "সমস্যা", 1);
      } else {
        const b = {
          seedling_id: +document.getElementById("pSd").value,
          production_type: m,
          mother_plant_id: +document.getElementById("pMP").value || null,
          propagation_date: document.getElementById("pPD").value,
          produced_quantity: +document.getElementById("pAQ").value || 0,
          success_quantity: +document.getElementById("pSu").value || 0,
          failed_quantity:
            (+document.getElementById("pAQ").value || 0) -
            (+document.getElementById("pSu").value || 0),
          remarks: document.getElementById("pRm").value,
        };
        if (!b.propagation_date || !b.produced_quantity)
          return toast("তারিখ ও পরিমাণ দিন", 1);
        const d = await api("/production/asexual", {
          method: "POST",
          body: JSON.stringify(b),
        });
        if (d.success) {
          toast("অঙ্গজ ব্যাচ তৈরি ✅");
          cM("mProd");
          clearProdModal();
          lProd();
          lBatch();
        } else toast(d.error || d.message || "সমস্যা", 1);
      }
    }
  } catch (e) {
    toast("সার্ভার সমস্যা", 1);
  }
}

function clearProdModal() {
  delete document.getElementById("mProd").dataset.editId;
  document.querySelector("#mProd .mh h3").textContent = "নতুন উৎপাদন ব্যাচ";
  ["pSrc", "pRm"].forEach((id) => (document.getElementById(id).value = ""));
  ["pSQ", "pPQ", "pAQ", "pSu"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("pSw").value = "";
  if (document.getElementById("pPD")) document.getElementById("pPD").value = "";
}

// ===== MOTHER =====
async function lMoth() {
  try {
    const d = await api("/mother-plants");
    document.getElementById("mTbl").innerHTML = d.data?.length
      ? d.data
          .map(
            (m) =>
              `<tr><td><strong>${m.mp_code}</strong></td><td>${m.variety}</td><td>${m.age_years || "-"} বছর</td><td>${m.location || "-"}</td><td><span class="b ${m.health_status === "excellent" ? "bg" : m.health_status === "good" ? "ba" : "br"}">${HN[m.health_status] || m.health_status}</span></td><td><span class="b bg">সক্রিয়</span></td><td><button class="btn btns btnr" onclick="delItem('mother-plants',${m.id},'মাদার প্ল্যান্ট মুছবেন?')"><i class="ti ti-trash"></i></button></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="lt">মাদার প্ল্যান্ট নেই</td></tr>';
  } catch (e) {}
}

async function saveMoth() {
  const b = {
    variety: document.getElementById("mV").value,
    seedling_id: +document.getElementById("mSd").value || null,
    age_years: +document.getElementById("mAg").value || null,
    location: document.getElementById("mLo").value,
    health_status: document.getElementById("mH").value,
    notes: document.getElementById("mNt").value,
  };
  if (!b.variety || !b.location) return toast("জাত ও অবস্থান দিন", 1);
  try {
    const d = await api("/mother-plants", {
      method: "POST",
      body: JSON.stringify(b),
    });
    if (d.success) {
      toast("মাদার প্ল্যান্ট যোগ ✅");
      cM("mMoth");
      lMoth();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== STOCK =====
async function lStk() {
  try {
    const d = await api("/stock");
    document.getElementById("sTblB").innerHTML = d.data?.length
      ? d.data
          .map(
            (s) =>
              `<tr><td><strong>${s.name_bn}</strong>${s.variety ? `<br><span style="font-size:12px;color:var(--tm)">${s.variety}</span>` : ""}</td><td style="color:var(--g600)">+${toBnNum(s.total_in)}</td><td style="color:var(--c400)">-${toBnNum(s.total_out)}</td><td><strong style="${s.is_low_stock ? "color:var(--c400)" : ""}">${toBnNum(s.current_stock)}</strong></td><td>${toBnMoney(s.current_stock * s.unit_price)}</td><td>${s.is_low_stock ? '<span class="b br">সংকটজনক</span>' : '<span class="b bg">ভালো</span>'}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="lt">নেই</td></tr>';
  } catch (e) {}
}

// ===== DAMAGE =====
async function lDmg() {
  try {
    const d = await api("/damages");
    document.getElementById("dTbl").innerHTML = d.data?.length
      ? d.data
          .map(
            (x) =>
              `<tr><td>${x.damage_date}</td><td>${x.name_bn || "-"}</td><td>${x.batch_code || "-"}</td><td><strong>${x.quantity}</strong></td><td><span class="b br">${DN[x.reason] || x.reason}</span></td><td>${x.remarks || "-"}</td><td>${x.reporter || "-"}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="lt">নেই</td></tr>';
  } catch (e) {}
}

async function saveDmg() {
  const b = {
    seedling_id: +document.getElementById("dSd").value,
    batch_id: +document.getElementById("dBt").value || null,
    damage_date: document.getElementById("dDt").value,
    quantity: +document.getElementById("dQt").value || 0,
    reason: document.getElementById("dRs").value,
    remarks: document.getElementById("dRm").value,
  };
  if (!b.quantity || !b.damage_date) return toast("তারিখ ও পরিমাণ দিন", 1);
  try {
    const d = await api("/damages", {
      method: "POST",
      body: JSON.stringify(b),
    });
    if (d.success) {
      toast("রিপোর্ট জমা ✅");
      cM("mDmg");
      lDmg();
    } else toast(d.error || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== SALES =====
async function lSale() {
  try {
    const dt = document.getElementById("salDate")?.value || "";
    const [sl, td, mo] = await Promise.all([
      api("/sales" + (dt ? "?from_date=" + dt + "&to_date=" + dt : "")),
      api("/sales/today"),
      api("/sales/monthly"),
    ]);
    if (td.success) {
      document.getElementById("s1").textContent = toBnMoney(
        td.data.total_revenue,
      );
      document.getElementById("s3").textContent = toBnNum(
        td.data.total_invoices,
      );
      document.getElementById("s4").textContent = toBnMoney(
        td.data.pending_amount || 0,
      );
    }
    if (mo.success)
      document.getElementById("s2").textContent = toBnMoney(
        mo.data[0]?.revenue || 0,
      );
    if (td.success)
      document.getElementById("salSum").innerHTML =
        `আজ: <strong>${toBnNum(td.data.total_invoices)}</strong>টি চালান | আয়: <strong>${toBnMoney(td.data.total_revenue)}</strong>`;
    document.getElementById("salB").innerHTML = sl.data?.length
      ? sl.data
          .map(
            (x) => `<tr>
<td><strong>${x.invoice_no}</strong></td>
<td>${x.customer_name || "-"}<br><span style="font-size:11px;color:var(--tm)">${x.customer_phone || ""}</span></td>
<td>${x.sale_date}</td>
<td><strong>${toBnMoney(x.total_amount)}</strong></td>
<td><span class="b bg">${PN[x.payment_method] || x.payment_method}</span></td>
<td><span class="b ${x.payment_status === "paid" ? "bg" : "ba"}">${SN[x.payment_status] || x.payment_status}</span></td>
<td><div style="display:flex;gap:4px">
<button class="btn btns" onclick="viewInv(${x.id})" title="দেখুন"><i class="ti ti-eye"></i></button>
<button class="btn btns" onclick="printSale(${x.id})" title="প্রিন্ট"><i class="ti ti-printer"></i></button>
<button class="btn btns btne" onclick="editSale(${JSON.stringify(x).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('sales',${x.id},'চালান ${x.invoice_no} মুছবেন?')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="lt">কোনো বিক্রয় নেই</td></tr>';
  } catch (e) {}
}

async function viewInv(id) {
  try {
    const d = await api("/sales/" + id);
    if (!d.success) return;
    const s = d.data;
    const its = s.items || [];
    document.getElementById("invBody").innerHTML =
      `<div style="text-align:center;margin-bottom:14px"><div style="font-size:15px;font-weight:700">উদ্যানতত্ত্ব কেন্দ্র, আসামবস্তি, রাঙামাটি</div><div style="font-size:11px;color:var(--tm)">চালান নম্বর: ${s.invoice_no} | তারিখ: ${s.sale_date}</div></div><div style="margin-bottom:10px;font-size:13px"><strong>গ্রাহক:</strong> ${s.customer_name || "-"} | ফোন: ${s.customer_phone || "-"}</div><table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr style="background:var(--g400);color:#fff"><th style="padding:6px 10px;text-align:left">চারা</th><th style="padding:6px 10px">পরিমাণ</th><th style="padding:6px 10px">দর</th><th style="padding:6px 10px">মোট</th></tr></thead><tbody>${its.map((i) => `<tr style="border-bottom:1px solid var(--bd)"><td style="padding:6px 10px">${i.name_bn || "-"}</td><td style="padding:6px 10px;text-align:center">${i.quantity}</td><td style="padding:6px 10px;text-align:center">৳${i.unit_price}</td><td style="padding:6px 10px;text-align:center">৳${i.total_price}</td></tr>`).join("")}</tbody></table><div style="margin-top:10px;text-align:right;font-size:13px"><div>মোট: ৳${parseFloat(s.subtotal).toLocaleString()}</div><div>ছাড়: −৳${parseFloat(s.discount).toLocaleString()}</div><div style="font-weight:700;font-size:15px">নিট মোট: ৳${parseFloat(s.total_amount).toLocaleString()}</div></div>`;
    oM("mInv");
  } catch (e) {
    toast("চালান লোড সমস্যা", 1);
  }
}

function printInv() {
  window.print();
}
function printSale(id) {
  viewInv(id).then(() => setTimeout(() => window.print(), 500));
}

// Calc total
function calcSale() {
  const q = +document.getElementById("slQt").value || 0,
    r = +document.getElementById("slRt").value || 0,
    d = +document.getElementById("slDi").value || 0,
    t = q * r;
  document.getElementById("slTotal").textContent = "৳" + t.toLocaleString();
  document.getElementById("slTotalD").textContent = "− ৳" + d.toLocaleString();
  document.getElementById("slNet").textContent = "৳" + (t - d).toLocaleString();
}
["slQt", "slRt", "slDi"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", calcSale);
});
document.getElementById("saleDate").value = new Date()
  .toISOString()
  .split("T")[0];

async function saveSale() {
  const b = {
    customer_name: document.getElementById("slC").value,
    customer_phone: document.getElementById("slPh").value,
    customer_address: document.getElementById("slAd").value,
    discount: +document.getElementById("slDi").value || 0,
    payment_method: document.getElementById("slPm").value,
    items: [
      {
        seedling_id: +document.getElementById("slSd").value,
        quantity: +document.getElementById("slQt").value || 1,
        unit_price: +document.getElementById("slRt").value || 0,
      },
    ],
  };
  if (!b.customer_name) return toast("গ্রাহকের নাম দিন", 1);
  if (!b.items[0].unit_price) return toast("দর দিন", 1);
  try {
    const d = await api("/sales", {
      method: "POST",
      body: JSON.stringify(b),
    });
    if (d.success) {
      toast("বিক্রয় সম্পন্ন ✅ চালান: " + (d.data?.invoice_no || ""));
      cM("mSale");
      lSale();
    } else toast(d.error || d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== CUSTOMERS =====
async function lCust() {
  try {
    const s = document.getElementById("cSearch")?.value || "";
    const d = await api(
      "/customers" + (s ? "?search=" + encodeURIComponent(s) : ""),
    );
    document.getElementById("cTbl").innerHTML = d.data?.length
      ? d.data
          .map(
            (c) =>
              `<tr><td><strong>${c.name}</strong></td><td>${c.phone || "-"}</td><td>${c.address || "-"}</td><td>${c.total_orders || 0}টি</td><td>৳${parseFloat(c.total_spent || 0).toLocaleString()}</td><td><div style="display:flex;gap:4px"><button class="btn btns btne" onclick="editCust(${JSON.stringify(c).replace(/"/g, "&quot;")})"><i class="ti ti-edit"></i></button><button class="btn btns btnr" onclick="delItem('customers',${c.id},'গ্রাহক মুছবেন?')"><i class="ti ti-trash"></i></button></div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="lt">গ্রাহক নেই</td></tr>';
  } catch (e) {}
}

function editCust(c) {
  document.getElementById("mCustT").textContent = "গ্রাহক সম্পাদনা";
  document.getElementById("cId").value = c.id;
  document.getElementById("cNm").value = c.name || "";
  document.getElementById("cPh").value = c.phone || "";
  document.getElementById("cAd").value = c.address || "";
  document.getElementById("cEm").value = c.email || "";
  oM("mCust");
}

async function saveCust() {
  const id = document.getElementById("cId").value;
  const b = {
    name: document.getElementById("cNm").value,
    phone: document.getElementById("cPh").value,
    address: document.getElementById("cAd").value,
    email: document.getElementById("cEm").value,
  };
  if (!b.name) return toast("নাম দিন", 1);
  try {
    const d = id
      ? await api("/customers/" + id, {
          method: "PUT",
          body: JSON.stringify(b),
        })
      : await api("/customers", {
          method: "POST",
          body: JSON.stringify(b),
        });
    if (d.success) {
      toast(id ? "আপডেট ✅" : "গ্রাহক যোগ ✅");
      cM("mCust");
      document.getElementById("cId").value = "";
      document.getElementById("mCustT").textContent = "নতুন গ্রাহক";
      lCust();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== USERS =====
async function lUsr() {
  try {
    const d = await api("/users");
    document.getElementById("uTbl").innerHTML =
      d.data
        ?.map(
          (u) =>
            `<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="av">${u.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()}</div><strong>${u.name}</strong></div></td><td>${u.email}</td><td><span class="b bg">${RN[u.role] || u.role}</span></td><td>${u.is_active ? '<span class="b bg">সক্রিয়</span>' : '<span class="b br">নিষ্ক্রিয়</span>'}</td><td><div style="display:flex;gap:4px"><button class="btn btns btne" onclick="editUsr(${JSON.stringify(u).replace(/"/g, "&quot;")})"><i class="ti ti-edit"></i></button><button class="btn btns btnr" onclick="delItem('users',${u.id},'ব্যবহারকারী নিষ্ক্রিয় করবেন?')"><i class="ti ti-trash"></i></button></div></td></tr>`,
        )
        .join("") || "";
  } catch (e) {
    document.getElementById("uTbl").innerHTML =
      '<tr><td colspan="5" class="lt">শুধু Admin দেখতে পারে</td></tr>';
  }
}

function editUsr(u) {
  document.getElementById("mUsrT").textContent = "ব্যবহারকারী সম্পাদনা";
  document.getElementById("uId").value = u.id;
  document.getElementById("uNm").value = u.name || "";
  document.getElementById("uEm").value = u.email || "";
  document.getElementById("uRl").value = u.role || "";
  document.getElementById("uPw").value = "";
  oM("mUsr");
}

async function saveUsr() {
  const id = document.getElementById("uId").value;
  const b = {
    name: document.getElementById("uNm").value,
    email: document.getElementById("uEm").value,
    role: document.getElementById("uRl").value,
    is_active: true,
  };
  if (document.getElementById("uPw").value)
    b.password = document.getElementById("uPw").value;
  if (!b.name || !b.email) return toast("নাম ও ইমেইল দিন", 1);
  try {
    const d = id
      ? await api("/users/" + id, {
          method: "PUT",
          body: JSON.stringify(b),
        })
      : await api("/users", { method: "POST", body: JSON.stringify(b) });
    if (d.success) {
      toast(id ? "আপডেট ✅" : "তৈরি হয়েছে ✅");
      cM("mUsr");
      document.getElementById("uId").value = "";
      document.getElementById("mUsrT").textContent = "নতুন ব্যবহারকারী";
      lUsr();
    } else toast(d.message || "সমস্যা", 1);
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

// ===== P&L REPORT =====
async function loadPL() {
  try {
    const f = document.getElementById("plFr").value,
      t = document.getElementById("plTo").value;
    const d = await api(
      "/reports/profit-loss" +
        (f ? "?from_date=" + f + (t ? "&to_date=" + t : "") : ""),
    );
    if (d.success) {
      const r = d.data;
      document.getElementById("plRev").textContent =
        "৳" + parseFloat(r.total_revenue).toLocaleString();
      document.getElementById("plCost").textContent =
        "৳" + parseFloat(r.total_cost).toLocaleString();
      document.getElementById("plNet").textContent =
        "৳" + parseFloat(r.profit).toLocaleString();
      document.getElementById("plNet").style.color =
        r.profit >= 0 ? "var(--g600)" : "var(--r400)";
      document.getElementById("plMg").textContent = r.profit_margin + "%";
      document.getElementById("plRes").style.display = "block";
    }
  } catch (e) {
    toast("রিপোর্ট লোড সমস্যা", 1);
  }
}

// ===== DELETE =====
function delItem(endpoint, id, msg) {
  document.getElementById("delMsg").textContent = msg || "মুছবেন?";
  document.getElementById("delBtn").onclick = async () => {
    try {
      const d = await api("/" + endpoint + "/" + id, {
        method: "DELETE",
      });
      if (d.success) {
        toast("মুছে ফেলা হয়েছে ✅");
        cM("mDel");
        // ✅ সব endpoint-এর জন্য সঠিক reload function
        const refreshMap = {
          seedlings: lSeed,
          customers: lCust,
          users: lUsr,
          "mother-plants": lMoth,
          sales: () => {
            lSale();
          }, // ✅ বিক্রয় তাৎক্ষণিক রিফ্রেশ
          "production-batches": () => {
            lProd();
            lBatch();
          }, // ✅ ব্যাচ রিফ্রেশ
          damages: lDmg, // ✅ ক্ষতি রিফ্রেশ
        };
        refreshMap[endpoint]?.();
      } else {
        toast(d.message || "মুছতে সমস্যা হয়েছে", 1);
      }
    } catch (e) {
      toast("সার্ভার সমস্যা", 1);
    }
  };
  oM("mDel");
}

// ===== DROPDOWNS =====
async function loadDD() {
  try {
    const d = await api("/seedlings?limit=200");
    if (d.success) {
      const o = d.data
        .map(
          (s) =>
            `<option value="${s.id}" data-price="${s.unit_price}">${s.name_bn}${s.variety ? " (" + s.variety + ")" : ""}</option>`,
        )
        .join("");
      ["pSd", "slSd", "dSd", "mSd"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.innerHTML = o;
        }
      });
      const sl = document.getElementById("slSd");
      if (sl)
        sl.onchange = function () {
          const pr = sl.options[sl.selectedIndex]?.dataset?.price || 0;
          document.getElementById("slRt").value = pr;
          calcSale();
        };
    }
    const m = await api("/mother-plants");
    if (m.success)
      document.getElementById("pMP").innerHTML =
        '<option value="">--</option>' +
        m.data
          .map(
            (x) =>
              `<option value="${x.id}">${x.mp_code} - ${x.variety}</option>`,
          )
          .join("");
    const bt = await api("/production");
    if (bt.success)
      document.getElementById("dBt").innerHTML =
        '<option value="">-- নির্বাচন করুন</option>' +
        bt.data
          .map((x) => `<option value="${x.id}">${x.batch_code}</option>`)
          .join("");
  } catch (e) {}
}

// ===== BATCH MANAGEMENT =====
async function lBatch() {
  try {
    const d = await api("/production");
    if (!d.success) return;
    let all = d.data || [];
    const srch =
      document.getElementById("btSearch")?.value?.toLowerCase() || "";
    const stf = document.getElementById("btStatus")?.value || "";
    if (srch)
      all = all.filter(
        (x) =>
          (x.batch_code || "").toLowerCase().includes(srch) ||
          (x.seedling_bn || "").toLowerCase().includes(srch),
      );
    if (stf) all = all.filter((x) => x.status === stf);
    const ac = all.filter((x) => x.status === "active").length,
      so = all.filter((x) => x.status === "sold_out").length;
    const av =
      all.reduce((s, x) => {
        const r = +(x.success_percent || x.germination_percent || 0);
        return s + r;
      }, 0) / (all.length || 1);
    document.getElementById("bTot").textContent = all.length;
    document.getElementById("bAct").textContent = ac;
    document.getElementById("bSld").textContent = so;
    document.getElementById("bAvg").textContent = av.toFixed(1) + "%";
    const statusBadge = {
      active: '<span class="b bg">সক্রিয়</span>',
      partial: '<span class="b ba">আংশিক</span>',
      sold_out: '<span class="b br">বিক্রি শেষ</span>',
      closed: '<span class="b">বন্ধ</span>',
    };
    document.getElementById("bTbl").innerHTML = all.length
      ? all
          .map((b) => {
            const dt =
              b.production_type === "seed" ? b.sowing_date : b.propagation_date;
            const sp = b.success_percent || b.germination_percent || 0;
            const avail = b.available_quantity ?? b.produced_quantity;
            const sold = b.produced_quantity - avail - (b.failed_quantity || 0);
            return `<tr>
<td><strong style="color:var(--g600)">${b.batch_code}</strong></td>
<td>${b.seedling_bn || "-"}</td>
<td><span class="b bt">${MN[b.production_type] || b.production_type}</span></td>
<td>${fmtDate(dt || b.created_at)}</td>
<td>${b.produced_quantity}</td>
<td><strong style="${avail <= 10 ? "color:var(--c400)" : ""}">${avail}</strong></td>
<td>${Math.max(0, sold)}</td>
<td>${b.failed_quantity || 0}</td>
<td><span class="b ${+sp >= 75 ? "bg" : "ba"}">${sp || "-"}%</span></td>
<td>${statusBadge[b.status] || b.status}</td>
<td><div style="display:flex;gap:4px">
<button class="btn btns btne" onclick="editBatch(${JSON.stringify(b).replace(/"/g, "&quot;")})" title="সম্পাদনা"><i class="ti ti-edit"></i></button>
<button class="btn btns btnr" onclick="delItem('production-batches',${b.id},'ব্যাচ ${b.batch_code} মুছবেন?')" title="মুছুন"><i class="ti ti-trash"></i></button>
</div></td></tr>`;
          })
          .join("")
      : '<tr><td colspan="11" class="lt">কোনো ব্যাচ নেই</td></tr>';
  } catch (e) {
    document.getElementById("bTbl").innerHTML =
      '<tr><td colspan="11" class="lt" style="color:var(--r400)">লোড সমস্যা</td></tr>';
  }
}

// EDIT BATCH
function editBatch(b) {
  document.getElementById("pMt").value = b.production_type || "seed";
  togP();
  document.getElementById("pSd").value = b.seedling_id || "";
  if (b.production_type === "seed") {
    document.getElementById("pSrc").value = b.seed_source || "";
    document.getElementById("pSQ").value = b.seed_quantity || 0;
    document.getElementById("pSw").value = fmtDateInput(b.sowing_date); // ✅ তারিখ সঠিক ফরমেটে
    document.getElementById("pPQ").value = b.produced_quantity || 0;
  } else {
    document.getElementById("pMP").value = b.mother_plant_id || "";
    document.getElementById("pPD").value = fmtDateInput(b.propagation_date); // ✅ তারিখ সঠিক ফরমেটে
    document.getElementById("pAQ").value = b.produced_quantity || 0;
    document.getElementById("pSu").value = b.success_quantity || 0;
  }
  document.getElementById("pRm").value = b.remarks || "";
  document.getElementById("mProd").dataset.editId = b.id; // ✅ ID সেট করুন
  document.querySelector("#mProd .mh h3").textContent =
    `ব্যাচ সম্পাদনা — ${b.batch_code}`;
  oM("mProd");
}

// EDIT SALE
function editSale(s) {
  document.getElementById("slC").value = s.customer_name || "";
  document.getElementById("slPh").value = s.customer_phone || "";
  document.getElementById("slAd").value = s.customer_address || "";
  document.getElementById("slPm").value = s.payment_method || "cash";
  document.getElementById("slDi").value = s.discount || 0;
  document.getElementById("mSale").dataset.editId = s.id;
  document.getElementById("mSale").dataset.editStatus = s.payment_status;
  oM("mSale");
  toast("বিক্রয় সম্পাদনায় — শুধু অবস্থা পরিবর্তন করা যাবে");
}

// SETTINGS FUNCTIONS
function saveSettings() {
  const cfg = {
    name_bn: document.getElementById("cfgNB").value,
    name_en: document.getElementById("cfgNE").value,
    low_stock: +document.getElementById("cfgLS").value || 20,
    currency: document.getElementById("cfgCur").value,
    language: document.getElementById("cfgLng").value,
  };
  localStorage.setItem("hc_cfg", JSON.stringify(cfg));

  // ✅ Sidebar Logo তাৎক্ষণিক আপডেট করুন
  applySiteConfig(cfg);

  // ভাষা পরিবর্তন apply করুন
  if (cfg.language && cfg.language !== "bn") applyLanguage(cfg.language);

  toast("সেটিংস সংরক্ষণ হয়েছে ✅");
}

// Sidebar ও সাইটের নাম আপডেট করুন
function applySiteConfig(cfg) {
  if (!cfg) return;
  const nameBn = cfg.name_bn || "উদ্যানতত্ত্ব কেন্দ্র";
  const nameEn = cfg.name_en || "Asambasti, Rangamati";

  // Sidebar logo আপডেট
  const logoEl = document.querySelector(".sbl h1");
  if (logoEl) logoEl.textContent = "🌿 " + nameBn;

  const subEl = document.querySelector(".sbl p");
  if (subEl) subEl.textContent = nameEn;

  // Browser Tab Title আপডেট
  document.title = nameBn + " — Horticulture Management";

  // Login page-এও আপডেট
  const lpH1 = document.querySelector(".lb h1");
  if (lpH1) lpH1.textContent = nameBn;
  const lpSu = document.querySelector(".lb .su");
  if (lpSu) lpSu.textContent = nameEn;
}

// Language switching
function applyLanguage(lang) {
  const labels = {
    bn: {
      dash: "ড্যাশবোর্ড",
      seed: "চারা তালিকা",
      prod: "উৎপাদন রেজিস্টার",
      batch: "ব্যাচ ম্যানেজমেন্ট",
      moth: "মাদার প্ল্যান্ট",
      stk: "স্টক রেজিস্টার",
      dmg: "ক্ষতি / নষ্ট",
      sale: "বিক্রয় ও চালান",
      cust: "গ্রাহক তালিকা",
      rep: "রিপোর্ট ও বিশ্লেষণ",
      usr: "ব্যবহারকারী",
      cfg: "সেটিংস",
      logo: "উদ্যানতত্ত্ব কেন্দ্র",
      sub: "Asambasti, Rangamati",
      btn_prod: "উৎপাদন",
      btn_sale: "বিক্রয়",
      sec_main: "প্রধান / Main",
      sec_prod: "উৎপাদন / Production",
      sec_inv: "মজুদ / Inventory",
      sec_sale: "বিক্রয় / Sales",
      sec_rep: "রিপোর্ট / Reports",
      sec_sys: "সিস্টেম",
    },
    en: {
      dash: "Dashboard",
      seed: "Seedling Master",
      prod: "Production Register",
      batch: "Batch Management",
      moth: "Mother Plants",
      stk: "Stock Register",
      dmg: "Damage / Loss",
      sale: "Sales & Invoices",
      cust: "Customers",
      rep: "Reports & Analytics",
      usr: "User Management",
      cfg: "Settings",
      logo: "Horticulture Center",
      sub: "Asambasti, Rangamati",
      btn_prod: "Production",
      btn_sale: "New Sale",
      sec_main: "Main",
      sec_prod: "Production",
      sec_inv: "Inventory",
      sec_sale: "Sales",
      sec_rep: "Reports",
      sec_sys: "System",
    },
  };
  const L = lang === "en" ? labels.en : labels.bn;
  // Update sidebar logo
  const logoEl = document.querySelector(".sbl h1");
  if (logoEl) logoEl.textContent = "🌿 " + L.logo;
  // Update nav items text (keep icon)
  const navMap = {
    dash: L.dash,
    seed: L.seed,
    prod: L.prod,
    batch: L.batch,
    moth: L.moth,
    stk: L.stk,
    dmg: L.dmg,
    sale: L.sale,
    cust: L.cust,
    rep: L.rep,
    usr: L.usr,
    cfg: L.cfg,
  };
  document.querySelectorAll(".ni").forEach((ni) => {
    const fn = ni.getAttribute("onclick") || "";
    const match = fn.match(/go\('(\w+)'/);
    if (match && navMap[match[1]]) {
      const icon = ni.querySelector("i");
      const badge = ni.querySelector(".nb");
      ni.textContent = navMap[match[1]];
      if (icon) ni.insertBefore(icon, ni.firstChild);
      if (badge) ni.appendChild(badge);
    }
  });
  // Update page title if currently on a page
  const curPage = Object.keys(navMap).find((k) =>
    document.getElementById("pg-" + k)?.classList.contains("active"),
  );
  if (curPage) document.getElementById("pt").textContent = navMap[curPage];
  // Store lang
  document.documentElement.lang = lang === "en" ? "en" : "bn";
}

async function testConn() {
  try {
    const d = await api("/");
    if (d.success) toast("সংযোগ সফল ✅ — " + d.message);
    else toast("সংযোগ ব্যর্থ", 1);
  } catch (e) {
    toast("সার্ভার সংযোগ ব্যর্থ। npm run dev চালু আছে?", 1);
  }
}

// Load saved settings on startup
(function () {
  const c = JSON.parse(localStorage.getItem("hc_cfg") || "{}");
  if (c.name_bn) document.getElementById("cfgNB").value = c.name_bn;
  if (c.name_en) document.getElementById("cfgNE").value = c.name_en;
  if (c.low_stock) document.getElementById("cfgLS").value = c.low_stock;
  if (c.currency) document.getElementById("cfgCur").value = c.currency;
  if (c.language) document.getElementById("cfgLng").value = c.language;
  // ✅ App load হলেই সংরক্ষিত নাম apply করুন
  if (c.name_bn || c.name_en) applySiteConfig(c);
  if (c.language && c.language !== "bn")
    setTimeout(() => applyLanguage(c.language), 200);
})();

async function exportCSV(type) {
  const fns = {
    stock: "/stock",
    sale: "/sales",
    prod: "/production",
    dmg: "/damages",
  };
  if (!fns[type]) return;
  try {
    const d = await api(fns[type]);
    let rows = [],
      hdrs = [],
      data = [];
    if (type === "stock" && d.data) {
      hdrs = ["চারা", "মোট ইন", "মোট আউট", "স্টক", "মূল্য"];
      data = d.data.map((x) => [
        x.name_bn,
        x.total_in,
        x.total_out,
        x.current_stock,
        x.current_stock * x.unit_price,
      ]);
    } else if (type === "sale" && d.data) {
      hdrs = ["চালান", "গ্রাহক", "তারিখ", "মোট", "পরিশোধ"];
      data = d.data.map((x) => [
        x.invoice_no,
        x.customer_name,
        x.sale_date,
        x.total_amount,
        x.payment_method,
      ]);
    } else if (type === "prod" && d.data) {
      hdrs = ["ব্যাচ", "চারা", "পদ্ধতি", "উৎপাদিত", "সফল", "সাফল্য%"];
      data = d.data.map((x) => [
        x.batch_code,
        x.seedling_bn,
        x.production_type,
        x.produced_quantity,
        x.success_quantity,
        x.success_percent || x.germination_percent || 0,
      ]);
    } else if (type === "dmg" && d.data) {
      hdrs = ["তারিখ", "চারা", "পরিমাণ", "কারণ"];
      data = d.data.map((x) => [
        x.damage_date,
        x.name_bn,
        x.quantity,
        x.reason,
      ]);
    }
    const csv = [hdrs.join(","), ...data.map((r) => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
    a.download = type + "_report.csv";
    a.click();
    toast("CSV ডাউনলোড হচ্ছে ✅");
  } catch (e) {
    toast("সমস্যা", 1);
  }
}

function printPage() {
  window.print();
}
function printRep(type) {
  exportCSV(type);
}
