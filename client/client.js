const pb = require("./service_pb");

const url = "ws://localhost:8080";

const sock = new WebSocket(url);
sock.binaryType = "arraybuffer";

module.exports = {
  set: (key, value) => {
    let set_req = new pb.SetRequest();
    set_req.setKey(key);
    set_req.setValue(value);

    let req = new pb.Request();
    req.setSetRequest(set_req);

    data = req.serializeBinary();
    sock.send(data);
  },
  get: (key) => {
    let get_req = new pb.SetRequest();
    get_req.setKey(key);

    let req = new pb.Request();
    req.setGetRequest(get_req);

    data = req.serializeBinary();
    sock.send(data);
  },
};

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


sock.addEventListener("open", function (ev) {
  console.log("socket opened");

  set("name", "Franz Sinaga");
  setTimeout(function () {
    get("name");
  }, 2000);
});

sock.addEventListener("message", function (ev) {
  // debugger;
  console.log(ev.data)
  res = pb.Response.deserializeBinary(ev.data);

  switch (res.getResCase()) {
    case pb.Response.ResCase.SET_RESPONSE:
      console.log("received set response");
      break;
    case pb.Response.ResCase.GET_RESPONSE:
      console.log("received get response");
      get_res = res.getGetResponse();
      console.log(`%cMESSAGE ${get_res.getValue()}`, 'color: white; background: black;');
      break;
    default:
      console.log("received unknown response type");
  }
});

sock.addEventListener("close", function (ev) {
  console.log("socket closed");
});
