const pb = require('./service_pb');

const uri = 'ws://localhost:8080';

const sock = new WebSocket(uri);
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
  console.log(ev.data);

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