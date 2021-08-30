let {ipcRenderer} = require("electron");

module.exports = {
	showSave(options) {
		return ipcRenderer.invoke("dialog/showSave", options);
	},
	
	showOpen(options) {
		return ipcRenderer.invoke("dialog/showOpen", options);
	},
	
	showMessageBox(options) {
		return ipcRenderer.invoke("dialog/showMessageBox", options);
	},
}
