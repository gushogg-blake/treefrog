let Evented = require("../utils/Evented");
let lid = require("../utils/lid");
let spawn = require("../utils/spawn");
let promiseWithMethods = require("../utils/promiseWithMethods");
let fs = require("./fs");

let nodeModules = fs(__dirname, "..", "..", "..", "..", "..", "node_modules");

let cmds = {
	javascript: [
		"node", 
		nodeModules.child("typescript-language-server", "lib", "cli.js").path, 
		"--stdio", 
		"--log-level=4", 
		"--tsserver-path=" + nodeModules.child("typescript/lib/tsserver.js").path,
		"--tsserver-log-file=/home/gus/logs.txt",
	],
};

class LspServer extends Evented {
	constructor(id, langCode) {
		super();
		
		this.id = id;
		this.langCode = langCode;
		this.requestPromises = {};
		
		this.buffer = "";
	}
	
	async init(capabilities, initOptions, workspaceFolders) {
		let [cmd, ...args] = cmds[this.langCode];
		
		this.process = await spawn(cmd, args);
		
		this.process.stdout.on("data", this.onData.bind(this));
		this.process.stderr.on("data", this.onError.bind(this));
		
		this.process.on("exit", this.onExit.bind(this));
		
		let {
			capabilities: serverCapabilities,
		} = await this.request("initialize", {
			processId: process.pid,
			capabilities,
			initializationOptions: initOptions,
			workspaceFolders,
		});
		
		return serverCapabilities;
	}
	
	request(method, params) {
		let id = lid();
		
		let json = JSON.stringify({
			id,
			jsonrpc: "2.0",
			method,
			params,
		});
		
		let message = "Content-Length: " + json.length + "\r\n\r\n" + json;
		
		console.log(message);
		
		this.process.stdin.write(message);
		
		let promise = promiseWithMethods();
		
		this.requestPromises[id] = promise;
		
		return promise;
	}
	
	notify(method, params) {
		let json = JSON.stringify({
			jsonrpc: "2.0",
			method,
			params,
		});
		
		let message = "Content-Length: " + json.length + "\r\n\r\n" + json;
		
		console.log(message);
		
		this.process.stdin.write(message);
	}
	
	close() {
		this.process.kill();
	}
	
	onData(data) {
		try {
			this.buffer += data.toString();
			
			let split = this.buffer.indexOf("\r\n\r\n");
			
			if (split === -1) {
				return;
			}
			
			let [headers, rest] = [this.buffer.substr(0, split), this.buffer.substr(split + 4)];
			
			if (!rest) {
				return;
			}
			
			let length = Number(headers.match(/Content-Length: (\d+)/)[1]);
			let body = rest.substr(0, length);
			
			if (body.length < length) {
				return;
			}
			
			this.buffer = this.buffer.substr(split + 4 + length);
			
			let message = JSON.parse(body);
			
			if (message.id) {
				let {id, error, result} = message;
				let promise = this.requestPromises[id];
				
				if (error) {
					console.error(error);
					
					promise.reject(error);
				} else {
					promise.resolve(result);
				}
			} else {
				let {method, params} = message;
				
				this.fire("notification", {method, params}); //
			}
		} catch (e) {
			console.error(e);
		}
	}
	
	onError(data) {
		console.error(data.toString());
	}
	
	onExit(code) {
		console.log("exit", code);
		this.fire("exit");
	}
}

module.exports = LspServer;
