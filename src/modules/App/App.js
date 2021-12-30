let bluebird = require("bluebird");

let {remove, moveInPlace} = require("utils/arrayMethods");
let Evented = require("utils/Evented");
let bindFunctions = require("utils/bindFunctions");
let replaceHomeDirWithTilde = require("utils/replaceHomeDirWithTilde");
let promiseWithMethods = require("utils/promiseWithMethods");

let URL = require("modules/URL");
let protocol = require("modules/protocol");
let Document = require("modules/Document");
let Tab = require("modules/Tab");
let Editor = require("modules/Editor");
let View = require("modules/View");
let Project = require("modules/Project");
let generateRequiredLangs = require("modules/utils/generateRequiredLangs");

let FileTree = require("./FileTree");
let Pane = require("./Pane");
let BottomPane = require("./BottomPane");
let FindAndReplace = require("./FindAndReplace");
let openDialogWindow = require("./openDialogWindow");
let functions = require("./functions");

class App extends Evented {
	constructor() {
		super();
		
		this.panes = {
			left: new Pane("left"),
			right: new Pane("right"),
			bottom: new BottomPane(this),
		};
		
		this.bottomPane = this.panes.bottom;
		
		this.fileTree = new FileTree(this);
		
		this.findAndReplace = new FindAndReplace(this);
		
		this.tabs = [];
		this.selectedTab = null;
		this.closedTabs = [];
		this.lastSelectedPath = null;
		this.newFileCountsByLangCode = {};
		
		this.openProjects = [];
		
		this.functions = bindFunctions(this, functions);
		
		this.openDialogWindow = openDialogWindow(this);
		
		this.teardownCallbacks = [
			platform.on("closeWindow", this.onCloseWindow.bind(this)),
			platform.on("openFromElectronSecondInstance", this.onOpenFromElectronSecondInstance.bind(this)),
			...Object.values(this.panes).map(pane => pane.on("show hide resize", () => this.fire("updatePanes"))),
		];
		
		platform.handleIpcMessages("findAndReplace", this.findAndReplace);
		
		// DEV
		setInterval(() => {
			if (platform.getPref("dev.showFocusedElement")) {
				console.log(this.selectedTab.editor.view.focused);
				console.log(document.activeElement);
			}
		}, 1000);
	}
	
	async init() {
		await Promise.all([
			this.loadSessionAndFilesToOpenOnStartup(),
			this.fileTree.init(),
		]);
	}
	
	async save(tab) {
		let {document} = tab.editor;
		
		if (document.isSaved) {
			if (document.fileChangedWhileModified) {
				if (!await platform.confirm(tab.name + " has changed on disk since the last save.  Overwrite current version?")) {
					return;
				}
			}
			
			await document.save();
		} else {
			let dir = platform.systemInfo.homeDir;
			
			if (this.lastSelectedPath) {
				dir = platform.fs(this.lastSelectedPath).parent.path;
			}
			
			let path = await platform.saveAs({
				defaultPath: platform.fs(dir, platform.fs(document.path).name).path,
			});
			
			if (path) {
				await document.saveAs(URL.file(path));
				
				if (this.selectedTab === tab) {
					this.lastSelectedPath = path;
				}
			}
		}
	}
	
	async renameTab(tab) {
		let {url} = tab;
		let oldPath = tab.path;
		
		let path = await platform.saveAs({
			defaultPath: oldPath,
		});
		
		if (path && path !== oldPath) {
			await tab.document.saveAs(URL.file(path));
			await protocol(url).delete();
		}
	}
	
	reorderTab(tab, index) {
		moveInPlace(this.tabs, tab, index);
		
		this.fire("updateTabs");
	}
	
	selectTab(tab) {
		this.selectedTab?.editor.view.hide();
		
		this.selectedTab = tab;
		
		tab.editor.view.show();
		
		this.updateTitle();
		
		if (tab.isSaved) {
			this.lastSelectedPath = tab.path;
		}
		
		this.bottomPane.clippingsEditor.setLang(tab.editor.document.lang);
		
		this.fire("selectTab");
		
		this.focusSelectedTabAsync();
	}
	
	focusSelectedTabAsync() {
		setTimeout(() => {
			this.selectedTab?.editor.view.requestFocus();
		}, 0);
	}
	
	getTabName(tab) {
		return platform.fs(tab.path).name;
	}
	
	getTabLabel(tab) {
		return tab.name + (tab.modified ? " *" : "");
	}
	
	async closeTab(tab, noSave=false) {
		if (tab.modified) {
			let response = await platform.showMessageBox(this, {
				message: "Save changes to " + tab.name + "?",
				buttons: ["%Yes", "%No", "%Cancel"],
			});
			
			if (response === 0) {
				await this.save(tab);
				
				if (!tab.isSaved) {
					return;
				}
			} else if (response !== 1) {
				return;
			}
		}
		
		let selectNext = null;
		
		if (this.selectedTab === tab) {
			let index = this.tabs.indexOf(tab);
			
			if (index > 0) {
				selectNext = this.tabs[index - 1];
			} else if (index < this.tabs.length - 1) {
				selectNext = this.tabs[index + 1];
			}
		}
		
		tab.teardown();
		
		this.tabs = remove(this.tabs, tab);
		
		if (tab.isSaved && !noSave) {
			this.closedTabs.unshift(tab.saveState());
		}
		
		if (tab === this.initialNewFileTab) {
			this.initialNewFileTab = null;
		}
		
		this.fire("updateTabs");
		
		if (selectNext) {
			this.selectTab(selectNext);
		} else {
			if (this.selectedTab === tab) {
				this.selectedTab = null;
			}
			
			this.updateTitle();
		}
	}
	
	async deleteTab(tab) {
		if (!await platform.confirm("Delete " + tab.path + "?")) {
			return;
		}
		
		await protocol(tab.url).delete();
		
		this.closeTab(tab);
	}
	
	urlIsOpen(url) {
		return this.tabs.some(tab => tab.url.toString() === url.toString());
	}
	
	pathIsOpen(path) {
		return this.tabs.some(tab => tab.protocol === "file" && tab.path === path);
	}
	
	showFindBar() {
		this.fire("showFindBar");
	}
	
	hideFindBar() {
		this.fire("hideFindBar");
	}
	
	hideFindBarAndFocusEditor() {
		this.hideFindBar();
		this.selectedTab?.editor.view.requestFocus();
	}
	
	openPath(path, code=null) {
		return this.openFile(URL.file(path), code);
	}
	
	async openFile(url, code=null) {
		let {path} = url;
		
		if (
			this.tabs.length === 1
			&& this.tabs[0] === this.initialNewFileTab
			&& !this.initialNewFileTab.modified
		) {
			this.closeTab(this.initialNewFileTab);
		}
		
		let existingTab = this.findTabByUrl(url);
		
		if (existingTab) {
			this.selectTab(existingTab);
			
			return existingTab;
		}
		
		if (code === null) {
			code = await platform.fs(path).read();
		}
		
		let tab = await this.createTab(code, url);
		
		this.tabs.splice(this.tabs.indexOf(this.selectedTab) + 1, 0, tab);
		
		this.fire("updateTabs");
		
		this.selectTab(tab);
		
		return tab;
	}
	
	async openFilesFromUpload(files) {
		await bluebird.map(files, async ({name, code}) => {
			let path = "/" + name;
			let node = platform.fs(path);
			
			if (await node.exists()) {
				await node.rename(node.basename + "-" + Date.now() + node.extension);
			}
			
			await node.write(code);
			
			await this.openPath(path, code);
		});
	}
	
	async newFile(lang=null) {
		let fileDetails = base.getDefaultFileDetails(lang);
		
		({lang} = fileDetails);
		
		if (!this.newFileCountsByLangCode[lang.code]) {
			this.newFileCountsByLangCode[lang.code] = 0;
		}
		
		let {defaultExtension} = lang;
		let name = lang.name + "-" + (++this.newFileCountsByLangCode[lang.code]) + (defaultExtension ? "." + defaultExtension : "");
		let dir = this.selectedProject?.dirs[0] || null;
		
		let tab = await this.createTab("", URL._new("/" + name), fileDetails);
		
		this.tabs.push(tab);
		
		this.fire("updateTabs");
		
		this.selectTab(tab);
		
		return tab;
	}
	
	async createTab(code, url, fileDetails=null) {
		if (!fileDetails) {
			fileDetails = base.getFileDetails(code, url);
		}
		
		if (fileDetails.hasMixedNewlines) {
			// TODO prompt to change all newlines
			
			throw "File " + url.path + " has mixed newlines";
		}
		
		await bluebird.map([...generateRequiredLangs(fileDetails.lang)], lang => base.initLanguage(lang));
		
		let document = this.createDocument(code, url, fileDetails);
		let view = new View(document);
		let editor = new Editor(document, view);
		let tab = new Tab(this, editor);
		
		editor.on("cut copy", (str) => {
			this.bottomPane.addClipping(str);
		});
		
		await tab.init();
		
		tab.on("focus", this.onTabFocus.bind(this));
		
		return tab;
	}
	
	createDocument(code, url, fileDetails) {
		let document = new Document(code, url, {
			//project: this.selectedProject,
			fileDetails,
		});
		
		for (let event of ["edit", "undo", "redo", "save", "fileChanged"]) {
			document.on(event, (...args) => {
				this.updateTitle();
				
				this.fire("document." + event, document, ...args);
			});
		}
		
		return document;
	}
	
	createEditor() {
		let document = new Document("");
		let view = new View(document);
		
		return new Editor(document, view);
	}
	
	findTabByPath(path) {
		return this.tabs.find(tab => tab.protocol === "file" && tab.path === path);
	}
	
	findTabByUrl(url) {
		return this.tabs.find(tab => tab.url.toString() === url.toString());
	}
	
	selectNextTab(dir) {
		if (!this.selectedTab) {
			return;
		}
		
		let index = this.tabs.indexOf(this.selectedTab);
		let newIndex = index + dir;
		
		if (newIndex === -1) {
			newIndex = this.tabs.length - 1;
		}
		
		if (newIndex === this.tabs.length) {
			newIndex = 0;
		}
		
		this.selectTab(this.tabs[newIndex]);
	}
	
	onOpenFromElectronSecondInstance(files) {
		for (let path of files) {
			this.openPath(path);
		}
	}
	
	updateTitle() {
		let title = "";
		
		if (this.selectedTab) {
			title = this.getTabName(this.selectedTab);
			
			if (this.selectedTab.isSaved) {
				title += " (" + replaceHomeDirWithTilde(platform.fs(this.selectedTab.path).parent.path) + ")";
			}
		}
		
		platform.setTitle(title);
	}
	
	async loadSessionAndFilesToOpenOnStartup() {
		let tabsToOpen = [];
		let fileToSelect;
		
		if (platform.isMainWindow) {
			let session = await platform.jsonStores.session.load();
			
			if (session) {
				tabsToOpen = session.tabs;
				fileToSelect = session.selectedTabUrl;
			}
			
			window.addEventListener("beforeunload", () => {
				this.saveSession();
			});
		}
		
		let filesToOpenOnStartup = platform.getFilesToOpenOnStartup().map(function(path) {
			return {
				isNew: true,
				url: URL.file(path),
			};
		}).filter(({url}) => !tabsToOpen.find(tab => url.toString() === tab.url.toString()));
		
		tabsToOpen.push(...filesToOpenOnStartup);
		
		if (filesToOpenOnStartup.length > 0) {
			fileToSelect = filesToOpenOnStartup[filesToOpenOnStartup.length - 1].url;
		}
		
		this.tabs = await bluebird.map(tabsToOpen, async ({url}) => {
			url = new URL(url);
			
			try {
				return this.createTab(await protocol(url).read(), url);
			} catch (e) {
				console.error(e);
				
				return null;
			}
		}).filter(Boolean);
		
		for (let details of tabsToOpen) {
			if (!details.isNew) {
				this.findTabByUrl(details.url)?.restoreState(details);
			}
		}
		
		if (this.tabs.length > 0) {
			this.selectTab(fileToSelect && this.findTabByUrl(fileToSelect) || this.tabs[this.tabs.length - 1]);
		} else {
			this.initialNewFileTab = await this.newFile();
		}
	}
	
	get selectedProject() {
		return this.selectedTab?.document.project;
	}
	
	async saveSession() {
		let tabs = this.tabs.map(function(tab) {
			return tab.isSaved ? tab.saveState() : null;
		}).filter(Boolean);
		
		await platform.jsonStores.session.save({
			tabs,
			selectedTabUrl: this.selectedTab?.url.toString(),
		});
	}
	
	findInFiles(paths) {
		this.showFindDialog({
			replace: false,
			searchIn: "files",
			paths,
		});
	}
	
	replaceInFiles(paths) {
		this.showFindDialog({
			replace: true,
			searchIn: "files",
			paths,
		});
	}
	
	async showFindDialog(options) {
		let search = "";
		
		if (this.selectedTab) {
			let {editor} = this.selectedTab;
			let {document} = editor;
			let selectedText = editor.getSelectedText();
			
			if (selectedText.indexOf(document.fileDetails.newline) === -1) {
				search = selectedText;
			}
		}
		
		platform.openDialogWindow(this, "findAndReplace", {
			...await this.findAndReplace.loadOptions(),
			search,
			...options,
		}, {
			title: "Find",
			width: 640,
			height: 300,
			fitContents: true,
		});
	}
	
	newSnippet(details={}) {
		platform.openDialogWindow(this, "snippetEditor", {
			id: null,
			details,
		}, {
			title: "New snippet",
			width: 680,
			height: 480,
		});
	}
	
	editSnippet(id) {
		platform.openDialogWindow(this, "snippetEditor", {
			id,
		}, {
			title: "Edit snippet",
			width: 680,
			height: 480,
		});
	}
	
	showMessageBox(options) {
		let promise = promiseWithMethods();
		
		this.openDialogWindow("messageBox", options, {
			width: 500,
			height: 75,
		});
		
		this.messageBoxPromise = promise;
		
		return promise;
	}
	
	messageBoxRespond(response) {
		if (this.messageBoxPromise) {
			this.messageBoxPromise.resolve(response);
		}
		
		delete this.messageBoxPromise;
	}
	
	onTabFocus() {
		this.hideFindBar();
	}
	
	uiMounted(mainDiv) {
		
	}
	
	async onCloseWindow(e) {
		let modifiedTabs = this.tabs.filter(tab => tab.modified);
		
		if (modifiedTabs.length === 0) {
			return;
		}
		
		e.preventDefault();
		
		let tabNames = modifiedTabs.map(tab => tab.name).join(", ");
		
		let response = await platform.showMessageBox(this, {
			message: "Save changes to " + tabNames + "?",
			buttons: ["%Yes", "%No", "%Cancel"],
		});
		
		if (response === 0) {
			for (let tab of modifiedTabs) {
				await this.save(tab);
				
				if (!tab.isSaved) {
					return;
				}
			}
		} else if (response !== 1) {
			return;
		}
		
		platform.closeWindow();
	}
	
	teardown() {
		for (let fn of this.teardownCallbacks) {
			fn();
		}
	}
}

module.exports = App;
