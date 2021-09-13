let bluebird = require("bluebird");

let Files = {
	async createEntry(path) {
		let node = platform.fs(path);
		
		return {
			path,
			node,
			isDir: await node.isDir(),
		};
	},
	
	async ls(dir) {
		let entries = await bluebird.map(platform.fs(dir).ls(), node => this.createEntry(node.path));
		let dirs = entries.filter(e => e.isDir);
		let files = entries.filter(e => !e.isDir);
		
		return [...dirs, ...files];
	},
};

module.exports = Files;
