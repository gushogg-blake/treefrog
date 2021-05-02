let {multiCharWordRe, nonWordRe} = require("./config");

module.exports = function(line, col) {
	// find the index of the next command (the one that starts at col)
	
	let c = 0;
	let commandIndex = 0;
	let offset = 0;
	
	while (true) {
		if (c === col) {
			break;
		}
		
		let command = line.commands[commandIndex];
		
		if (!command) {
			break;
		}
		
		let [type, value] = command;
		
		if (type === "tab") {
			c += value;
		} else if (type === "string") {
			if (c + value.length > col) {
				offset = col - c;
				
				break;
			}
			
			c += value.length;
		}
		
		commandIndex++;
	}
	
	// find word (string of word chars or single non-word char)
	
	let width = 0;
	
	while (true) {
		let command = line.commands[commandIndex];
		
		if (!command) {
			break;
		}
		
		let [type, value] = command;
		
		if (type === "tab") {
			if (width === 0) {
				width = value;
			}
			
			break;
		}
		
		if (type === "string") {
			if (value[offset].match(nonWordRe)) {
				if (width === 0) {
					width = 1;
				}
				
				break;
			}
			
			let word = value.substr(offset).match(multiCharWordRe)[0];
			
			width += word.length;
		}
		
		offset = 0;
		commandIndex++;
	}
	
	return width;
}
