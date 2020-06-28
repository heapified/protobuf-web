package main

import (
	"fmt"

	"log"
	"net/http"

	"github.com/gorilla/websocket"
	pb "server/service"

	"github.com/golang/protobuf/proto"
)

func checkOrigin(r *http.Request) bool {
	return true
}

var upgrader = websocket.Upgrader{
	CheckOrigin: checkOrigin,
}

var kvStore map[string]string = make(map[string]string)

func doSet(req *pb.SetRequest) *pb.SetResponse {
	log.Printf("SET %s = %s", req.Key, req.Value)
	kvStore[req.Key] = req.Value
	return &pb.SetResponse{}

}

func doGet(req *pb.GetRequest) *pb.GetResponse {
	val, present := kvStore[req.Key]
	if !present {
		log.Fatalf("Key not found: %s", req.Key)
	}

	return &pb.GetResponse{
		Key:   req.Key,
		Value: val,
	}
}

func handleRequest(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatalf("error upgrading connection: %v", err)
	}
	defer c.Close()

	for {
		msgType, msg, err := c.ReadMessage()
		if err != nil {
			log.Fatalf("error reading message: %v", err)
		}
		if msgType != websocket.BinaryMessage {
			log.Fatalf("expected binary message")
		}

		req := &pb.Request{}
		if err := proto.Unmarshal(msg, req); err != nil {
			log.Fatalf("error unmarshaling proto: %v", err)
		}

		var res *pb.Response
		switch req.Req.(type) {
		case *pb.Request_SetRequest:
			setRes := doSet(req.GetSetRequest())
			res = &pb.Response{
				Res: &pb.Response_SetResponse{
					SetResponse: setRes,
				},
			}
			// set request
		case *pb.Request_GetRequest:
			getRes := doGet(req.GetGetRequest())
			res = &pb.Response{
				Res: &pb.Response_GetResponse{
					GetResponse: getRes,
				},
			}
		case nil:
			log.Fatalf("Received unknown request type")
		}

		data, err := proto.Marshal(res)
		if err != nil {
			log.Fatalf("error marshaling message: %v", err)
		}

		err = c.WriteMessage(websocket.BinaryMessage, data)
		if err != nil {
			log.Fatalf("error sending message: %v", err)
		}
	}

}

func main() {
	port := 8080
	addr := fmt.Sprintf("localhost:%d", port)

	log.Printf("Server listening on port %d", port)
	http.HandleFunc("/", handleRequest)
	log.Fatal(http.ListenAndServe(addr, nil))
}
