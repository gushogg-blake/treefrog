let inlineStyle = require("utils/dom/inlineStyle");
let {on, off} = require("utils/dom/domEvents");
let screenOffsets = require("utils/dom/screenOffsets");

module.exports = function(app, items, coords, noCancel=false) {
	if (items.length === 0) {
		return;
	}
	
	let {x, y} = coords;
	
	let overlay = document.createElement("div");
	let container = document.createElement("div");
	
	app.mainDiv.appendChild(overlay);
	overlay.appendChild(container);
	
	container.tabIndex = "1";
	
	overlay.style = inlineStyle({
		position: "fixed",
		zIndex: 100,
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	});
	
	container.style = inlineStyle({
		position: "absolute",
		top: y,
		left: x,
		userSelect: "none",
	});
	
	let contextMenu = new base.components.ContextMenu({
		target: container,
		
		props: {
			items,
		},
	});
	
	let {activeElement: previousActiveElement} = document;
	
	setTimeout(function() {
		container.focus();
	}, 0);
	
	function click(item) {
		item.onClick();
		
		close();
	}
	
	function close() {
		contextMenu.$destroy();
		
		overlay.parentNode.removeChild(overlay);
		
		setTimeout(function() {
			previousActiveElement.focus();
		}, 0);
		
		off(overlay, "mousedown", close);
		off(window, "blur", close);
		off(container, "keydown", keydown);
	}
	
	contextMenu.$on("click", function({detail: item}) {
		click(item);
	});
	
	function keydown(e) {
		e.preventDefault();
		
		if (e.key === "Escape" && !noCancel) {
			close();
			
			return;
		}
		
		for (let item of items) {
			if (item.label.toLowerCase().indexOf("%" + e.key.toLowerCase()) !== -1) {
				click(item);
				
				return;
			}
		}
	}
	
	let {right, bottom} = screenOffsets(container);
	
	if (right < 0) {
		container.style.left = (x - -right) + "px";
	}
	
	if (bottom < 0) {
		container.style.top = (y - -bottom) + "px";
	}
	
	on(container, "mousedown", function(e) {
		e.stopPropagation();
	});
	
	on(overlay, "mousedown", close);
	on(window, "blur", close);
	on(container, "keydown", keydown);
}
