let topMargin = require("../topMargin");
let calculateMarginOffset = require("./calculateMarginOffset");

let coordsXHint = 2;

module.exports = function(
	lines,
	x,
	y,
	scrollPosition,
	measurements,
) {
	let {
		rowHeight,
		colWidth,
	} = measurements;
	
	let marginOffset = calculateMarginOffset(lines, measurements);
	
	let screenCol = Math.floor((x - marginOffset + coordsXHint + scrollPosition.x) / colWidth);
	let screenRow = Math.floor((y - topMargin) / rowHeight) + scrollPosition.row;
	
	return [
		Math.max(0, screenRow),
		Math.max(0, screenCol),
	];
}
