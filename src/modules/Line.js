let expandTabs = require("./utils/string/expandTabs");
let getIndentLevel = require("./langs/common/utils/getIndentLevel");

class Line {
	constructor(string, fileDetails, startIndex) {
		let {
			level: indentLevel,
			cols: indentCols,
		} = getIndentLevel(string, fileDetails.indentation);
		
		let {
			tabWidth,
		} = app.prefs;
		
		let withTabsExpanded = expandTabs(string, tabWidth);
		
		// NOTE withTabsExpanded probs not that useful in general as hard to
		// calculate indexes...
		// NOTE might also be good to calculate it on the fly to avoid having
		// to recreate lines if tab width changes
		
		let splitByTabs = string.split("\t");
		let variableWidthParts = [];
		
		for (let i = 0; i < splitByTabs.length; i++) {
			let str = splitByTabs[i];
			
			variableWidthParts.push(["string", str]);
			
			if (i < splitByTabs.length - 1) {
				variableWidthParts.push(["tab", tabWidth - str.length % tabWidth]);
			}
		}
		
		Object.assign(this, {
			startIndex,
			string,
			trimmed: string.trimLeft(),
			variableWidthParts,
			//withTabsExpanded,
			renderHints: [],
			openers: [],
			closers: [],
			width: withTabsExpanded.length,
			indentLevel,
			indentCols,
		});
	}
}

module.exports = Line;
