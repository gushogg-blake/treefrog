let {is, deep} = require("../../../utils/assertions");
let dedent = require("../../../utils/dedent");
let js = require("../../../../src/modules/langs/js");
let Document = require("../../../../src/modules/Document");
let rowColFromCursor = require("../../../../src/modules/utils/rowColFromCursor");

function lines(code) {
	let doc = new Document(dedent(code), js);
	
	doc.parse({
		indentWidth: 4,
	});
	
	return doc.lines;
}

let tests = [
	[
		"0, 0",
		`
			function fn(a) {
				return 123;
			}
		`,
		[0, 0],
		[0, 0],
	],
	[
		"second line",
		`
			function fn(a) {
				return 123;
			}
		`,
		[1, 0],
		[1, 0],
	],
	[
		"mid-line",
		`
			function fn(a) {
				return 123;
			}
		`,
		[0, 8],
		[0, 8],
	],
	[
		"mid-line with tabs",
		`
			asd 	789	hjk
				return 123;
			}
		`,
		[0, 7],
		[0, 10],
	],
	[
		"end of line",
		`
			function fn(a) {
				return 123;
			}
		`,
		[0, 16],
		[0, 16],
	],
	[
		"end of line with tabs",
		`
			asd 	789	hjk
				return 123;
			}
		`,
		[0, 12],
		[0, 15],
	],
];

describe("rowColFromCursor", function() {
	for (let [name, code, cursor, expectedRowCol] of tests) {
		let [lineIndex, offset] = cursor;
		
		it(name, function() {
			deep(rowColFromCursor(lines(code), lineIndex, offset), expectedRowCol);
		});
	}
});
