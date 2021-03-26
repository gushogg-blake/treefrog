"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("./types");
function fullHostName(obj, options) {
    options = options || {};
    var a = '';
    if (obj.name) {
        var skipEncoding = obj.type === types_1.HostType.IPv4 || obj.type === types_1.HostType.IPv6;
        a = skipEncoding ? obj.name : encode(obj.name, options);
    }
    if (obj.port) {
        a += ':' + obj.port;
    }
    return a;
}
exports.fullHostName = fullHostName;
function encode(text, options) {
    text = encodeURIComponent(text);
    if (options.plusForSpace) {
        text = text.replace(/%20/g, '+');
    }
    return options.encodeDollar ? text : text.replace(/%24/g, '$');
}
exports.encode = encode;
function decode(text) {
    return decodeURIComponent(text.replace(/\+/g, '%20'));
}
exports.decode = decode;
function hasText(txt) {
    return typeof txt === 'string' && /\S/.test(txt);
}
exports.hasText = hasText;
function validateUrl(url) {
    var idx = url.search(/[^A-Za-z0-9-._~:/?[\]@!$&'()*+,;=%]/);
    if (idx >= 0) {
        var s = JSON.stringify(url[idx]).replace(/^"|"$/g, '\'');
        throw new Error('Invalid URL character ' + s + ' at position ' + idx);
    }
}
exports.validateUrl = validateUrl;
function parseHost(host, raw) {
    if (raw) {
        if (typeof host !== 'string') {
            throw new TypeError('Invalid "host" parameter: ' + JSON.stringify(host));
        }
        host = host.trim();
    }
    var m, isIPv6;
    if (host[0] === '[') {
        // This is IPv6, with [::] being the shortest possible
        m = host.match(/((\[[0-9a-z:%]{2,45}])(?::(-?[0-9a-z]+))?)/i);
        isIPv6 = true;
    }
    else {
        // It is either IPv4 or domain/socket
        if (raw) {
            m = host.match(/(([a-z0-9.$/-]*)(?::(-?[0-9a-z]+))?)/i);
        }
        else {
            m = host.match(/(([a-z0-9.$%-]*)(?::(-?[0-9a-z]+))?)/i);
        }
    }
    if (m) {
        var h_1 = {};
        if (m[2]) {
            if (isIPv6) {
                h_1.name = m[2];
                h_1.type = types_1.HostType.IPv6;
            }
            else {
                if (m[2].match(/([0-9]{1,3}\.){3}[0-9]{1,3}/)) {
                    h_1.name = m[2];
                    h_1.type = types_1.HostType.IPv4;
                }
                else {
                    h_1.name = raw ? m[2] : decode(m[2]);
                    h_1.type = h_1.name.match(/\/|.*\.sock$/i) ? types_1.HostType.socket : types_1.HostType.domain;
                }
            }
        }
        if (m[3]) {
            var p = m[3], port = parseInt(p);
            if (port > 0 && port < 65536 && port.toString() === p) {
                h_1.port = port;
            }
            else {
                throw new Error('Invalid port number: ' + JSON.stringify(p));
            }
        }
        if (h_1.name || h_1.port) {
            Object.defineProperty(h_1, 'toString', {
                value: function (options) { return fullHostName(h_1, options); }
            });
            return h_1;
        }
    }
    return null;
}
exports.parseHost = parseHost;
