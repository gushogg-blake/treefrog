let indentLines = require("../../../utils/indentLines");
let AstSelection = require("../../../utils/AstSelection");
let removeSelection = require("../../common/codeIntel/removeSelection");
let createSpaces = require("../../common/codeIntel/utils/createSpaces");
let findIndentLevel = require("../../common/codeIntel/utils/findIndentLevel");
let findSiblingIndex = require("../../common/codeIntel/utils/findSiblingIndex");
let getOpenersAndClosersOnLine = require("./getOpenersAndClosersOnLine");
let astSelection = require("./astSelection");
let pickOptions = require("./pickOptions");
let dropTargets = require("./dropTargets");
let generatePickOptions = require("./generatePickOptions");
let generateDropTargets = require("./generateDropTargets");

module.exports = {
	pickOptions,
	dropTargets,
	getOpenersAndClosersOnLine,
	astSelection,
	generatePickOptions,
	generateDropTargets,
	
	drop(
		document,
		fromSelection,
		toSelection,
		lines,
		move,
		option,
		target,
	) {
		if (target) {
			return dropTargets[target].handleDrop(
				document,
				fromSelection,
				toSelection,
				lines,
				move,
				option,
			);
		}
		
		let edits = [];
		let newSelection;
		let indentStr = document.fileDetails.indentation.string;
		let [toStart, toEnd] = toSelection;
		
		let insertIndentLevel = findIndentLevel(document.lines, toStart);
		
		if (
			fromSelection
			&& toSelection
			&& AstSelection.isAdjacent(fromSelection, toSelection)
		) { // space from sibling
			// might be better to do nothing here, as this action (space the
			// selection from its sibling) is only available nodes that are
			// already spaced on the other side (because there has to be a space
			// to drag it into)
			
			let [fromStart, fromEnd] = fromSelection;
			let indentLevel = document.lines[fromStart].indentLevel;
			let dir = fromStart < toStart ? -1 : 1;
			let index = fromStart < toStart ? fromStart - 1 : fromEnd;
			let addSpacesAt = fromStart < toStart ? fromStart : fromEnd;
			let siblingIndex = findSiblingIndex(document.lines, index, indentLevel, dir);
			
			if (siblingIndex !== null) {
				let existingSpaces = Math.abs(index - siblingIndex);
				let spaces = (toEnd - toStart) - existingSpaces;
				let adjustSelection = fromStart < toStart ? spaces : 0;
				
				edits.push(document.edit(addSpacesAt, 0, createSpaces(spaces, indentLevel, indentStr)));
				
				newSelection = AstSelection.s(fromStart + adjustSelection, fromEnd + adjustSelection);
			}
		} else {
			if (move && fromSelection) {
				let [fromStart, fromEnd] = fromSelection;
				
				let edit = removeSelection(document, fromSelection);
				
				edits.push(edit);
				
				if (fromEnd < toEnd) {
					let {
						removedLines,
						insertedLines,
					} = edit;
					
					let removeDiff = removedLines.length - insertedLines.length;
					
					toStart -= removeDiff;
					toEnd -= removeDiff;
				}
			}
			
			if (toStart === toEnd) { // insert between lines - no added spaces
				edits.push(document.edit(toStart, 0, indentLines(lines.map(function([indentLevel, line]) {
					return indentStr.repeat(indentLevel) + line;
				}), indentStr, insertIndentLevel)));
				
				newSelection = AstSelection.s(toStart, toStart + lines.length);
			} else { // insert into space
				let spaces = createSpaces(toEnd - toStart, insertIndentLevel, indentStr);
				
				edits.push(document.edit(toEnd, 0, [
					...indentLines(lines.map(function([indentLevel, line]) {
						return indentStr.repeat(indentLevel) + line;
					}), indentStr, insertIndentLevel),
					
					...spaces,
				]));
				
				newSelection = AstSelection.s(toEnd, toEnd + lines.length);
			}
		}
		
		return {
			edits,
			newSelection,
		};
	},
};