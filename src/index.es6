"use strict";

import url from "url";
import portfinder from "portfinder";
import connect from "connect";

let makeConf = (payload = '', { status = 200, headers = {}, delay, use, leaveOpen }) => ({
  payload,
  status,
  headers,
  delay,
  use,
  leaveOpen
});

const dataTypeToContentType = {
  "string": "text/plain; charset=utf-8",
  "object": "application/json; charset=utf-8"
};
let ensureContentTypeHeader = (payload, headers) => {
  let exists = Object.keys(headers).some(k => k.toLowerCase() === "content-type");
  if (!exists) headers['Content-Type'] = dataTypeToContentType[typeof payload];
  return headers;   
};


let serve = function(_payload = '', options = {}) {

  let conf = makeConf(_payload, options); 
  
  conf.headers = ensureContentTypeHeader(conf.payload, conf.headers);

  let { payload, status, headers, delay, use, leaveOpen } = conf;

  return new Promise((resolve, reject) => {
    portfinder.getPort((err, port) => {
      if (err) reject(err);
      let app = connect();
      let server;
      if (delay > 0) {
        app.use((req, res, next) => setTimeout(next, delay));
      }
      if (use) {
        if (use.forEach) {
          use.forEach(m => app.use(m));
        } else {
          app.use(use);
        }
      }
      app.use((req, res, next) => {
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

let jort = function() {
  return serve.apply(this, arguments).then((server) => url.format({
    protocol: 'http',
    hostname: server.address().address,
    port: server.address().port,
    pathname: '/' 
  }));
}

jort.serve = serve;


export default jort;
