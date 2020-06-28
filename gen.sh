protoc -Iprotos/ --go_out=server/service --js_out=import_style=commonjs,binary:client/ service.proto
