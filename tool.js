//简易加密
function encrypt(data) {
    for (var i = 0; i < data.length; i++) {
        data[i] += -1;
    }

    return data;
}
//简易解密
function decrypt(data) {
    for (var i = 0; i < data.length; i++) {
        data[i] -= -1;
    }

    return data;
}


/*
 从请求头部取得请求详细信息
 如果是 CONNECT 方法，那么会返回 { method,host,port,httpVersion}
 如果是 GET/POST 方法，那么返回 { metod,host,port,path,httpVersion}
*/
function parse_request(buffer) {
    var s = buffer.toString('utf8');
    
    var method = s.split('\n')[0].match(/^([A-Z]+)\s/)[1];
    
    if (method == 'CONNECT') {
        var arr = s.match(/^([A-Z]+)\s([^\:\s]+)\:(\d+)\sHTTP\/(\d.\d)/);
        
        if (arr && arr[1] && arr[2] && arr[3] && arr[4])
            return {
                method: arr[1],
                host: arr[2],
                port: arr[3],
                httpVersion: arr[4]
            };
    } else {
        var arr = s.match(/^([A-Z]+)\s([^\s]+)\sHTTP\/(\d.\d)/);
        
        if (arr && arr[1] && arr[2] && arr[3]) {
            var host = s.match(/Host\:\s+([^\n\s\r]+)/)[1];
            
            if (host) {
                var _p = host.split(':', 2);
                return {
                    method: arr[1],
                    host: _p[0],
                    port: _p[1] ? _p[1] : 80,
                    path: arr[2],
                    httpVersion: arr[3]
                };
            }
        }
    }
    
    return false;
}

/*
 两个buffer对象加起来
*/
function buffer_add(buf1, buf2) {
    decrypt(buf2);

    var re = new Buffer(buf1.length + buf2.length);
    
    buf1.copy(re);
    buf2.copy(re, buf1.length);
    
    return re;
}

/*
 从缓存中找到头部结束标记("\r\n\r\n")的位置
*/
function buffer_find_body(b) {
    for (var i = 0, len = b.length - 3; i < len; i++) {
        if (b[i] == 0x0d && b[i + 1] == 0x0a && b[i + 2] == 0x0d && b[i + 3] == 0x0a) {
            return i + 4;
        }
    }
    
    return -1;
}

exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.parse_request = parse_request;
exports.buffer_add = buffer_add;
exports.buffer_find_body = buffer_find_body;