let createJsDoc = require("test/utils/createJsDoc");
let parseIndexMarks = require("test/utils/parseIndexMarks");
let main = require("./main");

main(async function() {
	let {
		string,
		marks,
	} = parseIndexMarks(await platform.fs("test/benchmarks/fixtures/indexCursorConversion/bluebird.js").read());
	
	let doc = createJsDoc(string);
	
	let [[cursor, index]] = Object.entries(marks);
	let [lineIndex, offset] = cursor.split(",").map(Number);
	
	console.time("cursorFromIndex");
	
	for (let i = 0; i < 100; i++) {
		doc.cursorFromIndex(index);
	}
	
	console.timeEnd("cursorFromIndex");
	
	console.time("indexFromCursor");
	
	for (let i = 0; i < 100; i++) {
		doc.indexFromCursor([lineIndex, offset]);
	}
	
	console.timeEnd("indexFromCursor");
});
