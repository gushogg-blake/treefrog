let treesitter = require("../../ipc/treesitter/renderer");
let getIndentLevel = require("../common/utils/getIndentLevel");
let advanceCursor = require("../common/utils/treesitter/advanceCursor");


function createLine(string, offset) {
	return {
		string,
		offset,
		trimmed: undefined,
		commands: [],
		width: undefined,
		height: undefined,
		indentLevel: 0,
		indentOffset: 0,
		wrappedLines: undefined,
	};
}


/*

			let indentLevel = getIndentLevel(line.string, this.fileDetails.indentation);
			
			line.width = col;
			line.trimmed = line.string.trimLeft();
			line.indentLevel = indentLevel.level;
			line.indentOffset = indentLevel.offset;
			line.commands = commands;
		}
*/



function parse(string) {
	let lines = [
		createLine("asd", 0),
		createLine("123", 4),
	];
	
	//while (true) {
	//	
	//	let {currentNode: node} = cursor;
	//	let {startIndex, endIndex} = node;
	//	
	//	let value = code.substring(startIndex, endIndex);
	//	
	//		console.log(node);
	//		console.log(value);
	//	if (node.childCount === 0 ) {
	//		//str += code.substring(startIndex, endIndex);
	//	} else {
	//	}
	//	
	//	if (!advanceCursor(cursor)) {
	//		break;
	//	}
	//}
	
	return lines;
}

module.exports = parse;
