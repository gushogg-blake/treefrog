let findSubtreeContainingFirstNodeOnLine = require("./findSubtreeContainingFirstNodeOnLine");
let findLastChildBeforeLine = require("./findLastChildBeforeLine");
let nodeGetters = require("./nodeGetters");

/*
find the first node either to render or set the colour from when starting at
the given line index.

first we find the smallest node that contains, or is, the first node on the
line.

if the line is blank, this will be a containing node, which could be fairly
large, e.g. a long function.  in this case, if the node has children, we try
to find the last node before the line.  if the node doesn't have children
(e.g. a large string or comment) then we have to just start from the node,
but tree traversal time won't be too badly affected by this as it's just
a single node.
*/

module.exports = function(node, lineIndex) {
	let subtree = findSubtreeContainingFirstNodeOnLine(node, lineIndex);
	
	if (nodeGetters.startPosition(subtree).row < lineIndex) {
		let lastChildBeforeLine = findLastChildBeforeLine(subtree, lineIndex);
		
		if (lastChildBeforeLine) {
			return lastChildBeforeLine;
		}
	}
	
	return subtree;
}
