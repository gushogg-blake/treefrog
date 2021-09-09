let {is, deep} = require("test/utils/assertions");
let dedent = require("test/utils/dedent");

let next = require("modules/Document/Source/utils/treeSitter/next");
let advanceCursor = require("modules/Document/Source/utils/treeSitter/advanceCursor");

let Document = require("modules/Document");

let findFirstNodeToRender = require("modules/Document/Source/utils/treeSitter/findFirstNodeToRender");
let find = require("modules/Document/Source/utils/treeSitter/findSmallestSubtreeContainingFirstNodeOnLine");

let code = dedent(`
	<!doctype html>
	<html>
		<head>
		</head>
		<body>
			<style type="text/scss">
				div {
					color: red;
				}
			</style>
			<script>
				
			</script>
		</body>
	</html>
`);

let tests = [
	
];

let doc;
let tree;
let rootNode;

describe("findSmallestSubtreeContainingFirstNodeOnLine", function() {
	beforeEach(function() {
		doc = new Document(code, "a.html");
		tree = doc.source.rootScope.tree;
		rootNode = tree.rootNode;
	});
	
	it("init", function() {
		console.log(find(tree, 9));
		
		console.log(findFirstNodeToRender(tree, 9));
	});
});
