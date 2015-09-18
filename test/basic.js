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
  jort(circles).then(
    woah => assert.end("should not have serialized circular obj"),
    yep => assert.pass(yep)
  ).catch(assert.fail);
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
  jort({ took: "three seconds" }, { delay: 3000 }).then(delayed => {
    let elapsed = false;
    setTimeout(() => elapsed = true, 2500);
    request(delayed, { json: true }, (e, r, b) => {
      assert.deepEqual(b, { took: "three seconds" });
      assert.ok(elapsed, "request doesn't complete for 3s");
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
  assert.plan(2);
  jort.serve({ toserve: 'man' }).then(s => {
    assert.ok(s, "exists");
    assert.ok(s.close, "has a close method");
    s.close();
  });
});

test('close after one response', assert => {
  assert.plan(4);
  let p = { toserve: 'men' };
  jort.serve(p).then(s => {
    let address = s.address();
    let url = "http://" + address.address + ":" + address.port;
    request(url, { json: true }, (e, r, b) => {
      assert.deepEqual(b, p);
      request(url, { json: true }, (e, r, b) => {
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
  jort.serve(p, { leaveOpen: true }).then(s => {
    let address = s.address();
    let url = "http://" + address.address + ":" + address.port;
    request(url, { json: true }, (e, r, b) => {
      assert.deepEqual(b, p);
      request(url, { json: true }, (e, r, b) => {
        s.close();
        assert.deepEqual(b, p);
      });
    });
  }).catch(assert.fail);
});
