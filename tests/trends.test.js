// Chạy: node tests/trends.test.js — kiểm tra logic trang Xu hướng & tồn đọng (trends.js).
const assert = require('assert');
const T = require('../trends.js');

// Mã HĐ ghi khác nhau giữa các ngày vẫn ra cùng một hồ sơ.
assert.strictEqual(T.itemKey({ cust: 'AWTC GMBH', ctr: 'AWTC-AAN.140726 LOT 1' }), T.itemKey({ cust: 'AWTC', ctr: 'AAN.140726' }));
assert.strictEqual(T.itemKey({ cust: 'KATO', ctr: '140926 LOT 1' }), T.itemKey({ cust: 'KATO', ctr: 'AAN-KATO-140926' }));
assert.notStrictEqual(T.itemKey({ cust: 'SUREWAVE', ctr: 'SUR1406' }), T.itemKey({ cust: 'SUREWAVE', ctr: 'SUR1426' }));

const H = {
  '2026-10-01': [{ cust: 'X', ctr: 'X-111111', rag: 'R' }, { cust: 'Y', ctr: 'Y-222222', rag: 'A' }, { cust: 'Z', ctr: 'Z-333333', rag: 'G' }],
  '2026-10-02': [{ cust: 'X', ctr: 'X-111111', rag: 'R' }, { cust: 'Y', ctr: 'Y-222222', rag: 'A' }],
  '2026-10-05': [{ cust: 'Y', ctr: 'Y-222222', rag: 'R' }],                       // X vắng 1 phiên
  '2026-10-06': [{ cust: 'X', ctr: 'X-111111', rag: 'R' }, { cust: 'X', ctr: '111111 LOT 2', rag: 'A' },
                 { cust: 'Y', ctr: 'Y-222222', rag: 'A' }, { cust: 'W', ctr: 'W-444444', rag: 'A' }],
};

assert.deepStrictEqual(T.ragSeries(H).map(d => [d.R, d.A, d.G]), [[1, 1, 1], [1, 1, 0], [1, 0, 0], [1, 3, 0]]);

const days = T.byDay(H);
assert.strictEqual(days[3].items.size, 3, 'trùng hồ sơ trong ngày được gộp');
assert.strictEqual(days[3].items.get('X ‖ 111111').rag, 'R', 'gộp lấy mức xấu nhất');

const ag = Object.fromEntries(T.aging(days).map(a => [a.key.split(' ‖ ')[0], a]));
assert.strictEqual(ag.X.redStreak, 3, 'phiên vắng không cắt chuỗi đỏ');
assert.strictEqual(ag.X.openStreak, 3);
assert.strictEqual(ag.X.since, '2026-10-01');
assert.strictEqual(ag.Y.redStreak, 0);
assert.strictEqual(ag.Y.redTotal, 1);
assert.strictEqual(ag.W.openStreak, 1);
assert.strictEqual(T.aging(days)[0].key, 'X ‖ 111111', 'đỏ lâu nhất đứng đầu');

const c = T.changes(days);
assert.deepStrictEqual(c.better.map(x => x.key), ['Y ‖ 222222']);
assert.deepStrictEqual(c.added.map(x => [x.key, x.seenBefore]), [['X ‖ 111111', true], ['W ‖ 444444', false]]);
assert.strictEqual(c.dropped.length, 0);

const cu = Object.fromEntries(T.customers(days, 2).map(r => [r.cust, r]));
assert.deepStrictEqual([cu.X.recent, cu.X.before], [1, 2]);
assert.deepStrictEqual([cu.Y.recent, cu.Y.before], [1, 0]);

// Dữ liệu thật phải chạy được không lỗi.
const real = T.byDay(require('../history.json'));
assert.ok(T.aging(real).length > 0);

console.log('trends.js: tất cả kiểm tra đều đạt');
