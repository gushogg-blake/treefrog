let astMode = require("./astMode");
let codeIntel = require("./codeIntel");

let wordRe = /\w/;

module.exports = {
	code: "php",
	name: "PHP",
	defaultExtension: "php",
	astMode,
	codeIntel,
	possibleInjections: ["html"],
	
	injections: [
		{
			pattern: "(text) @injectionNode",
			combined: true,
			lang: "html",
		},
	],
	
	isBlock(node) {
		return node.startPosition.row !== node.endPosition.row && [
			
		].includes(node.type);
	},
	
	getFooter(node) {
		let {parent} = node;
		
		if (
			parent
			&& this.isBlock(parent)
			&& node.id === parent.firstChild.id
		) {
			return parent.lastChild;
		}
		
		return null;
	},
	
	getHeader(node) {
		let {parent} = node;
		
		if (
			parent
			&& this.isBlock(parent)
			&& node.id === parent.lastChild.id
		) {
			return parent.firstChild;
		}
		
		return null;
	},
	
	getHiliteClass(node) {
		let {
			type,
			parent,
		} = node;
		
		if ([
			
		].includes(parent?.type)) {
			return null;
		}
		
		if ([
			"$",
			"name",
		].includes(type)) {
			return "id";
		}
		
		if (type === "comment") {
			return "comment";
		}
		
		if (["string", "\""].includes(type)) {
			return "string";
		}
		
		if (type === "integer" || type === "float") {
			return "number";
		}
		
		if (["php_tag", "?>"].includes(type)) {
			return "phpTag";
		}
		
		if (type[0].match(wordRe)) {
			return "keyword";
		}
		
		return "symbol";
	},
	
	getSupportLevel(code, path) {
		if (!path) {
			return null; //
		}
		
		let type = platform.fs(path).lastType;
		
		if ([
			"php",
		].includes(type)) {
			return "general";
		}
		
		return null;
	},
};
