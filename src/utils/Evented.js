let {removeInPlace} = require("./arrayMethods");

module.exports = class {
	constructor() {
		this._handlers = {};
	}
	
	on(events, handler) {
		events = events.split(" ");
		
		for (let e of events) {
			if (!this._handlers[e]) {
				this._handlers[e] = [];
			}
			
			this._handlers[e].push(handler);
		}
		
		return () => {
			for (let e of events) {
				removeInPlace(this._handlers[e], handler);
				
				if (this._handlers[e].length === 0) {
					delete this._handlers[e];
				}
			}
		}
	}
	
	onNext(events, handler) {
		let remove = this.on(events, function(...args) {
			handler(...args);
			
			remove();
		});
	}
	
	fire(event, ...args) {
		if (!this._handlers[event]) {
			return;
		}
		
		for (let handler of this._handlers[event]) {
			handler(...args);
		}
	}
	
	relayEvents(source, events, prefix="", extraArgs=[]) {
		return events.map((event) => {
			return source.on(event, (...args) => {
				this.fire(prefix + event, ...[...extraArgs, ...args]);
			});
		});
	}
}
