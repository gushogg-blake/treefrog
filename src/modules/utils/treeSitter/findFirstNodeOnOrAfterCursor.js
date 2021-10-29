let middle = require("utils/middle");
let nodeGetters = require("./nodeGetters");

function isOnOrAfter(node, cursor) {
	let {row, column} = nodeGetters.startPosition(node);
	
	return (
		row > cursor.lineIndex
		|| row === cursor.lineIndex && column >= cursor.offset
	);
}

function endsAfter(node, cursor) {
	let {row, column} = nodeGetters.endPosition(node);
	
	return (
		row > cursor.lineIndex
		|| row === cursor.lineIndex && column > cursor.offset
	);
}

module.exports = function(node, cursor) {
	if (isOnOrAfter(node, cursor)) {
		return node;
	}
	
	let children = nodeGetters.children(node);
	let startIndex = 0;
	let endIndex = children.length;
	let first = null;
	
	while (true) {
		if (endIndex - startIndex === 0) {
			break;
		}
		
		let index = middle(startIndex, endIndex);
		let child = children[index];
		
		if (isOnOrAfter(child, cursor)) {
			first = child;
			endIndex = index;
			
			if (endIndex === 0) {
				break;
			}
		} else if (endsAfter(child, cursor) && nodeGetters.children(child).length > 0) {
			node = child;
			children = nodeGetters.children(node);
			startIndex = 0;
			endIndex = children.length;
		} else {
			startIndex = index + 1;
			
			if (startIndex === children.length) {
				break;
			}
		}
	}
	
	return first;
}
