## Protocol Buffers in the Web, Part 2: JavaScript Client

The big picture: We have a server that accepts WebSocket connections and handles requests by decoding the bytes it receives into a protocol buffer message, then processing the message appropriately. Now we want to actually talk to the server from the browser. To do this we'll need to set up a WebSocket connection and then turn our request objects into bytes so we can send them to the server over the web socket.


In the previous part, we made a simple server in Go that acts as a key-value store. In this section, we'll see how to contact the server from the browser.

Lets create a folder for all our client-related stuff and change directory into it by running
```
mkdir client && cd client/
```

Browsers display HTML files, so let's create one. We'll fill it with some boilerplate HTML that doesn't really do anything just yet.

Copy this code into `index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Protocol Buffers in the Browser</title>
  </head>
  <body>
    <p>Open the console!</p>
  </body>
</html>
```

Now we want to be able to write some code that runs in the webpage, so let's add a reference to a script. Add a script tag into the head of your HTML:
```html
  <!-- not shown -->
  <head>
    <title>Protocol Buffers in the Browser</title>
    <script src="client.js"></script>
  </head>
  <!-- not shown -->
```

The script tag tells your browser that when it loads the `index.html` file, it also needs to fetch and load a file called `client.js`. So whenever someone accesses `index.html`, any code in `client.js` will also be sent to the browser.

We haven't created `client.js` yet, so if you open up `index.html` right now, your browser will complain that it can't find the script. If you open `index.html`, everything might seem normal - you'll still see some text saying "Open the console!". But if you open up the console (F12 on Chrome), you should see an error message. In my version of Chrome, I get a message saying
```
Failed to load resource: net::ERR_FILE_NOT_FOUND
```

Let's fix the error by actually creating `client.js`.

In `client.js`, let's add a few things. We first want to know what URL to connect to, so let's put that in a variable:
```javascript
const url = 'ws://localhost:8080';
```

The `ws://` prefix says to use the WebSocket protocol. If we were using HTTP instead, we would change the URL prefix to `http://`. After the prefix comes the host name - in this case, we're just running the server on our local computer, so we use the special host name "localhost". You could also use the special IP address `127.0.0.1`, known as the loopback address, to connect to your machine. Finally, the `:8080` portion says that we want to connect to port 8080. So the server had better be listening on port 8080!

Next, let's create a WebSocket object. This is really easy - just add these lines:
```javascript
const sock = new WebSocket(url);
sock.binaryType = 'arraybuffer';
```

The second line tells the socket to use array buffers (rather than Blobs). You can find a good amount of discussion on when to use each type on the Internet, but I'm just using array buffers because it makes the code simpler.

An important note: socket communication is <em>asynchronous</em>. That means that things don't finish immediately after starting them. For example, we'll have to wait for someone to tell us that the socket is open before we can start using it. This is unlike regular function calls, where we can call the function, wait <em>synchronously</em> for it to return, then use its result.

In general, waiting synchronously for long-running events is a bad idea. You certainly wouldn't want your browser to freeze up while you're waiting for some task (say downloading a large file) to complete.

JavaScript provides many ways to handle events asynchronously - that is, without waiting. One common pattern (and the one we'll use here) is <em>callbacks</em>. Essentially, we can say "Do something that may take a while, and when it's done, call this function." Another common pattern is <em>promises</em>, but I won't cover them here.

How does this relate to our client code? Well, there are several operations that can potentially take a while - waiting for the socket to be established, for example, or waiting to receive data from the socket.

Let's first set up a callback to find when our socket opens. We can do this using the `addEventListener` function:

```javascript
sock.addEventListener('open', function (ev) {
  console.log('socket opened');
});
```

If this syntax looks strange, don't worry - it will become very familiar as you use JavaScript. We are declaring an anonymous function, and registering it as a callback to the `open` event. So once the socket is opened, our function will be called, and `socket opened` will be printed to the console. You don't need to declare the callback function anonymously. This works just as well, and may be easier to think about:

```javascript
function onOpen(ev) {
  console.log('socket opened');
}

sock.addEventListener('open', onOpen);
```

Let's also create callbacks for the `message` and `close` events:
```javascript
sock.addEventListener('message', function (ev) {
  console.log('socket message');
});

sock.addEventListener('close', function (ev) {
  console.log('socket closed');
});
```

The `message` event is fired whenever the socket receives data. The `close` event is fired when the websocket connection is closed.

At this point, your `client.js` should look something like this:
```javascript
const url = 'ws://localhost:8080';

const sock = new WebSocket(url);
sock.binaryType = 'arraybuffer';

sock.addEventListener('open', function (ev) {
  console.log('socket opened');
});

sock.addEventListener('message', function (ev) {
  console.log('socket message');
});

sock.addEventListener('close', function (ev) {
  console.log('socket closed');
});
```

Now we can quickly sanity check this implementation. Change directory to where your server implementation is, then run
```
go run main.go
```

Open index.html in your browser. You can do this by typing `open index.html` in a terminal (assuming your browser is configured to open HTML), or you can find `index.html` in your file browser and choose to open it with a browser. Open up the console. If you see `socket opened`, then it is working as intended!

Now lets get started on actually serializing and deserializing protocol buffer objects. We'll first need to generate JavaScript files from our `.proto` files. Modify the `gen.sh` script to look like this:
```bash
protoc -Iprotos/ --go_out=server/service --js_out=import_style=commonjs,binary:client/ service.proto
```

The `import_style=commonjs` tells the protocol buffer compiler to generate JS files in the `commonjs` import style, which means that you can `require` them - just like you do with Node.js packages. But we are running in the browser! So we can't actually use the `require` function like you can in Node.js. To get around this, we'll use Browserify, a tool that packages together javascript files and Node.js packages and makes them available in a browser-compatible format.

Save `gen.sh` and run it using `./gen.sh`. This should generate a file called `service_pb.js` in the `client/` folder. If you open it up, you'll notice it isn't browser-compatible: it has a line that looks like
```javascript
var jspb = require('google-protobuf');
```

Let's handle this issue using (Browserify)[http://browserify.org/]. Once you have it installed, create a new bash script called `bundle.sh` in the same folder as `gen.sh`. Populate it with this line:
```bash
cd client && browserify -o bundle.js client.js service_pb.js
```

This command just says to cd into the `client/` folder, and run `browserify`. The `-o` option tells Browserify to save its output in a file called `bundle.js`. Then we have to tell it which files we want it to bundle up - in this case, that's `client.js` and `service_pb.js`.

This script won't work just yet - Browserify figures out which packages to include in the bundle it generates by looking at the Node.js packages installed in your project. We don't have a Node.js project yet, so we'll need to create one now. In the `client/` folder, run
```bash
npm init
```

to create a new node project. You can accept the default settings by pressing Enter at each prompt, or you can customize the settings as you like. Once it's done, run
```bash
npm install google-protobuf
```
to install the protocol buffer library that we need.

Now, you should be able to run `./bundle.sh` from the root of the project. If everything works out, you'll have a file called `bundle.js` in the `client/` folder. Now change our `index.html` to reference `bundle.js` instead of `client.js` - our `client.js` will no longer be directly browser-compatible:

```html
  <!-- not shown -->
  <head>
    <title>Protocol Buffers in the Browser</title>
    <script src="bundle.js"></script>
  </head>
  <!-- not shown -->
```

Note that any time you change `client.js` you will need to re-generate `bundle.js` (by running `./bundle.sh`). There are tools (such as (watchify)[https://www.npmjs.com/package/watchify]) you can use to watch for changes and automatically re-run Browserify, but I won't set them up here.

Now, in `client.js`, we can import our protocol buffer definitions by simply adding the line
```javascript
const pb = require('./service_pb');
```

Let's now write a function that sends a `SetRequest` to the server (but remember that we'll wrap it in a `Request` object). The function looks like this:
```javascript
function set(key, value) {
  let set_req = new pb.SetRequest()
  set_req.setKey(key);
  set_req.setValue(value);

  let req = new pb.Request()
  req.setSetRequest(set_req);

  data = req.serializeBinary();
  sock.send(data);
}
```

This creates a new `SetRequest`, populates the key and value fields, wraps it in a `Request`, serializes the object (ie. converts it to a string of bytes), and sends it via the websocket.

We can also write a similar function to send a `GetRequest`. Try this on your own! Here's my implementation:

```javascript
function get(key) {
  let get_req = new pb.SetRequest()
  get_req.setKey(key);

  let req = new pb.Request()
  req.setGetRequest(get_req);

  data = req.serializeBinary();
  sock.send(data);
}
```

The final thing to do is to deserialize (ie. convert a byte stream into a protocol buffer message object) responses we get from the server. Add this code to your socket `message` callback:

```javascript
sock.addEventListener('message', function (ev) {
  res = pb.Response.deserializeBinary(ev.data);

  switch (res.getResCase()) {
  case pb.Response.ResCase.SET_RESPONSE:
    console.log('received set response');
    break;
  case pb.Response.ResCase.GET_RESPONSE:
    console.log('received get response');
    get_res = res.getGetResponse();
    console.log(get_res.getKey(), ' = ', get_res.getValue());
    break;
  default:
      console.log('received unknown response type');
  }
});
```

This just deserializes data received by the socket into a `Response` object, then takes a different action based on whether the response was a `SetResponse` or a `GetResponse`. Again, this is why we wrap all responses in a `Response` object - if we didn't, we wouldn't really have an easy way to figure out whether a particular set of bytes should be deserialized into a `SetResponse` or a `GetResponse`.

Great! You should now be able to test this out. In the `open` handler, let's add this code:
```javascript
  set('foo', 'bar');
  setTimeout(function() { get('foo'); }, 2000);
```

This sends a SET command, followed by a GET command after 2000 milliseconds. It makes use of the functions we wrote earlier. Make sure the server is running (`go run main.go` if it isn't), then open up `index.html` and check the console. After around 2 seconds, if you see a message saying `foo = bar`, then congrats - everything is working!

If you're having trouble, remember that we programmed our server to call `log.Fatalf` any time a connection is interrupted (and the connection is interrupted whenever you close or refresh a tab with an open websocket connection). So make sure to restart the server before you test it! It might be a good idea to changes those `log.Fatalf`'s...

You can find the code for this walkthrough (here)[https://github.com/heapified/protobuf-web]. You can also watch the (video version)[https://youtu.be/q2DBsxzmGHU] of this walkthrough.

Here's what my final `client.js` looks like:
```javascript
const pb = require('./service_pb');

const url = 'ws://localhost:8080';

const sock = new WebSocket(url);
sock.binaryType = 'arraybuffer';

function set(key, value) {
  let set_req = new pb.SetRequest()
  set_req.setKey(key);
  set_req.setValue(value);

  let req = new pb.Request()
  req.setSetRequest(set_req);

  data = req.serializeBinary();
  sock.send(data);
}

function get(key) {
  let get_req = new pb.SetRequest()
  get_req.setKey(key);

  let req = new pb.Request()
  req.setGetRequest(get_req);

  data = req.serializeBinary();
  sock.send(data);
}

sock.addEventListener('open', function (ev) {
  console.log('socket opened');

  set('foo', 'bar');
  setTimeout(function() { get('foo'); }, 2000);
});

sock.addEventListener('message', function (ev) {
  console.log('socket message');

  res = pb.Response.deserializeBinary(ev.data);

  switch (res.getResCase()) {
  case pb.Response.ResCase.SET_RESPONSE:
    console.log('received set response');
    break;
  case pb.Response.ResCase.GET_RESPONSE:
    console.log('received get response');
    get_res = res.getGetResponse();
    console.log(get_res.getKey(), ' = ', get_res.getValue());
    break;
  default:
      console.log('received unknown response type');
  }

});

sock.addEventListener('close', function (ev) {
  console.log('socket closed');
});
```
