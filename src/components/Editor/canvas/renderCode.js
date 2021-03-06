module.exports = function(layers, view) {
	let {
		fontFamily,
		fontSize,
		marginBackground,
		lineNumberColor,
		defaultColor,
	} = base.theme.editor;
	
	let {
		sizes,
		measurements,
		scrollPosition,
	} = view;
	
	let {
		colWidth,
		rowHeight,
	} = measurements;
	
	let {
		codeWidth,
		topMargin,
		marginWidth,
		marginOffset,
	} = sizes;
	
	let context = layers.code;
	
	context.font = fontSize + "px " + fontFamily;
	context.fillStyle = defaultColor;
	
	let leftEdge = marginOffset - scrollPosition.x;
	let rowOffset = -(scrollPosition.y % rowHeight);
	
	let x;
	let y = rowHeight + topMargin + rowOffset; // rowHeight added as using textBaseline="bottom"
	
	return {
		setColor(color) {
			context.fillStyle = color;
		},
		
		startRow(wrapIndentCols) {
			x = leftEdge + wrapIndentCols * colWidth;
		},
		
		endRow() {
			y += rowHeight;
		},
		
		drawTab(width) {
			x += width * colWidth;
		},
		
		drawText(string) {
			context.fillText(string, x, y);
			
			x += string.length * colWidth;
		},
	};
}
