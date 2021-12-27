let {on, off} = require("utils/dom/domEvents");
let Selection = require("modules/utils/Selection");
let autoScroll = require("./utils/autoScroll");
let {getCursor, getCharCursor} = require("./utils/cursorFromEvent");

module.exports = function(editor, editorComponent) {
	let {document, view} = editor;
	let drawingSelection = false;
	
	function mousedown(e, enableDrag) {
		if (e.button === 2) {
			return;
		}
		
		let {
			canvasDiv,
			showingHorizontalScrollbar,
		} = editorComponent;
		
		let cursor = getCursor(e, view, canvasDiv);
		let charCursor = getCharCursor(e, view, canvasDiv);
		
		let {
			x: left,
			y: top,
		} = canvasDiv.getBoundingClientRect();
		
		let x = e.clientX - left;
		let y = e.clientY - top;
		
		if (e.button === 1) {
			editor.normalMouse.insertSelectionClipboard(cursor);
			
			return;
		}
		
		autoScroll(
			canvasDiv,
			view,
			showingHorizontalScrollbar,
		);
		
		if (Selection.charIsWithinSelection(view.normalSelection, charCursor)) {
			if (e.button === 0) {
				mousedownInSelection(e, enableDrag);
			}
			
			return;
		}
		
		editor.normalMouse.setSelectionAndStartCursorBlink(Selection.s(cursor));
		
		drawingSelection = true;
		
		on(window, "mousemove", drawSelection);
		on(window, "mouseup", mouseup);
		on(window, "dragend", dragend);
	}
	
	function mousedownInSelection(e, enableDrag) {
		if (e.button === 0) {
			enableDrag();
		}
	}
	
	function drawSelection(e) {
		let cursor = getCursor(e, view, editorComponent.canvasDiv);
		
		editor.normalMouse.drawSelection({
			start: view.normalSelection.start,
			end: cursor,
		});
	}
	
	function mousemove(e) {
		if (drawingSelection) {
			return;
		}
	}
	
	function mouseup(e) {
		if (view.Selection.isFull()) {
			editor.normalMouse.setSelectionClipboard();
			editor.normalMouse.finishDrawingSelection();
		}
		
		editorComponent.mouseup(e);
		
		drawingSelection = false;
		
		off(window, "mousemove", drawSelection);
		off(window, "mouseup", mouseup);
		off(window, "dragend", dragend);
	}
	
	function mouseenter() {
		
	}
	
	function mouseleave(e) {
		
	}
	
	function click(e) {
		if (e.button !== 0) {
			return;
		}
		
		let cursor = getCursor(e, view, editorComponent.canvasDiv);
		
		editor.normalMouse.setSelectionAndStartCursorBlink(Selection.s(cursor));
	}
	
	function dblclick(e) {
		let cursor = getCharCursor(e, view, editorComponent.canvasDiv);
		
		editor.normalMouse.setSelectionAndStartCursorBlink(view.Selection.wordUnderCursor(cursor));
		
		if (view.Selection.isFull()) {
			platform.clipboard.writeSelection(editor.getSelectedText());
		}
	}
	
	function dragstart(e) {
		let {
			normalSelection: selection,
		} = view;
		
		e.dataTransfer.setData("text/plain", document.getSelectedText(selection));
	}
	
	function dragover(e) {
		if (!e.dataTransfer.types.includes("text/plain")) {
			return;
		}
		
		let cursor = getCursor(e, view, editorComponent.canvasDiv);
		
		view.setInsertCursor(cursor);
	}
	
	function dragenter(e) {
		
	}
	
	function dragleave(e) {
		view.setInsertCursor(null);
	}
	
	function drop(e, fromUs, toUs, extra) {
		if (!e.dataTransfer.types.includes("text/plain")) {
			return;
		}
		
		let str = e.dataTransfer.getData("text/plain");
		
		if (!str) {
			return;
		}
		
		let cursor = getCursor(e, view, editorComponent.canvasDiv);
		let move = !e.ctrlKey;
		
		e.dataTransfer.dropEffect = move ? "move" : "copy";
		
		editor.normalMouse.drop(cursor, str, move, fromUs, toUs);
	}
	
	function dragend() {
		view.setInsertCursor(null);
		
		mouseup();
	}
	
	return {
		mousedown,
		mousemove,
		mouseenter,
		mouseleave,
		click,
		dblclick,
		dragstart,
		dragover,
		dragenter,
		dragleave,
		drop,
		dragend,
	};
}
