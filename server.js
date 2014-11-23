var net = require('net')
	,port = 8894
	,tool = require('./tool')//自定义的工具
	,request = require('request')
;
net.createServer({ allowHalfOpen: true},function(client){
	client.setKeepAlive(true, 15 * 1000);

	client.on("end", function () {
        client.end();
    });
    
    client.on("error", function () {
        client.destroy();
    });

    client.on("timeout", function () {
        client.destroy();
    });

	var buffer = new Buffer(0);
	client.on('data',function(data){
		buffer = tool.buffer_add(buffer, data);

        if (tool.buffer_find_body(buffer) < 0) {
            return;
        }
		var req = tool.parse_request(buffer);

		client.removeAllListeners('data');
        client.removeAllListeners('end');
        client.removeAllListeners('error');
        client.removeAllListeners('timeout');

        relay_connection(req);
	});

	//从http请求头部取得请求信息后，继续监听浏览器发送数据，同时连接目标服务器，并把目标服务器的数据传给浏览器
    function relay_connection(req) {
        console.log(req.method + ' ' + req.host + ':' + req.port);

        //如果请求不是CONNECT方法（GET, POST），那么替换掉头部的一些东西
        if (req.method != 'CONNECT') {
            //先从buffer中取出头部
            var _body_pos = tool.buffer_find_body(buffer);

            if (_body_pos < 0) _body_pos = buffer.length;

            var header = buffer.slice(0, _body_pos).toString('utf8');

            //替换connection头
            header = header.replace(/(proxy-)?connection\:.+\r\n/ig, '')
                .replace(/Keep-Alive\:.+\r\n/i, '')
                .replace("\r\n", '\r\nConnection: close\r\n');
            
            //替换网址格式(去掉域名部分)
            if (req.httpVersion == '1.1') {
                var url = req.path.replace(/http\:\/\/[^\/]+/, '');
                if (url.path != url) header = header.replace(req.path, url);
            }
            
            buffer = tool.buffer_add(new Buffer(header, 'utf8'), buffer.slice(_body_pos));
        }


        //启动双向请求，连接目标服务器
        startService(
            client,
            { allowHalfOpen: true, port: req.port, host: req.host},
            { 'encrypt': tool.decrypt, 'decrypt': tool.encrypt },//跟客户端的方法刚好反过来
            { 'connectfunc': proxyConnectAction, 'req': req, 'buffer': buffer }
        );
    }

}).listen(port,function(){ 
	console.log('listen '+port);
});

function proxyConnectAction(client, server, req, buffer) {
    if (req.method == 'CONNECT') {
        client.write(tool.encrypt(new Buffer("HTTP/1.1 200 Connection established\r\nConnection: close\r\n\r\n")));
    } else {
        server.write(buffer);
    }
}

function startService(client, options, cryptfuncs, connopts){
	//建立到目标服务器的连接
    var server =  net.createConnection(options)
    	,client_closeflag = 0
    	,server_closeflag = 0
    ;

    server.setKeepAlive(true, 15 * 1000);

    //暂停
    client.pause();
    server.pause();

    //连接服务端
    server.on("connect", function (socket) {
        client.resume();
        server.resume();

        connopts.connectfunc(client, server, connopts.req, connopts.buffer);
    });

    //接收数据
    client.on("data", function (data) {
        if (!server_closeflag) {
            server.write(cryptfuncs.encrypt(data));
        }
    });
    server.on("data", function (data) {
        if (!client_closeflag) {
            client.write(cryptfuncs.decrypt(data));
        }
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
    client.on("error", function () {
        client_closeflag = 1;
        server.destroy();
    });
    server.on("error", function () {
        server_closeflag = 1;
        client.destroy();
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
}