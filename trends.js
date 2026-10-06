/* Xu hướng & tồn đọng — logic thuần (không đụng DOM) để trang trends.html
   và script kiểm thử (node tests/trends.test.js) dùng chung.
   Đầu vào: history.json = { "YYYY-MM-DD": [ {cust, ctr, rag, at, title, owner, dl, next, ...} ] } */
(function (root) {
  const RANK = { G: 0, A: 1, R: 2 };

  // Mã HĐ thô — cùng quy tắc với tab "Lịch sử tiến độ" trong báo cáo ngày.
  function ctrCode(ctr) {
    const head = String(ctr || '').split('(')[0];
    const m = head.match(/^\s*([A-Za-z0-9][A-Za-z0-9._\/\-]{2,})/);
    return (m ? m[1] : head.trim() || String(ctr || '')).toUpperCase();
  }

  // Khoá nhận diện 1 hồ sơ xuyên ngày. Mã HĐ được ghi không đồng nhất giữa các ngày
  // (AWTC-AAN.140726 / AAN.140726 / AAN-AWTC.140726), nên lấy dãy số ≥6 chữ số
  // làm lõi nếu có; khách hàng bỏ hậu tố pháp nhân (AWTC GMBH → AWTC).
  function normCust(cust) {
    return String(cust || '').toUpperCase()
      .replace(/\b(GMBH|JSC|LTD|CO|CORP|INC|PTE)\.?\b/g, '')
      .replace(/\s+/g, ' ').trim();
  }
  function itemKey(it) {
    const code = ctrCode(it.ctr);
    const digits = (code.match(/\d+/g) || []).sort((a, b) => b.length - a.length)[0] || '';
    return normCust(it.cust) + ' ‖ ' + (digits.length >= 6 ? digits : code);
  }

  // Gộp mỗi ngày thành Map(key → bản ghi xấu nhất trong ngày).
  function byDay(H) {
    const dates = Object.keys(H).sort();
    const days = dates.map(date => {
      const m = new Map();
      (H[date] || []).forEach(raw => {
        const it = Object.assign({}, raw, { rag: RANK[raw.rag] != null ? raw.rag : 'A' });
        const k = itemKey(it);
        const prev = m.get(k);
        if (!prev || RANK[it.rag] > RANK[prev.rag]) m.set(k, it);
      });
      return { date, items: m };
    });
    return days;
  }

  // Số lượng R/A/G mỗi ngày (theo dòng gốc, khớp KPI của báo cáo ngày).
  function ragSeries(H) {
    return Object.keys(H).sort().map(date => {
      const c = { date, R: 0, A: 0, G: 0 };
      (H[date] || []).forEach(it => { c[RANK[it.rag] != null ? it.rag : 'A']++; });
      return c;
    });
  }

  // Với mỗi hồ sơ trong ngày mới nhất: số phiên đỏ liên tiếp, số phiên còn mở, ngày bắt đầu
  // chuỗi, tổng phiên đỏ trong lịch sử. Báo cáo ngày có thể bỏ qua 1 hồ sơ "không có gì mới",
  // nên chuỗi chịu được tối đa GAP phiên vắng liên tiếp (phiên vắng không được đếm).
  const GAP = 2;
  function aging(days) {
    if (!days.length) return [];
    const last = days[days.length - 1];
    const out = [];
    last.items.forEach((it, key) => {
      let red = 0, open = 0, redOn = true, since = last.date, miss = 0;
      for (let i = days.length - 1; i >= 0; i--) {
        const x = days[i].items.get(key);
        if (!x) { if (++miss > GAP) break; continue; }
        miss = 0; open++; since = days[i].date;
        if (redOn && x.rag === 'R') red++; else redOn = false;
      }
      let redTotal = 0;
      days.forEach(d => { const x = d.items.get(key); if (x && x.rag === 'R') redTotal++; });
      out.push({ key, item: it, rag: it.rag, redStreak: red, openStreak: open, since, redTotal });
    });
    return out.sort((a, b) => (RANK[b.rag] - RANK[a.rag]) || (b.redStreak - a.redStreak) ||
      (b.redTotal - a.redTotal) || (b.openStreak - a.openStreak));
  }

  // So sánh 2 phiên gần nhất: mới, xấu đi, cải thiện, đã rời báo cáo.
  function changes(days) {
    const out = { added: [], worse: [], better: [], dropped: [] };
    if (days.length < 2) return out;
    const prev = days[days.length - 2].items, cur = days[days.length - 1].items;
    cur.forEach((it, k) => {
      const p = prev.get(k);
      if (!p) out.added.push({ key: k, item: it, from: null, to: it.rag,
        seenBefore: days.slice(0, -2).some(d => d.items.has(k)) });
      else if (RANK[it.rag] > RANK[p.rag]) out.worse.push({ key: k, item: it, from: p.rag, to: it.rag });
      else if (RANK[it.rag] < RANK[p.rag]) out.better.push({ key: k, item: it, from: p.rag, to: it.rag });
    });
    prev.forEach((it, k) => { if (!cur.has(k)) out.dropped.push({ key: k, item: it, from: it.rag, to: null }); });
    const byRag = (a, b) => RANK[b.item.rag] - RANK[a.item.rag];
    Object.values(out).forEach(l => l.sort(byRag));
    return out;
  }

  // Theo khách hàng: số phiên-đỏ trong N phiên gần nhất so với N phiên trước đó.
  function customers(days, n) {
    const m = new Map();
    const end = days.length, mid = Math.max(0, end - n), start = Math.max(0, end - 2 * n);
    days.forEach((d, i) => {
      d.items.forEach((it, k) => {
        const c = normCust(it.cust);
        if (!m.has(c)) m.set(c, { cust: c, recent: 0, before: 0, now: { R: 0, A: 0, G: 0 } });
        const r = m.get(c);
        if (it.rag === 'R') { if (i >= mid) r.recent++; else if (i >= start) r.before++; }
        if (i === end - 1) r.now[it.rag]++;
      });
    });
    return [...m.values()].filter(r => r.recent || r.before || r.now.R || r.now.A)
      .sort((a, b) => (b.recent - a.recent) || (b.now.R - a.now.R) || (b.now.A - a.now.A));
  }

  // ---- Xuất CSV: 1 dòng = 1 mục trong 1 báo cáo ngày, ngày mới nhất ở trên ----
  const STAGES = ['Booking', 'Sản xuất', 'Đóng hàng', 'Chứng từ', 'Thanh toán'];
  const RAG_NAME = { R: 'Đỏ', A: 'Vàng', G: 'Xanh' };
  const CSV_COLS = ['ngay', 'khach_hang', 'hop_dong', 'ma_ho_so', 'rag', 'rag_ten', 'giai_doan_so', 'giai_doan',
    'so_lo', 'nhan', 'tieu_de', 'phu_trach', 'deadline', 'su_kien', 'viec_tiep_theo'];

  function plainText(s) {
    return String(s == null ? '' : s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  }

  function csvRows(H) {
    const rows = [];
    Object.keys(H).sort().reverse().forEach(date => {
      (H[date] || []).forEach(it => {
        const rag = RANK[it.rag] != null ? it.rag : 'A';
        const at = Number(it.at) || '';
        rows.push({
          ngay: date, khach_hang: plainText(it.cust), hop_dong: plainText(it.ctr), ma_ho_so: itemKey(it),
          rag, rag_ten: RAG_NAME[rag], giai_doan_so: at, giai_doan: STAGES[at - 1] || '',
          so_lo: it.vol == null ? '' : it.vol, nhan: (it.tags || []).join(', '), tieu_de: plainText(it.title),
          phu_trach: plainText(it.owner), deadline: plainText(it.dl),
          su_kien: (it.facts || []).map(plainText).join(' | '), viec_tiep_theo: plainText(it.next),
        });
      });
    });
    return rows;
  }

  // Ô bắt đầu bằng = + @ bị Sheets/Excel hiểu là công thức → thêm dấu ' phía trước.
  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(rows) {
    return [CSV_COLS.join(',')].concat(rows.map(r => CSV_COLS.map(c => csvCell(r[c])).join(','))).join('\r\n') + '\r\n';
  }

  const api = { CSV_COLS, plainText, csvRows, toCSV, GAP, ctrCode, normCust, itemKey, byDay, ragSeries, aging, changes, customers };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Trends = api;
})(this);
