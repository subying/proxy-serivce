var net = require('net')
	,tool = require('./tool')//自定义的工具
	,port = 8893//本地监听的端口
	,serverip = '127.0.0.1'//服务器地址  ngrok.com-173.255.204.192
	,serverport = 8894//服务器端口
;
//在本地创建一个server监听本地serverport端口
net.createServer({ allowHalfOpen: true}, function (client) {
	//启动双向请求  连接客户端和服务端
    var server =  net.createConnection({ allowHalfOpen: true, port: serverport, host: serverip})
    	,client_closeflag = 0
    	,server_closeflag = 0
    ;

    server.setKeepAlive(true, 15 * 1000);

    //暂停
    client.pause();
    server.pause();

    //接收数据
    client.on("data", function (data) {
        if (!server_closeflag) {
            server.write(tool.encrypt(data));
        }
    });
    server.on("data", function (data) {
        if (!client_closeflag) {
            client.write(tool.decrypt(data));
        }
    });

    //连接服务端
    server.on("connect", function (socket) {
    	//重新启动
        client.resume();
        server.resume();
    });
      
    //结束事件
    client.on("end", function () {
        client_closeflag = 1;
        server.end();
    });
    server.on("end", function () {
        server_closeflag = 1;
        client.end();
    });

    //错误事件
    client.on("error", function (err) {
        client_closeflag = 1;
        server.destroy();
        console.log(err);
    });
    server.on("error", function (err) {
        server_closeflag = 1;
        client.destroy();
        console.log(err);
    });

    //超时事件
    client.on("timeout", function () {
        server.destroy();
        client.destroy();
    });
    server.on("timeout", function () {
        server.destroy();
        client.destroy();
    });

}).listen(port,function(){
    console.log('local server listen '+port);
    console.log('Proxy server running at ' + serverip + ':' + serverport);
});


