let Selection = require("../../utils/Selection");
let rowColFromCursor = require("../../utils/rowColFromCursor");
let getLineStartingRow = require("./getLineStartingRow");
let screenCoordsFromCursor = require("./screenCoordsFromCursor");
let screenCoordsFromRowCol = require("./screenCoordsFromRowCol");

module.exports = function(
	lines,
	selection,
	scrollPosition,
	measurements,
) {
	let regions = [];
	
	let {colWidth, rowHeight} = measurements;
	let {start, end} = Selection.sort(selection);
	let [startLineIndex, startOffset] = start;
	let [endLineIndex, endOffset] = end;
	
	let [startRow, startCol] = rowColFromCursor(lines, startLineIndex, startOffset);
	let [endRow, endCol] = rowColFromCursor(lines, endLineIndex, endOffset);
	
	let row = startRow;
	let col = startCol;
	
	let lineStartingRow = getLineStartingRow(lines, startLineIndex);
	let innerLineIndex = startRow - lineStartingRow;
	
	let startScreenRow = startRow - scrollPosition.row;
	
	for (let i = startLineIndex; i <= endLineIndex; i++) {
		let line = lines[i];
		
		for (let j = 0; j < line.height; j++) {
			if (i === startLineIndex && j < innerLineIndex) {
				continue;
			}
			
			if (startRow === endRow) {
				// single-line selection
				
				let [x, y] = screenCoordsFromRowCol(
					lines,
					startRow,
					startCol,
					scrollPosition,
					measurements,
				);
				
				let width = endCol - startCol;
				
				regions.push([x, y, width * colWidth, rowHeight]);
				
				break;
			}
			
			if (row === endRow) {
				// last row of multi-line selection
				// highlight beginning of line to end col
				
				let [x, y] = screenCoordsFromRowCol(
					lines,
					row,
					0,
					scrollPosition,
					measurements,
				);
				
				let width = endCol;
				
				regions.push([x, y, width * colWidth, rowHeight]);
				
				break;
			}
			
			if (row === startRow) {
				// first row of multi-line selection
				// highlight start col to end of line, plus 1 for the newline
				
				let [x, y] = screenCoordsFromRowCol(
					lines,
					startRow,
					startCol,
					scrollPosition,
					measurements,
				);
				
				let width = (
					line.height > 1
					? line.wrappedLines[j].width + (j > 0 ? line.indentCols : 0)
					: line.width
				) - startCol + 1;
				
				regions.push([x, y, width * colWidth, rowHeight]);
			}
			
			if (row !== startRow && row !== endRow) {
				// inner row of multi-line selection
				// highlight whole line plus 1 for the newline at the end
				
				let [x, y] = screenCoordsFromRowCol(
					lines,
					row,
					0,
					scrollPosition,
					measurements,
				);
				
				let width = (
					line.height > 1
					? line.wrappedLines[j].width
					: line.width
				) + 1;
				
				if (j > 0) {
					width += line.indentCols;
				}
				
				regions.push([x, y, width * colWidth, rowHeight]);
			}
			
			row++;
		}
	}
	
	return regions;
}