const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function trainer() {
  const html = fs.readFileSync(path.join(__dirname, '../public/poker/index.html'), 'utf8');
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const elements = {};
  const element = (id) =>
    (elements[id] ||= {
      innerHTML: '',
      textContent: '',
      value: 'all',
      checked: true,
      style: {},
      dataset: {},
      classList: {
        add() {},
        remove() {},
        toggle() {},
        contains() {
          return true;
        },
      },
      scrollIntoView() {},
      focus() {},
    });
  const context = {
    console,
    Math,
    JSON,
    Set,
    Object,
    Array,
    Number,
    String,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    document: {
      getElementById: element,
      querySelectorAll() {
        return [];
      },
      addEventListener() {},
      activeElement: { tagName: 'BODY' },
    },
    window: {},
    confirm() {
      return true;
    },
    location: { reload() {} },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.window.Trainer, context, elements };
}

test('all designed poker families keep valid cards, pots, answer choices, and draw prices', () => {
  const { api } = trainer();
  assert.equal(api.families.length, 137);
  assert.equal(new Set(api.families.map((f) => f.id)).size, 137);
  for (const family of api.families) {
    for (let repeat = 0; repeat < 100; repeat++) {
      const s = api.build(family);
      assert.equal(
        new Set([...s.hand, ...s.board]).size,
        s.hand.length + s.board.length,
        family.id,
      );
      assert.equal(s.board.length, { pre: 0, flop: 3, turn: 4, river: 5 }[s.stage]);
      assert.ok(s.call >= 0 && s.pot > 0, family.id);
      assert.ok(api.positions(s.n).includes(s.hero));
      assert.ok(
        api.options(s).some((option) => option.key === s.answer),
        family.id,
      );
      if (s.cat !== undefined)
        assert.equal(api.evaluate([...s.hand, ...s.board])[0], s.cat, family.id);
      if (s.stage === 'pre') {
        const contributions = { SB: 0.5, BB: 1 };
        for (const action of s.events)
          if (action.amount !== undefined) contributions[action.pos] = action.amount;
        assert.equal(
          Object.values(contributions).reduce((a, b) => a + b, 0),
          s.pot,
          family.id,
        );
        assert.equal(contributions[s.hero] || 0, s.own);
      } else {
        const contributed = s.events
          .filter((e) => e.round === s.stage && e.amount !== undefined)
          .reduce((sum, e) => sum + e.amount, 0);
        assert.equal(s.potBefore + contributed, s.pot, family.id);
        if (s.outs) {
          const chance =
            s.cardsToCome === 2
              ? 1 - ((47 - s.outs) / 47) * ((46 - s.outs) / 46)
              : s.outs / (s.stage === 'flop' ? 47 : 46);
          const price = s.call / (s.pot + s.call);
          assert.equal(s.answer, chance > price + 0.01 ? 'call' : 'fold', family.id);
        }
      }
    }
  }
});

test('all 169 starting classes are classified and suited overlaps use the stronger group', () => {
  const { api } = trainer();
  const ranks = '23456789TJQKA';
  let count = 0;
  for (let high = 0; high < 13; high++)
    for (let low = 0; low <= high; low++) {
      for (const suffix of high === low ? [''] : ['s', 'o']) {
        assert.match(api.tier(api.handFrom(ranks[high] + ranks[low] + suffix)), /^[ABCD]$/);
        count++;
      }
    }
  assert.equal(count, 169);
  assert.equal(api.tier(api.handFrom('AJs')), 'B');
  assert.equal(api.tier(api.handFrom('AJo')), 'C');
  assert.equal(api.tier(api.handFrom('54s')), 'D');
  assert.equal(api.late('CO', 4), false);
  assert.equal(api.late('BTN', 4), true);
});

test('hands described as unbeatable beat every possible current opponent holding', () => {
  const { api } = trainer();
  const deck = [...'23456789TJQKA'].flatMap((rank) => [...'shdc'].map((suit) => rank + suit));
  for (const id of [
    'full-flop',
    'quads-turn',
    'quads-flop',
    'quads-river',
    'royal-river',
    'royal-flop',
    'sf-flop',
    'sf-turn',
    'flush-flop',
    'straight-flop',
    'straight-turn',
    'board-quads-ace',
  ]) {
    const s = api.build(
      api.families.find((f) => f.id === id),
      false,
    );
    const known = [...s.hand, ...s.board];
    const hand = api.evaluate(known);
    const remaining = deck.filter((card) => !known.includes(card));
    for (let a = 0; a < remaining.length; a++)
      for (let b = a + 1; b < remaining.length; b++) {
        assert.ok(api.cmp(hand, api.evaluate([...s.board, remaining[a], remaining[b]])) >= 0, id);
      }
  }
});

test('every lesson explains both outcomes and cannot double-count an answer', () => {
  const { api, context } = trainer();
  for (const family of api.families) {
    context.fixtureID = family.id;
    vm.runInContext(
      `{
      state.current = build(families.find(f => f.id === fixtureID));
      state.answered = false;
      render();
      const before = stats.total;
      answer(state.current.answer);
      if (stats.total !== before + 1) throw Error('missing score');
      if (!document.getElementById('feedback').innerHTML.includes(state.current.rule)) throw Error('missing explanation');
      answer(state.current.answer);
      if (stats.total !== before + 1) throw Error('double score');
      state.answered = false;
      answer(state.current.answer === 'fold' ? 'call' : 'fold');
      if (!document.getElementById('feedback').innerHTML.includes('A useful one')) throw Error('missing incorrect explanation');
    }`,
      context,
    );
  }
});
