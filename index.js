'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _portfinder = require('portfinder');

var _portfinder2 = _interopRequireDefault(_portfinder);

var _connect = require('connect');

var _connect2 = _interopRequireDefault(_connect);

var _lodash = require('lodash');

var ensureArray = function ensureArray(v) {
  return Array.isArray(v) ? v : [v];
};

var makeConf = function makeConf() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
  var base = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
  return (0, _lodash.defaults)(options, base, { status: 200, headers: {} });
};

var dataTypeToContentType = {
  'string': 'text/plain; charset=utf-8',
  'object': 'application/json; charset=utf-8'
};
var ensureContentTypeHeader = function ensureContentTypeHeader(payload, headers) {
  var exists = Object.keys(headers).some(function (k) {
    return k.toLowerCase() === 'content-type';
  });
  if (!exists) headers['Content-Type'] = dataTypeToContentType[typeof payload];
  return headers;
};

var getUrl = function getUrl(server) {
  return _url2['default'].format({
    protocol: 'http',
    hostname: server.address().address,
    port: server.address().port,
    pathname: '/'
  });
};

var die = function die(msg) {
  throw new Error('jort: ' + msg);
};

var serveSteps = function serveSteps(confs, baseOptions) {

  if (!confs || confs.length === 0) {
    die("You must supply at least one step to serveSteps().");
  }

  var steps = confs.map(function (c) {
    var payload = undefined,
        options = undefined;
    if (Array.isArray(c)) {
      var _c = _slicedToArray(c, 2);

      payload = _c[0];
      options = _c[1];
    } else {
      payload = c;
      options = {};
    }
    if (payload === null || payload === undefined) {
      payload = '';
    } else if (typeof payload === 'object') {
      try {
        payload = JSON.stringify(payload);
      } catch (e) {
        die('Could not serialize supplied payload: ' + e);
      }
    }
    return [payload, options];
  });

  var baseConf = makeConf(baseOptions);

  return new Promise(function (resolve, reject) {

    _portfinder2['default'].getPort(function (err, port) {
      if (err) reject(err);
      var app = (0, _connect2['default'])();
      var server = undefined;

      // state changer
      var current;
      var currentStep;
      function nextStep() {
        if (steps.length === 0) {
          if (!baseConf.leaveOpen) server.close();
        } else {
          currentStep = steps.shift();

          var _ensureArray = ensureArray(currentStep);

          var _ensureArray2 = _slicedToArray(_ensureArray, 2);

          var payload = _ensureArray2[0];
          var options = _ensureArray2[1];

          current = makeConf(options, baseConf);
          current.headers = ensureContentTypeHeader(payload, current.headers);
          current.payload = payload;
        }
      }

      // set up persistent middleware

      // delayer
      app.use(function (req, res, next) {
        if (current.delay > 0) {
          setTimeout(next, current.delay);
        } else {
          next();
        }
      });

      // set up base middlewares
      if (baseConf.use) {
        ensureArray(baseConf.use).forEach(function (f) {
          return app.use(f);
        });
      }

      // set up all middlewares
      steps.forEach(function (step) {
        var options = step[1];
        if (options && options.use) {
          ensureArray(options.use).forEach(function (f) {
            app.use(function (req, res, next) {
              if (currentStep === step) {
                f(req, res, next);
              } else {
                next();
              }
            });
          });
        }
      });

      // body resolver
      app.use(function (req, res, next) {
        res.writeHead(current.status, current.headers);
        res.end(current.payload);
        nextStep();
        next();
      });

      // first step
      nextStep();

      // and deliver
      server = app.listen(port);
      resolve({
        server: server,
        url: getUrl(server)
      });
    });
  });
};

var serve = function serve(payload, options) {
  return serveSteps([payload], options);
};

var steps = function steps(payloads, options) {
  return serveSteps(payloads, (0, _lodash.defaults)(options, { leaveOpen: false })).then(function (r) {
    return r.url;
  });
};

var jort = function jort(payload, options) {
  return serve(payload, (0, _lodash.defaults)(options, { leaveOpen: false })).then(function (r) {
    return r.url;
  });
};

jort.serve = serve;

jort.steps = steps;

jort.serveSteps = serveSteps;

exports['default'] = jort;
module.exports = exports['default'];
