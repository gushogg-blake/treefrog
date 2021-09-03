let advanceCursor = require("./utils/treeSitter/advanceCursor");
let rangeToTreeSitterRange = require("./utils/treeSitter/rangeToTreeSitterRange");
let treeSitterRangeToRange = require("./utils/treeSitter/treeSitterRangeToRange");
let cursorToTreeSitterPoint = require("./utils/treeSitter/cursorToTreeSitterPoint");

module.exports = class LangRange {
	constructor(lang, code, range) {
		this.lang = lang;
		this.code = code;
		this.range = range;
		this.treeSitterRange = rangeToTreeSitterRange(range);
		
		this.langRanges = [];
		this.langRangesByCursor = {};
		this.langRangesByNode = {};
		
		this.parse();
	}
	
	parse() {
		let parser = new TreeSitter();
		
		parser.setLanguage(base.getTreeSitterLanguage(this.lang.code));
		
		this.tree = parser.parse(this.code, null, {
			includedRanges: [this.treeSitterRange],
		});   
		
		let cursor = this.tree.walk();
		
		while (true) {
			let node = cursor.currentNode();
			let injectionLang = this.getInjectionLang(node);
			
			if (injectionLang) {
				let langRange = new LangRange(injectionLang, this.code, treeSitterRangeToRange(node));
				
				this.langRanges.push(langRange);
				this.langRangesByCursor[node.startPosition.row + "," + node.startPosition.column] = langRange;
				this.langRangesByNode[node.id] = langRange;
			}
			
			if (!advanceCursor(cursor)) {
				break;
			}
		}
	}
	
	edit(edit, index, newRange, code) {
		let {
			selection,
			newSelection,
			string,
			replaceWith,
		} = edit;
		
		this.code = code;
		
		//
		this.langRanges = [];
		this.langRangesByCursor = {};
		this.langRangesByNode = {};
		
		this.range = newRange;
		this.treeSitterRange = rangeToTreeSitterRange(this.range);
		
		this.parse();
		//
		
		/*
		surgically editing child ranges can be done in two general steps:
		
			- for each child range, if the edit starts and ends before the
			  range, starts within the range, or starts after the range,
			  save the range, indexed by its start cursor
			
			- when going through the new tree, check whether nodes match
			  saved child ranges by checking the lang and the start cursor
			  (with the old start cursor adjusted for the edit)
		
		this way there are a few scenarios where we can save and edit child
		ranges instead of recreating them:
		
			- if html is edited entirely above a <script> tag, its start
			  cursor can be adjusted, and when we process the new tree,
			  we'll come to a javascript injection node that has a matching
			  start cursor
			
			- if html is edited below a <script> tag, the same as above,
			  except the start cursor won't even need adjusting
			
			- if javascript is edited within a <script> tag, the injection
			  node's range may be different - e.g. if a </script> tag is
			  added - but this shouldn't matter as we'll pass the new
			  range in includedRanges
		
		we may even be able to save ranges in the case of overlapping edits:
		
			- if the edit overlaps the top, there may not be a matching
			  injection node any more, in which case we just won't use
			  the saved range
			
			- if the edit overlaps the bottom, there probably will be a
			  matching range in the new code, and we'll just update the
			  range
			
			- if the edit entirely encloses the range, it may be e.g. a
			  paste that happens to contain a new <script> tag - but if
			  not then as with a top-overlap, we can just not use the range
			  (in this case the start cursor would need to be the same as
			  in the old code in order to identify it)
		*/
		
		//let parser = new TreeSitter();
		//
		//parser.setLanguage(base.getTreeSitterLanguage(this.lang.code));
		//
		//this.tree.edit({
		//	startPosition: cursorToTreeSitterPoint(selection.start),
		//	startIndex: index,
		//	oldEndPosition: cursorToTreeSitterPoint(selection.end),
		//	oldEndIndex: index + string.length,
		//	newEndPosition: cursorToTreeSitterPoint(newSelection.end),
		//	newEndIndex: index + replaceWith.length,
		//});
		//
		//this.tree = parser.parse(this.code, this.tree, {
		//	includedRanges: [this.treeSitterRange],
		//});
		
		
	}
	
	decorateLines(lines) {
		console.time("decorateLines (" + this.lang.code + ")");
		let {lang} = this;
		let cursor = this.tree.walk();
		
		while (true) {
			let node = cursor.currentNode();
			
			if (node.equals(this.tree.rootNode)) {
				if (!advanceCursor(cursor)) {
					break;
				}
				
				continue;
			}
			
			let line = lines[node.startPosition.row];
			
			line.nodes.push(node);
			
			let openerAndCloser = this.getOpenerAndCloser(node);
			let childRange = this.langRangesByNode[node.id];
			
			line.renderHints.push(...this.getRenderHints(node));
			
			if (openerAndCloser) {
				let {opener, closer} = openerAndCloser;
				
				lines[opener.startPosition.row].openers.push({
					lang,
					node: opener,
				});
				
				lines[closer.startPosition.row].closers.unshift({
					lang,
					node: closer,
				});
			}
			
			if (childRange) {
				childRange.decorateLines(lines);
			}
			
			if (!advanceCursor(cursor)) {
				break;
			}
		}
		console.timeEnd("decorateLines (" + this.lang.code + ")");
	}
	
	getRenderHints(node) {
		if (node.type === "ERROR") {
			return [{
				type: "parseError",
				offset: node.startPosition.column,
				lang: this.lang,
				node,
			}];
		}
		
		return this.lang.generateRenderHints(node);
	}
	
	getOpenerAndCloser(node) {
		if (node.type === "ERROR" || node.startPosition.row === node.endPosition.row) {
			return null;
		}
		
		return this.lang.getOpenerAndCloser(node);
	}
	
	getInjectionLang(node) {
		if (node.text.length === 0) {
			return null;
		}
		
		let injectionLangCode = this.lang.getInjectionLang(node);
			
		if (!injectionLangCode) {
			return null;
		}
		
		return base.langs.get(injectionLangCode);
	}
}
