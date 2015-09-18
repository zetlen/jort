## javascript oversimplified request testing

<center>![jorts in space](http://i.imgur.com/D2gwbHN.png)</center>

*just the right amount of coverage*

### jort is a tool for unit testing things that make HTTP requests
Tools like [nock](https://github.com/pgte/nock) and [sinon](http://sinonjs.org) make it easy to write rich, complete simulations of a REST API or an HTTP web service, but not easy enough for the likes of us. These tools are more suited to integration testing or end-to-end testing. When you're writing small unit tests, you shouldn't have to spin up a server and declare a route, just to make something that replies to a GET with an [HTTP 418](https://tools.ietf.org/html/rfc2324#section-2.3.2). Even a famously concise tool like Express seems too imperative and wordy for these common cases. Why not slip into something cool, casual and comfortable?

```js
var assert  = require('assert');
var request = require('request');
var jort    = require('jort');

jort({ 
  totalCount: 2, 
  items: ["daisy","duke"] 
}).then(function(twoItems) {

  request(twoItems, function(error, response, json) {
    assert.equal(json.totalCount, 2);
    assert.equal(json.items[0], "daisy"); 
  });

});

```

### jort is aggressively oversimplified

Jort has features, but they're hidden from view, in deep, embroidered pockets; the simple version you just saw above assumes a few things.

#### the `jort` function

The `jort` function, the main interface to jort, takes one argument: an object which will be the response. It must be a plain object, serializable as JSON, because that's what will happen to it.
```js
var coupleNicknames = {
  nickiAndMeek: ["Meeki", "Neck"],
  drakeAndLorde: ["Drorde", "Lake"]
};

var nicknamesResponder = jort(coupleNicknames);
```

The function will return a Promise for a string. It'll be something like `http://localhost:8099/`, but you don't have to care. Call that URL once. It will respond  HTTP 200 OK, with appropriate headers for a JSON response, return that response, and then disappear.
```js
nicknamesResponder.then(function(nicknamesResponse) {
  request(nicknamesResponse, function(error, response, json) {

    json.drakeAndLorde.map(console.log);
    /*
     *  Drorde
     *  Lake
     *
     */

  });
});
```

#### if you want anything different than that

You can pass two arguments to `jort()`, <s>one for each leg</s> the first as the payload, similar to above. The second argument is a collection of options. I wonder when we'll find out what they can be!

```js
var emptyPocket = jort(
  /* payload */
  { 
    errorCode: "NOT_FOUND", 
    message: "The requested document was not found, hoss!"
  },
  /* options */
  { 
    status: 404,
    delay: 20000
  }
);
```

#### available options

 - `status`: an integer for the HTTP status code to return. Default `200`
 - `headers`: an object of http headers to add or override, e.g. `{ 'Content-Type': 'text/html' }`
 - `delay`: an integer of ms to delay the first byte of the response. For testing timeouts. Default `0`
 - `use`: an array of [connect middleware](https://github.com/senchalabs/connect) to use (or a single function to be used as one middleware)
 - `leaveOpen`: by default, every jort will only serve one request. set this to `true` to leave the jort running until the process exits (or you turn it off manually using `jort.serve`.

If the first argument is a JS object, Jort will assume it should be serving JSON. If the first argument is a string, Jort will pass the string through unchanged (and you ought to provide a content type header in that case).

#### oh, you want the actual server instance, not just its url?

Not very jorty of you, but you can get this by running `jort.serve` instead of just `jort`. `jort.serve` has the exact same API as `jort`.

The returned Promise will fulfill an object which is a Node [http.Server](https://nodejs.org/api/http.html#http_class_http_server). The server has already been bound to a port, so you don't have to do that manually. It'll also close by itself unless you passed `leaveOpen: true` as an option.

```js
var bananaHammock = jort.serve("Bananas!", { headers: { 'Content-Type': 'text/bananas' } });
bananaHammock.then(function(bananas) { console.log(bananas.address()) });
// { protocol: 'http:', address: '127.0.0.1', port: 8001 }
```

#### but what about about routing? what about responding to GET, PUT, POST, and DELETE?
That's probably not what you're testing. Your app knows how to use the right HTTP verbs, I'm sure. Don't sell yourself jort.

#### but my app isn't built in a way where i can change the URLs it calls!
I agree that this is a problem, but it doesn't seem like a problem I can solve for you.

<center>![jorts in repose](http://i.imgur.com/LONbcQT.jpg)</center>
