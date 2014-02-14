var assert = require('assert'),
    parseful = require('../lib');

var p = parseful.define('expr', function (c, $, _) {
  var a = c.action,
      chr = function (e) {
        return c.satisfy(function (c) {
          return c === e;
        });
      },
      digit = c.satisfy(function (c) {
        return /^[0-9]$/.test(c);
      });
  
  function add (a, b) { return a + b; }
  function sub (a, b) { return a - b; }
  function mul (a, b) { return a * b; }
  function div (a, b) { return a / b; }

  return {
    '+': c.accum(chr('+'), add),
    '-': c.accum(chr('-'), sub),
    '+-': [_('+'),_('-')],
    '*': c.accum(chr('*'), mul),
    '/': c.accum(chr('/'), div),
    '*/': [_('*'),_('/')],
    expr: [
      c.chainl1(_('term'), _('+-'))
    ],
    term: [
      c.chainl1(_('fact'), _('*/'))
    ],
    fact: [
      _('positive'),
      _('negative')
    ],
    positive: [
      _('num'),
      c.between(chr('('), chr(')'), _('expr'))
    ],
    num: a(c.many1(digit), function (cs) { return Number(cs.join('')); }),
    negative: a($(chr('-'), _('positive')), function (xs) { return -(xs[1]); })
  };
});

var s = new parseful.State(0, '-(10+2)*4*(-2*5)/(-2)-6'.split(''));
assert(p(s) === -246);
