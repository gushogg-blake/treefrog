let getLineStartingRow = require("../utils/getLineStartingRow");
let screenCoordsFromRowCol = require("../utils/screenCoordsFromRowCol");
let getLineRangeTotalHeight = require("../utils/getLineRangeTotalHeight");

module.exports = function(
	context,
	lines,
	astSelection,
	scrollPosition,
	prefs,
	measurements,
) {
	context.fillStyle = prefs.astSelectionBackground;
	
	let {colWidth, rowHeight} = measurements;
	let [startLineIndex, endLineIndex] = astSelection;
	let startLine = lines[startLineIndex];
	let startRow = getLineStartingRow(lines, startLineIndex);
	let height = getLineRangeTotalHeight(lines, startLineIndex, endLineIndex) * rowHeight;
	
	let [x, y] = screenCoordsFromRowCol(
		lines,
		startRow,
		startLine.indentLevel * prefs.indentWidth,
		scrollPosition,
		measurements,
	);
	
	context.fillRect(x, y, context.canvas.width, height);
}
