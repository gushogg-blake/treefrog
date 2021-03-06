let regexMatch = require("utils/regexMatch");
let Selection = require("modules/utils/Selection");
let Cursor = require("modules/utils/Cursor");

let {c} = Cursor;

let {
	s,
	sort,
	isFull,
	isMultiline,
} = Selection;

let wordUnderCursorRe = {
	wordChar: /[\w_]/,
	whitespaceChar: /\s/,
	word: /^[\w_]+/,
	whitespace: /^\s+/,
	symbol: /^[^\w\s_]+/,
};

module.exports = {
	isFull() {
		return isFull(this.normalSelection);
	},
	
	isMultiline() {
		return isMultiline(this.normalSelection);
	},
	
	sort() {
		return sort(this.normalSelection);
	},
	
	up() {
		let {start} = sort(this.normalSelection);
		let [startRow, startCol] = this.rowColFromCursor(start);
		
		if (startRow === 0) {
			return s(c(0, 0));
		}
		
		let row = startRow - 1;
		let col = this.selectionEndCol;
		
		return s(this.cursorFromRowCol(row, col));
	},
	
	down() {
		let {end} = sort(this.normalSelection);
		let [endRow, endCol] = this.rowColFromCursor(end);
		
		if (endRow === this.countLineRowsFolded() - 1) {
			return s(c(end.lineIndex, this.lines[end.lineIndex].string.length));
		}
		
		let row = endRow + 1;
		let col = this.selectionEndCol;
		
		return s(this.cursorFromRowCol(row, col));
	},
	
	left() {
		let {start} = sort(this.normalSelection);
		let {lineIndex, offset} = start;
		
		if (this.Selection.isFull()) {
			return s(start);
		}
		
		if (lineIndex === 0 && offset === 0) {
			return this.normalSelection;
		}
		
		if (offset === 0) {
			return s(c(lineIndex - 1, this.lines[lineIndex - 1].string.length));
		}
		
		return s(c(lineIndex, offset - 1));
	},
	
	right() {
		let {end} = sort(this.normalSelection);
		let {lineIndex, offset} = end;
		let line = this.lines[lineIndex];
		
		if (this.Selection.isFull()) {
			return s(end);
		}
		
		if (lineIndex === this.lines.length - 1 && offset === line.string.length) {
			return this.normalSelection;
		}
		
		if (offset === line.string.length) {
			return s(c(lineIndex + 1, 0));
		}
		
		return s(c(lineIndex, offset + 1));
	},
	
	pageUp() {
		let {rows} = this.sizes;
		let {start} = sort(this.normalSelection);
		
		let [startRow, startCol] = this.rowColFromCursor(start);
		
		let row = Math.max(0, startRow - rows);
		let col = this.selectionEndCol;
		
		return s(this.cursorFromRowCol(row, col));
	},
	
	pageDown() {
		let {rows} = this.sizes;
		let {end} = sort(this.normalSelection);
		
		let [endRow, endCol] = this.rowColFromCursor(end);
		
		let row = Math.min(endRow + rows, this.countLineRowsFolded() - 1);
		let col = this.selectionEndCol;
		
		return s(this.cursorFromRowCol(row, col));
	},
	
	home() {
		let {wrappedLines} = this;
		let {start} = sort(this.normalSelection);
		let {lineIndex, offset} = start;
		let [row, col] = this.rowColFromCursor(start);
		let wrappedLine = wrappedLines[lineIndex];
		let {line} = wrappedLine;
		let [lineRowIndex, offsetInRow] = this.lineRowIndexAndOffsetFromCursor(start);
		let {indentCols} = line;
		
		if (wrappedLine.height > 1 && lineRowIndex > 0) {
			if (offsetInRow === 0) {
				let startingRow = this.getLineStartingRow(lineIndex);
				
				return s(this.cursorFromRowCol(startingRow, indentCols));
			} else {
				return s(this.cursorFromRowCol(row, indentCols));
			}
		} else {
			if (col === indentCols) {
				return s(this.cursorFromRowCol(row, 0));
			} else {
				return s(this.cursorFromRowCol(row, indentCols));
			}
		}
	},
	
	end() {
		let {wrappedLines} = this;
		let {end} = sort(this.normalSelection);
		let {lineIndex, offset} = end;
		let wrappedLine = wrappedLines[lineIndex];
		let {line} = wrappedLine;
		let [lineRowIndex, offsetInRow] = this.lineRowIndexAndOffsetFromCursor(end);
		
		if (wrappedLine.height > 1 && lineRowIndex < wrappedLine.height - 1) {
			let lineRow = wrappedLine.lineRows[lineRowIndex];
			
			if (offsetInRow === lineRow.string.length - 1) {
				return s(c(lineIndex, line.string.length));
			} else {
				return s(c(lineIndex, offset + (lineRow.string.length - offsetInRow) - 1));
			}
		} else {
			return s(c(lineIndex, line.string.length));
		}
	},
	
	wordLeft() {
		let {wrappedLines} = this;
		let {lineIndex, offset} = sort(this.normalSelection).start;
		let {line} = wrappedLines[lineIndex];
		
		if (offset === 0) {
			return this.Selection.left();
		} else {
			let stringToCursor = line.string.substr(0, offset).split("").reverse().join("");
			let [whiteSpaceOrWord] = stringToCursor.match(/^\s*(\s+|\w+|[^\w\s]+)/);
			
			return s(c(lineIndex, offset - whiteSpaceOrWord.length));
		}
	},
	
	wordRight() {
		let {wrappedLines} = this;
		let {lineIndex, offset} = sort(this.normalSelection).end;
		let {line} = wrappedLines[lineIndex];
		
		if (offset === line.string.length) {
			return this.Selection.right();
		} else {
			let stringToCursor = line.string.substr(offset);
			let [whiteSpaceOrWord] = stringToCursor.match(/^\s*(\s+|\w+|[^\w\s]+)/);
			
			return s(c(lineIndex, offset + whiteSpaceOrWord.length));
		}
	},
	
	expandOrContractUp() {
		let {start, end} = this.normalSelection;
		let [endRow, endCol] = this.rowColFromCursor(end);
		
		if (endRow === 0) {
			return s(start, c(0, 0));
		}
		
		let row = endRow - 1;
		let col = this.selectionEndCol;
		
		return s(start, this.cursorFromRowCol(row, col));
	},
	
	expandOrContractDown() {
		let {wrappedLines} = this;
		let {start, end} = this.normalSelection;
		let {lineIndex} = end;
		let [endRow, endCol] = this.rowColFromCursor(end);
		
		if (endRow === this.countLineRowsFolded() - 1) {
			return s(start, c(lineIndex, wrappedLines[lineIndex].line.string.length));
		}
		
		let row = endRow + 1;
		let col = this.selectionEndCol;
		
		return s(start, this.cursorFromRowCol(row, col));
	},
	
	expandOrContractLeft() {
		let {wrappedLines} = this;
		let {start, end} = this.normalSelection;
		let {lineIndex, offset} = end;
		
		if (lineIndex === 0 && offset === 0) {
			return this.normalSelection;
		}
		
		if (offset === 0) {
			let prevLine = wrappedLines[lineIndex - 1].line;
			
			return s(start, c(lineIndex - 1, prevLine.string.length));
		}
		
		return s(start, c(lineIndex, offset - 1));
	},
	
	expandOrContractRight() {
		let {wrappedLines} = this;
		let {start, end} = this.normalSelection;
		let {lineIndex, offset} = end;
		let {line} = wrappedLines[lineIndex];
		
		if (lineIndex === wrappedLines.length - 1 && offset === line.string.length) {
			return this.normalSelection;
		}
		
		if (offset === line.string.length) {
			return s(start, c(lineIndex + 1, 0));
		}
		
		return s(start, c(lineIndex, offset + 1));
	},
	
	expandOrContractPageUp() {
		let {rows} = this.sizes;
		let {start, end} = this.normalSelection;
		let [endRow, endCol] = this.rowColFromCursor(end);
		
		let row = Math.max(0, endRow - rows);
		let col = this.selectionEndCol;
		
		return s(start, this.cursorFromRowCol(row, col));
	},
	
	expandOrContractPageDown() {
		let {rows} = this.sizes;
		let {start, end} = this.normalSelection;
		let [endRow, endCol] = this.rowColFromCursor(end);
		
		let row = Math.min(endRow + rows, this.countLineRowsFolded() - 1);
		let col = this.selectionEndCol;
		
		return s(start, this.cursorFromRowCol(row, col));
	},
	
	expandOrContractHome() {
		let {wrappedLines} = this;
		let {start, end} = this.normalSelection;
		let {lineIndex, offset} = end;
		let [row, col] = this.rowColFromCursor(end);
		let wrappedLine = wrappedLines[lineIndex];
		let {line} = wrappedLine;
		let [lineRowIndex, offsetInRow] = this.lineRowIndexAndOffsetFromCursor(end);
		let {indentCols} = line;
		
		if (wrappedLine.height > 1 && lineRowIndex > 0) {
			if (offsetInRow === 0) {
				let startingRow = this.getLineStartingRow(lineIndex);
				
				return s(start, this.cursorFromRowCol(startingRow, indentCols));
			} else {
				return s(start, this.cursorFromRowCol(row, indentCols));
			}
		} else {
			if (col === indentCols) {
				return s(start, this.cursorFromRowCol(row, 0));
			} else {
				return s(start, this.cursorFromRowCol(row, indentCols));
			}
		}
	},
	
	expandOrContractEnd() {
		let {wrappedLines} = this;
		let {start, end} = this.normalSelection;
		let {lineIndex, offset} = end;
		let wrappedLine = wrappedLines[lineIndex];
		let {line} = wrappedLine;
		let [lineRowIndex, offsetInRow] = this.lineRowIndexAndOffsetFromCursor(end);
		
		if (wrappedLine.height > 1 && lineRowIndex < wrappedLine.height - 1) {
			let lineRow = wrappedLine.lineRows[lineRowIndex];
			
			if (offsetInRow === lineRow.string.length - 1) {
				return s(start, c(lineIndex, line.string.length));
			} else {
				return s(start, c(lineIndex, offset + (lineRow.string.length - offsetInRow) - 1));
			}
		} else {
			return s(start, c(lineIndex, line.string.length));
		}
	},
	
	expandOrContractWordLeft() {
		let {wrappedLines} = this;
		let {start, end} = this.normalSelection;
		let {lineIndex, offset} = end;
		let {line} = wrappedLines[lineIndex];
		
		if (offset === 0) {
			return this.Selection.expandOrContractLeft();
		} else {
			let stringToCursor = line.string.substr(0, offset).split("").reverse().join("");
			let [whiteSpaceOrWord] = stringToCursor.match(/^\s*(\s+|\w+|[^\w\s]+)/);
			
			return s(start, c(lineIndex, offset - whiteSpaceOrWord.length));
		}
	},
	
	expandOrContractWordRight() {
		let {wrappedLines} = this;
		let {start, end} = this.normalSelection;
		let {lineIndex, offset} = end;
		let {line} = wrappedLines[lineIndex];
		
		if (offset === line.string.length) {
			return this.Selection.expandOrContractRight();
		} else {
			let stringToCursor = line.string.substr(offset);
			let [whiteSpaceOrWord] = stringToCursor.match(/^\s*(\s+|\w+|[^\w\s]+)/);
			
			return s(start, c(lineIndex, offset + whiteSpaceOrWord.length));
		}
	},
	
	startOfLineContent(lineIndex) {
		return s(Cursor.startOfLineContent(this.wrappedLines, lineIndex));
	},
	
	endOfLineContent(lineIndex) {
		return s(Cursor.endOfLineContent(this.wrappedLines, lineIndex));
	},
	
	wordUnderCursor(cursor) {
		let {wrappedLines} = this;
		let {lineIndex, offset} = cursor;
		let {line} = wrappedLines[lineIndex];
		let {string} = line;
		
		if (string.length === 0) {
			return s(cursor);
		}
		
		if (offset === string.length) {
			offset--;
		}
		
		let ch = string[offset];
		let wordRe;
		
		if (ch.match(wordUnderCursorRe.wordChar)) {
			wordRe = wordUnderCursorRe.word;
		} else if (ch.match(wordUnderCursorRe.whitespaceChar)) {
			wordRe = wordUnderCursorRe.whitespace;
		} else {
			wordRe = wordUnderCursorRe.symbol;
		}
		
		let right = regexMatch(string.substr(offset), wordRe).length;
		let left = regexMatch(string.substr(0, offset).split("").reverse().join(""), wordRe).length;
		
		return s(c(lineIndex, offset - left), c(lineIndex, offset + right));
	},
	
	all() {
		return this.document.selectAll();
	},
	
	validate(selection) {
		let {lines} = this.document;
		let {start, end} = selection;
		let {lineIndex: startLineIndex, offset: startOffset} = start;
		let {lineIndex: endLineIndex, offset: endOffset} = end;
		
		startLineIndex = Math.min(startLineIndex, lines.length - 1);
		startOffset = Math.min(startOffset, lines[startLineIndex].string.length);
		endLineIndex = Math.min(endLineIndex, lines.length - 1);
		endOffset = Math.min(endOffset, lines[endLineIndex].string.length);
		
		return {
			start: {
				lineIndex: startLineIndex,
				offset: startOffset,
			},
			
			end: {
				lineIndex: endLineIndex,
				offset: endOffset,
			},
		};
	},
	
	fromAstSelection(astSelection) {
		let {lines} = this.document;
		
		let endLineIndex = Math.max(astSelection.startLineIndex, astSelection.endLineIndex - 1);
		
		return s(c(astSelection.startLineIndex, 0), c(endLineIndex, lines[endLineIndex].string.length));
	},
};
