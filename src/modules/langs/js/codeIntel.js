function astSelectionFromLineIndex(lines, lineIndex) {
	// if single line, then just that line
	// if header (or footer?), then whole element
	// poss edge cases for multi-line headers - we can have footers that are part of headers.
	
	let line = lines[lineIndex];
	
	/*
	will probs need to keep track of each line's openers and closers to identify
	types of header/footer.  e.g. ) { is a multiline header footer, } else { is a
	ladder header/footer.
	
	can just keep track of it by keeping a list of openers and closers.  if we
	encounter a } and we have a corresponding opener (most recent opener matches),
	they cancel each other out, otherwise the } is a closer.  when we encounter a {,
	it is added as an opener.  we are probably only interested in the first opener
	and the last closer.
	
	use openers and closers (instead of indentation) to identify headers & footers?
	probs easier for the edge cases
	*/
	
	if (isMultilineHeaderHeader(lines, lineIndex)) {
		// expand to whole header and immediate footer
	} else if (isMultilineHeaderFooter(lines, lineIndex)) {
		// expand to whole header and immediate footer
	} else if (isHeader(lines, lineIndex)) {
		// may also be footer in ladder
		// expand to direct footer
	} else if (isFooter(lines, lineIndex)) {
		// expand to direct header
	} else {
		// just the line
	}
}

/*
findHeaderLineIndex - find the index of the line that's the header to the current
line.

if the header is also a footer (e.g. } else {) then find the header of that line,
and so on.
*/

function findHeaderLineIndex(lines, lineIndex) {
	let fromLine = lines[lineIndex];
	let i = lineIndex - 1;
	let encounteredNonEmptyLine = false;
	
	while (true) {
		if (i < 0) {
			return null;
		}
		
		let line = lines[i];
		
		if (line.string.length > 0) {
			if (
				fromLine.trimmed[0] === "}"
				&& !encounteredNonEmptyLine
				&& line.indentLevel === fromLine.indentLevel
			) {
				return i;
			}
			
			encounteredNonEmptyLine = true;
			
			if (line.indentLevel === fromLine.indentLevel - 1) {
				if (isFooter(lines, i)) {
					return findHeaderLineIndex(lines, i - 1);
				} else {
					return i;
				}
			}
		}
		
		i--;
	}
}

/*
findFooterLineIndex - find the index of the line that's the footer to the current
line.

if the footer is also a header (e.g. } else {) then find the footer of that line,
and so on.
*/

function findFooterLineIndex(lines, lineIndex) {
	let fromLine = lines[lineIndex];
	let i = lineIndex + 1;
	let encounteredNonEmptyLine = false;
	
	while (true) {
		if (i === lines.length) {
			return null;
		}
		
		let line = lines[i];
		
		if (line.string.length > 0) {
			if (
				!encounteredNonEmptyLine
				&& line.trimmed[0] === "}"
				&& line.indentLevel === fromLine.indentLevel
			) {
				return i;
			}
			
			encounteredNonEmptyLine = true;
			
			if (line.indentLevel === fromLine.indentLevel - 1) {
				if (isHeader(lines, i)) {
					return findFooterLineIndex(lines, i + 1);
				} else {
					return i;
				}
			}
		}
		
		i++;
	}
}

/*
NOTE isHeader and isFooter can't be used for autoindent after typing e.g. opening
brace - they tell whether a line is a header/footer with existing inner lines
*/

function isHeader(lines, lineIndex) {
	let i = lineIndex + 1;
	
	while (true) {
		if (i === lines.length) {
			return false;
		}
		
		let line = lines[i];
		
		if (line.string.length > 0) {
			return line.indentLevel === lines[lineIndex].indentLevel + 1;
		}
		
		i++;
	}
}

function isFooter(lines, lineIndex) {
	let i = lineIndex - 1;
	
	while (true) {
		if (i < 0) {
			return false;
		}
		
		let line = lines[i];
		
		if (line.string.length > 0) {
			return line.indentLevel === lines[lineIndex].indentLevel + 1;
		}
		
		i--;
	}
}

function findNextNonEmptyLineIndex(lines, lineIndex, dir) {
	let i = lineIndex + dir;
	
	while (true) {
		if (i < 0 || i === lines.length) {
			return null;
		}
		
		let line = lines[i];
		
		if (line.string.trim().length > 0) {
			return i;
		}
		
		i += dir;
	}
}

/*
3 types of thing - headers, header-footers, and normal lines

(if there is nothing on the line, then we get a 0-length selection before/after that line
(after the prev element)
*/

module.exports =  {
	astSelectionFromLineIndex,
};