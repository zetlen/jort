'use strict';

import http from 'http';
import url from 'url';
import portfinder from 'portfinder';
import connect from 'connect';
import { defaults } from 'lodash';

let ensureArray = v => Array.isArray(v) ? v : [v];

let makeConf = (options = {}, base = {}) =>
  defaults(options, base, { status: 200, headers: {}});

const dataTypeToContentType = {
  'string': 'text/plain; charset=utf-8',
  'object': 'application/json; charset=utf-8'
};
let ensureContentTypeHeader = (payload, headers) => {
  let exists = Object.keys(headers)
        .some(k => k.toLowerCase() === 'content-type');
  if (!exists) headers['Content-Type'] = dataTypeToContentType[typeof payload];
  return headers;
};

let getUrl = server => url.format({
  protocol: 'http',
  hostname: server.address().address,
  port: server.address().port,
  pathname: '/'
});

let die = msg => { throw new Error(`jort: ${msg}`); }

let serveSteps = function (confs, baseOptions) {

  if (!confs || confs.length === 0) {
    die("You must supply at least one step to serveSteps().");
  }

  let steps = confs.map(c => {
    let payload, options;
    if (Array.isArray(c)) {
      [payload, options] = c;
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

  let baseConf = makeConf(baseOptions);

  return new Promise((resolve, reject) => {

    portfinder.getPort((err, port) => {
      if (err) reject(err);
      let app = connect();
      let server;

      // state changer
      var current;
      var currentStep;
      function nextStep() {
        if (steps.length === 0) {
          if (!baseConf.leaveOpen) server.close();
        } else {
          currentStep = steps.shift();
          let [payload, options] = ensureArray(currentStep);
          current = makeConf(options, baseConf);
          current.headers = ensureContentTypeHeader(payload, current.headers);
          current.payload = payload;
        }
      }

      // set up persistent middleware

      // delayer
      app.use((req, res, next) => {
        if (current.delay > 0) {
          setTimeout(next, current.delay);
        } else {
          next();
        }
      });

      // set up base middlewares
      if (baseConf.use) {
        ensureArray(baseConf.use).forEach(f => app.use(f));
      }

      // set up all middlewares
      steps.forEach(step => {
        let options = step[1];
        if (options && options.use) {
          ensureArray(options.use).forEach(f => {
            app.use((req, res, next) => {
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
      app.use((req, res, next) => {
        res.writeHead(current.status, current.headers);
        res.end(current.payload);
        nextStep();
        next();
      });

      // first step
      nextStep();

      // and deliver
      let finish = () => resolve({
        server,
        url: getUrl(server)
      });
      server = http.createServer(app);
      if (baseConf.ipv6 === false) {
        server.listen(port, '127.0.0.1', finish);
      } else {
        server.listen(port, '::1', finish);
      }
    });
  });
};

let serve = (payload, options) => serveSteps([payload], options);

let steps = (payloads, options) => 
  serveSteps(payloads, 
             defaults(options, { leaveOpen: false })).then(r => r.url);

let jort = (payload, options) => 
  serve(payload, defaults(options, { leaveOpen: false })).then(r => r.url);

jort.serve = serve;

jort.steps = steps;

jort.serveSteps = serveSteps;

export default jort;
