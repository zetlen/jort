"use strict";
let test = require("tape");
let url = require("url");
let querystring = require("querystring");
let request = require("request");
let jort = require("../");

test('simplest usage, just a json payload', assert => {
  assert.plan(1);
  jort({
    embeth: "davidtz"
  }).then(actor => {
    request(actor, { json: true }, (e, r, json) => assert.equal(json.embeth, "davidtz"));
  }).catch(assert.fail);
});

test('a string payload', assert => {
  var r31l = "Now is the winter of our discontent";
  assert.plan(2);
  jort(r31l).then(richard3 => {
    request(richard3, (e, r, b) => {
      assert.equal(r.headers['content-type'], "text/plain; charset=utf-8");
      assert.equal(b, r31l);
    });
  }).catch(assert.fail);
});

test('a 400-series error code', assert => {
  assert.plan(2);
  jort({ message: 'no soup for you'}, { status: 403 }).then(throws => {
    request(throws, { json: true }, (e, r, b) => {
      assert.equal(r.statusCode, 403);
      assert.deepEqual(b, { message: 'no soup for you' });
    });
  }).catch(assert.fail);
});

test('a 500-series error code', assert => {
  assert.plan(2);
  jort("ack!", { status: 503 }).then(throws => {
    request(throws, (e, r, b) => {
      assert.equal(r.statusCode, 503);
      assert.equal(b, "ack!");
    });
  }).catch(assert.fail);
});

test('an empty body', assert => {
  assert.plan(2);
  jort().then(nothin => {
    request(nothin, (e, r, b) => {
      assert.equal(r.statusCode, 200);
      assert.equal(b, "");
    });
  }).catch(assert.fail);
});

test('an unserializable object', assert => {
  assert.plan(1);
  let circles = {squares: {}};
  circles.squares.ovals = circles;
  assert.throws(() => {
    jort(circles);
  }, /Could not serialize/);
});

test('a custom content type header', assert => {
  assert.plan(1);
  jort('<?xml version="1.0" encoding="UTF-8" ?>\
       <importantXml><yes></yes></importantXml>', {
      headers: {
        "Content-type": "application/xml; charset=utf8"
      }
    }).then(x => {
    request(x, (e, r, b) => {
      assert.equal(r.headers['content-type'], "application/xml; charset=utf8")
    });
  });  
});

test('a delay', assert => {
  assert.plan(2);
  jort({ took: "1.5 seconds" }, { delay: 1500 }).then(delayed => {
    let elapsed = false;
    setTimeout(() => elapsed = true, 1000);
    request(delayed, { json: true }, (e, r, b) => {
      assert.deepEqual(b, { took: "1.5 seconds" });
      assert.ok(elapsed, "request doesn't complete for 1.5s");
    });
  }).catch(assert.fail);
});

test('a single additional middleware', assert => {
  assert.plan(2);
  jort({ o: 'yes'}, {
    use: (req, res, next) => {
      var qs = querystring.parse(url.parse(req.url).query);
      assert.equal(qs.forme,"topoopon");
      next();
    }
  }).then(triumph => {
    request(triumph, { json: true, qs: { forme: 'topoopon' }}, (e, r, b) => {
      assert.deepEqual(b, { o: 'yes' }); 
    });
  }).catch(assert.fail);
});

test('an array of additional middleware', assert => {
  assert.plan(3);
  jort({ o: 'yes'}, {
    use: [
      (req, res, next) => {
        var qs = querystring.parse(url.parse(req.url).query);
        assert.equal(qs.forme,"topoopon");
        next();
      },
      (req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        next();
      }
    ]
  }).then(triumph => {
    request(triumph, { json: true, qs: { forme: 'topoopon' }}, (e, r, b) => {
      assert.deepEqual(b, { o: 'yes' }); 
      assert.equal(r.headers['access-control-allow-origin'], '*');
    });
  }).catch(assert.fail);
});

test('jort.serve', assert => {
  assert.plan(3);
  jort.serve({ toserve: 'man' }).then(r => {
    assert.ok(r.server, "server exists");
    assert.ok(r.url, "url exists");
    assert.ok(r.server.close, "server has a close method");
    // close server manually because we never called it
    r.server.close();
  }).catch(assert.fail);
});

test('jort.serve force ipv4 address', assert => {
  assert.plan(1);
  jort.serve({ toserve: 'ipv4' }, { ipv6: false }).then(r => {
    assert.equal(r.server.address().address, '127.0.0.1', 'url is ipv4 style');
    r.server.close();
  }).catch(assert.fail);
});

test('close after one response', assert => {
  assert.plan(4);
  let p = { toserve: 'men' };
  jort.serve(p).then(result => {
    request(result.url, { json: true }, (e, r, b) => {
      assert.deepEqual(b, p);
      request(result.url, { json: true }, (e, r, b) => {
        assert.ok(e, 'error exists');
        assert.notOk(b, 'body does not exist');
        assert.equal(e.code, 'ECONNREFUSED');
      });
    });
  }).catch(assert.fail);
});

test('leaveOpen', assert => {
  assert.plan(2);
  let p = { toserve: 'men' };
  jort.serve(p, { leaveOpen: true }).then(result => {
    request(result.url, { json: true }, (e, r, b) => {
      assert.deepEqual(b, p);
      request(result.url, { json: true }, (e, r, c) => {
        result.server.close();
        assert.deepEqual(c, p);
      });
    });
  }).catch(assert.fail);
});

test('steps with empty steps', assert => {
  assert.plan(1);
  assert.throws(() => jort.steps([]), /at least one step/);
});

test('steps with 2 JSON steps with no other options', assert => {
  assert.plan(2);
  var steps = [
    {
      laura: 'harring',
      naomi: 'watts'
    },
    {
      david: 'lynch',
      mulholland: 'drive'
    }
  ];
  jort.steps(steps).then(url => {
    request(url, { json: true }, (e, r, b) => {
      assert.deepEqual(steps[0], b);
      request(url, { json: true }, (e, r, b) => {
        assert.deepEqual(steps[1], b);
      });
    });
  });
});

test('steps with 2 string steps with no other options', assert => {
  assert.plan(2);
  var steps = [
    'I\'m ready for my closeup, Mr. DeMille.',
    'NO WIRE HANGERS'
  ];
  jort.steps(steps).then(url => {
    request(url, (e, r, b) => {
      assert.equal(steps[0], b);
      request(url, { json: true }, (e, r, b) => {
        assert.equal(steps[1], b);
      });
    });
  });
});

test('steps with 2 string steps in arrays, with no other options', assert => {
  assert.plan(2);
  var steps = [
    ['I\'m ready for my closeup, Mr. DeMille.'],
    ['NO WIRE HANGERS']
  ];
  jort.steps(steps).then(url => {
    request(url, (e, r, b) => {
      assert.equal('I\'m ready for my closeup, Mr. DeMille.', b);
      request(url, { json: true }, (e, r, b) => {
        assert.equal('NO WIRE HANGERS', b);
      });
    });
  });
});

test('steps with base options applied to all steps', assert => {
  assert.plan(4);
  var steps = [
    ['I\'m ready for my closeup, Mr. DeMille.'],
    ['NO WIRE HANGERS']
  ];
  jort.steps(steps, { headers: { 'X-Terrifying': 'yes' } }).then(url => {
    request(url, (e, r, b) => {
      console.log(e);
      assert.equal('I\'m ready for my closeup, Mr. DeMille.', b);
      assert.equal(r.headers['x-terrifying'], 'yes');
      request(url, { json: true }, (e, r, b) => {
        assert.equal('NO WIRE HANGERS', b);
        assert.equal(r.headers['x-terrifying'], 'yes');
      });
    });
  });
});

test('steps with options applied to each step', assert => {
  assert.plan(6);
  var steps = [
    ['I\'m ready for my closeup, Mr. DeMille.', { status: 201 }],
    ['NO WIRE HANGERS', { status: 409 }]
  ];
  jort.steps(steps, { headers: { 'X-Terrifying': 'yes' } }).then(url => {
    request(url, (e, r, b) => {
      assert.equal('I\'m ready for my closeup, Mr. DeMille.', b);
      assert.equal(r.statusCode, 201);
      assert.equal(r.headers['x-terrifying'], 'yes');
      request(url, { json: true }, (e, r, b) => {
        assert.equal('NO WIRE HANGERS', b);
        assert.equal(r.statusCode, 409);
        assert.equal(r.headers['x-terrifying'], 'yes');
      });
    });
  });
});

test('steps with base options and option overrides', assert => {
  assert.plan(4);
  var steps = [
    ['I\'m ready for my closeup, Mr. DeMille.'],
    ['NO WIRE HANGERS', { status: 409 }]
  ];
  jort.steps(steps, { status: 201 }).then(url => {
    request(url, (e, r, b) => {
      assert.equal('I\'m ready for my closeup, Mr. DeMille.', b);
      assert.equal(r.statusCode, 201);
      request(url, { json: true }, (e, r, b) => {
        assert.equal('NO WIRE HANGERS', b);
        assert.equal(r.statusCode, 409);
      });
    });
  });
});

test('different middlewares for each step', assert => {
  assert.plan(5);
  jort.steps([
    [
      { o: 'yes'},
      {
        use: [
          (req, res, next) => {
            var qs = querystring.parse(url.parse(req.url).query);
            assert.equal(qs.forme,"topoopon");
            next();
          },
          (req, res, next) => {
            assert.equal(req.headers['i'], 'keed');
            next();
          }
        ]
      }
    ],
    [
      'i keed',
      {
        use: [
          (req, res, next) => {
            var qs = querystring.parse(url.parse(req.url).query);
            assert.equal(qs.forme, 'to...not poop on???');
            next();
          }
        ]
      }
    ]
  ]).then(triumph => {
    request(triumph, { 
      json: true, 
      qs: { forme: 'topoopon' },
      headers: {
        'I': 'keed'
      }
    }, (e, r, b) => {
      assert.deepEqual(b, { o: 'yes' });
      request(triumph, {
        qs: {
          forme: 'to...not poop on???'
        }
      }, (e, r, b) => {
        assert.equal(b, 'i keed');
      });
    });
  }).catch(assert.fail);
});
