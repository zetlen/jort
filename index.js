"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _url = require("url");

var _url2 = _interopRequireDefault(_url);

var _portfinder = require("portfinder");

var _portfinder2 = _interopRequireDefault(_portfinder);

var _connect = require("connect");

var _connect2 = _interopRequireDefault(_connect);

var makeConf = function makeConf(payload, _ref) {
  if (payload === undefined) payload = '';
  var _ref$status = _ref.status;
  var status = _ref$status === undefined ? 200 : _ref$status;
  var _ref$headers = _ref.headers;
  var headers = _ref$headers === undefined ? {} : _ref$headers;
  var delay = _ref.delay;
  var use = _ref.use;
  var leaveOpen = _ref.leaveOpen;
  return {
    payload: payload,
    status: status,
    headers: headers,
    delay: delay,
    use: use,
    leaveOpen: leaveOpen
  };
};

var dataTypeToContentType = {
  "string": "text/plain; charset=utf-8",
  "object": "application/json; charset=utf-8"
};
var ensureContentTypeHeader = function ensureContentTypeHeader(payload, headers) {
  var exists = Object.keys(headers).some(function (k) {
    return k.toLowerCase() === "content-type";
  });
  if (!exists) headers['Content-Type'] = dataTypeToContentType[typeof payload];
  return headers;
};

var serve = function serve() {
  var _payload = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var conf = makeConf(_payload, options);

  conf.headers = ensureContentTypeHeader(conf.payload, conf.headers);

  var payload = conf.payload;
  var status = conf.status;
  var headers = conf.headers;
  var delay = conf.delay;
  var use = conf.use;
  var leaveOpen = conf.leaveOpen;

  return new Promise(function (resolve, reject) {
    _portfinder2["default"].getPort(function (err, port) {
      if (err) reject(err);
      var app = (0, _connect2["default"])();
      var server = undefined;
      if (delay > 0) {
        app.use(function (req, res, next) {
          return setTimeout(next, delay);
        });
      }
      if (use) {
        if (use.forEach) {
          use.forEach(function (m) {
            return app.use(m);
          });
        } else {
          app.use(use);
        }
      }
      app.use(function (req, res, next) {
        res.writeHead(status, headers);
        if (typeof payload === "object") {
          res.write(JSON.stringify(payload));
        } else {
          res.write(payload.toString());
          res.end();
          if (!leaveOpen) server.close();
        }
        next();
      });
      resolve(server = app.listen(port));
    });
  });
};

var jort = function jort() {
  return serve.apply(this, arguments).then(function (server) {
    return _url2["default"].format({
      protocol: 'http',
      hostname: server.address().address,
      port: server.address().port,
      pathname: '/'
    });
  });
};

jort.serve = serve;

exports["default"] = jort;
module.exports = exports["default"];
