// `()`
function Unit () { return Unit; }

// `Nothing`
function Nothing () { return Nothing; }

function always (a) {
  return function () {
    return a;
  };
}

// memoize
function M (f) {
  var memo = {};
  return function (s) {
    var i = s.i;
    if (memo.hasOwnProperty(i)) {
      s.i = memo.i;
      return memo.r;
    }
    memo[i] = { i:i , r: f(s) };
    return memo[i].r;
  };
}

// combinators
var combinators = {
  action: function action (p, f) {
    return function (s) {
      var r = p(s);
      if (r === Nothing) {
        return Nothing;
      } else {
        return f(r);
      }
    };
  },
  many: function many (p) {
    return M(_manyAccum(function (a, b) {
      return a.concat([b]);
    }, p));
  },
  many1: function many1 (p) {
    return combinators.action(combinators.combine([p, combinators.many(p)]), function (a) {
      return [a[0]].concat(a[1]);
    });
  },
  skip: function skip (p) {
    return function (s) {
      if (p(s) === Nothing) {
        return Nothing;
      } else {
        return Unit;
      }
    };
  },
  skipMany: function skipMany (p) {
    return combinators.action(combinators.many(p), Unit);
  },
  skipMany1: function skipMany1 (p) {
    return combinators.action(combinators.many1(p), Unit);
  },
  chainl1: function (p, op) {
    return function (s) {
      var r = p(s);
      if (r === Nothing) {
        return Nothing;
      }
      return (function rest (s) {
        var f = op(s);
        if (f === Nothing) {
          return r;
        }
        var r2 = p(s);
        if (r2 === Nothing) {
          return r;
        }        
        r = f(r, r2);
        return rest(s);
      })(s);
    };
  },
  between: function (open, close, p) {
    return combinators.action(combinators.combine([open, p, close]), function (rs) {
      return rs[1];
    });
  },
  accum: function accum (p, f) {
    return function (s) {
      if (p(s) === Nothing) {
        return Nothing;
      }
      return f;
    };
  },
  choice: function choice (ps) {
    return M(function (s) {
      var r = Nothing, i = 0;
      for (i = 0; i < ps.length; ++i) {
        s.save();
        r = ps[i](s);
        if (r === Nothing) {
          s.recover();
        } else {
          s.drop();
          return r;
        }
      }
      return Nothing;
    });
  },
  combine: function combine (ps) {
    return M(function (s) {
      var rs = [], i = 0, r = Nothing;
      for (i = 0; i < ps.length; ++i) {
        r = ps[i](s);
        if (r === Nothing) {
          return Nothing;
        }
        rs.push(r);
      }
      return rs;
    });
  },
  eos: function eos (s) {
    if (s.read() === Nothing) {
      return Unit;
    } else {
      return Nothing;
    }
  },
  satisfy: function satisfy (f) {
    return _prim(function (c) {
      if (f(c)) {
        return c;
      } else {
        return Nothing;
      }
    });
  }
};

// internal implementations
function _prim (test) {
  return function (s) {
    if (s.read() === Nothing) {
      return Nothing;
    } else {
      return test(s.peek);
    }
  };
}

function _manyAccum (accum, p) {
  return function (s) {
    var rs = [], r;
    while (true) {
      s.save();
      if ((r = p(s)) !== Nothing) {
        rs = accum(rs, r);
        s.drop();
      } else {
        break;
      }
    }
    s.recover();
    return rs;
  };
}

function State (init, inputList) {
  this.list = inputList;

  this.i = init;
  
  this._stash = [];
  this.peek = Nothing;
}

State.prototype.read = function () {
  if (this.i < this.list.length) {
    return this.peek = this.list[this.i++];
  } else {
    // end of stream
    return this.peek = Nothing;
  }
};

State.prototype.save = function () {
  this._stash.push(this.i);
};

State.prototype.recover = function () {
  this.i = this._stash.pop();
};

State.prototype.drop = function () {
  this._stash.pop();
};

function $ (/* ps */) {
  return combinators.combine(Array.prototype.slice.call(arguments));
}

function bind (scope) {
  return function _ (pn) {
    return function (s) {
      return scope[pn](s);
    };
  };
}

function define (start, f) {
  var scope = {},
      rules = f(combinators, $, bind(scope));

  Object.keys(rules).forEach(function (rulename) {
    scope[rulename] = (function (rule) {
      if (Array.isArray(rule)) {
        return combinators.choice(rule);
      } else {
        return rule;
      }
    })(rules[rulename]);
  });
  return scope[start];
}

module.exports = {
  Nothing: Nothing,
  Unit: Unit,
  combinators: combinators,
  define: define,
  State: State
};
