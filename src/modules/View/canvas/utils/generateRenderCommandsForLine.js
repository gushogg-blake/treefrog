/*
generate a set of rendering commands based on the line string, tabs (which
have to be handled specially because they're variable width -- hence
variableWidthParts), and any hints provided by the language.

Hints are e.g. "nodes", indicating that a particular range of text contains
a discrete syntax node that doesn't span multiple wrappedLines and can all be
rendered a particular colour; or "colour" hints, indicating that following
text should be rendered a particular colour (e.g. "comment").

Ranges of text that aren't covered by hints are rendered in whatever colour
was last used, which will be set by the previous "node" or "colour" command.

("Hint" is probably too soft a word as the combination of hints and non-hint
ranges are the fundamental components of the line as far as rendering is
concerned.)
*/

module.exports = function*(line, lineRow) {
	let stringStartOffset = lineRow.startOffset;
	let offset = stringStartOffset;
	let hintIndex = 0;
	
	while (
		line.renderHints[hintIndex]
		&& line.renderHints[hintIndex].offset < lineRow.startOffset
	) {
		hintIndex++;
	}
	
	for (let [type, value] of lineRow.variableWidthParts) {
		if (type === "string") {
			let string = value;
			
			while (true) {
				/*
				1. render any misc text between the current offset
				and either the next hint or the end of the string
				*/
				
				let nextHint = line.renderHints[hintIndex];
				
				if (nextHint && nextHint.offset >= stringStartOffset + string.length) {
					// next hint is not within the current substring, so ignore
					
					nextHint = null;
				}
				
				if (!nextHint && offset - stringStartOffset < string.length) {
					let str = string.substr(offset - stringStartOffset);
					
					yield {
						type: "string",
						string: str,
					};
					
					offset += str.length;
				}
				
				if (nextHint && nextHint.offset > offset) {
					let str = string.substring(offset - stringStartOffset, nextHint.offset - stringStartOffset);
					
					yield {
						type: "string",
						string: str,
					};
					
					offset += str.length;
				}
				
				/*
				2. render the next hint
				*/
				
				/*
				NOTE logically this should be nextHint.offset === offset, as the
				hint offsets should match where we are in the line, (ie. after
				parsing a combination of hints, strings, and tabs, the next hint's
				offset should always be the number of chars encountered up to now)
				but because of parse errors we can get characters counted twice,
				e.g. with an empty script tag we see "<" and then "</" at the same
				offset for the closing tag.  by checking nextHint.offset <= offset,
				we make sure not to skip any hints when the offset doesn't match
				(ie. in the case above, the < will increase the offset erroneously,
				so the </ will be missed).
				
				this means that the renderer has to accept hints that start before
				the current offset and "rewind" to correct for them.
				*/
				
				while (nextHint && nextHint.offset <= offset) {
					if (nextHint.type === "node") {
						let {node} = nextHint;
						let newOffset = node.startPosition.column + node.text.length;
						
						if (newOffset > stringStartOffset + string.length) {
							break;
						}
						
						yield nextHint;
						
						offset = newOffset;
					} else if (nextHint.type === "colour") {
						yield nextHint;
					} else if (nextHint.type === "parseError") {
						yield nextHint;
					}
					
					hintIndex++;
					nextHint = line.renderHints[hintIndex];
				}
				
				if (offset === stringStartOffset + string.length) {
					break;
				}
			}
			
			stringStartOffset += string.length;
		} else if (type === "tab") {
			yield {
				type,
				width: value,
			};
			
			offset++;
			stringStartOffset++;
		}
	}
}
