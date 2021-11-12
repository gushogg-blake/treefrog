let bluebird = require("bluebird");
let findAndReplace = require("modules/findAndReplace");
let Document = require("modules/Document");
let URL = require("modules/URL");
let {FileIsBinary} = require("modules/errors");
let getPaths = require("./getPaths");
let getFindAndReplaceOptions = require("./getFindAndReplaceOptions");
let Session = require("./Session");

async function getDocuments(paths) {
	return bluebird.map(paths, async function(path) {
		try {
			let code = await platform.fs(path).read();
			
			return new Document(code, URL.file(path), {
				noParse: true,
			});
		} catch (e) {
			if (e instanceof FileIsBinary) {
				console.info("Skipping binary file " + path);
			} else {
				console.error(e);
			}
			
			return null;
		}
	}).filter(Boolean);
}

class FindAndReplace {
	constructor(app) {
		this.app = app;
		this.session = null;
		
		this.loadOptions(); // cache saved options
	}
	
	init() {
		this.session = null;
	}
	
	useExistingSession(options) {
		return this.session && JSON.stringify(this.session.options) === JSON.stringify(options);
	}
	
	findAllInCurrentDocument(options) {
		let results = this.app.selectedTab.editor.api.findAll(getFindAndReplaceOptions(options));
		
		if (results.length > 0) {
			this.app.bottomPane.showFindResults(options, results);
			
			return true;
		} else {
			return false;
		}
	}
	
	findAllInSelectedText(options) {
		let results = this.app.selectedTab.editor.api.findAllInSelectedText(getFindAndReplaceOptions(options));
		
		if (results.length > 0) {
			this.app.bottomPane.showFindResults(options, results);
			
			return true;
		} else {
			return false;
		}
	}
	
	findAllInOpenFiles(options) {
		let results = [];
		
		for (let tab of this.app.tabs) {
			results = [...results, ...tab.editor.api.findAll(getFindAndReplaceOptions(options))];
		}
		
		if (results.length > 0) {
			this.app.bottomPane.showFindResults(options, results);
			
			return true;
		} else {
			return false;
		}
	}
	
	async findAllInFiles(options) {
		let {app} = this;
		let paths = await getPaths(options);
		let openPaths = paths.filter(path => app.pathIsOpen(path));
		let nonOpenPaths = paths.filter(path => !app.pathIsOpen(path));
		let openTabs = openPaths.map(path => app.findTabByPath(path));
		let nonOpenDocuments = await getDocuments(nonOpenPaths);
		let findAndReplaceOptions = getFindAndReplaceOptions(options);
		
		let allResults = [];
		
		for (let document of nonOpenDocuments) {
			allResults = [...allResults, ...document.findAll(findAndReplaceOptions)];
		}
		
		for (let tab of openTabs) {
			allResults = [...allResults, ...tab.editor.api.findAll(findAndReplaceOptions)];
		}
		
		if (allResults.length > 0) {
			app.bottomPane.showFindResults(options, allResults);
			
			return true;
		} else {
			return false;
		}
	}
	
	replaceAllInCurrentDocument(options) {
		let results = this.app.selectedTab.editor.api.replaceAll(getFindAndReplaceOptions(options));
		
		if (results.length > 0) {
			if (options.showResults) {
				this.app.bottomPane.showFindResults(options, results);
			}
			
			return true;
		} else {
			return false;
		}
	}
	
	replaceAllInSelectedText(options) {
		let results = this.app.selectedTab.editor.api.replaceAllInSelectedText(getFindAndReplaceOptions(options));
		
		if (results.length > 0) {
			if (options.showResults) {
				this.app.bottomPane.showFindResults(options, results);
			}
			
			return true;
		} else {
			return false;
		}
	}
	
	replaceAllInOpenFiles(options) {
		let results = [];
		
		for (let tab of this.app.tabs) {
			results = [...results, ...tab.editor.api.replaceAll(getFindAndReplaceOptions(options))];
		}
		
		if (results.length > 0) {
			if (options.showResults) {
				this.app.bottomPane.showFindResults(options, results);
			}
			
			return true;
		} else {
			return false;
		}
	}
	
	async replaceAllInFiles(options) {
		let {app} = this;
		let paths = await getPaths(options);
		let openPaths = paths.filter(path => app.pathIsOpen(path));
		let nonOpenPaths = paths.filter(path => !app.pathIsOpen(path));
		let openTabs = openPaths.map(path => app.findTabByPath(path));
		let nonOpenDocuments = await getDocuments(nonOpenPaths);
		let findAndReplaceOptions = getFindAndReplaceOptions(options);
		
		let allResults = [];
		
		await bluebird.map(nonOpenDocuments, async function(document) {
			let {edits, results} = document.replaceAll(findAndReplaceOptions);
			
			document.applyEdits(edits);
			
			await document.save();
			
			allResults = [...allResults, ...results];
		});
		
		for (let tab of openTabs) {
			let save = !tab.modified;
			
			allResults = [...allResults, ...tab.editor.api.replaceAll(findAndReplaceOptions)];
			
			if (save) {
				app.save(tab);
			}
		}
		
		if (allResults.length > 0) {
			app.bottomPane.showFindResults(options, allResults);
			
			return true;
		} else {
			return false;
		}
	}
	
	findAll(options) {
		let {searchIn} = options;
		
		if (searchIn !== "files" && !this.app.selectedTab) {
			return false;
		}
		
		if (searchIn === "currentDocument") {
			return this.findAllInCurrentDocument(options);
		} else if (searchIn === "selectedText") {
			return this.findAllInSelectedText(options);
		} else if (searchIn === "openFiles") {
			return this.findAllInOpenFiles(options);
		} else if (searchIn === "files") {
			return this.findAllInFiles(options);
		}
	}
	
	replaceAll(options) {
		let {searchIn} = options;
		
		if (searchIn !== "files" && !this.app.selectedTab) {
			return false;
		}
		
		if (searchIn === "currentDocument") {
			return this.replaceAllInCurrentDocument(options);
		} else if (searchIn === "selectedText") {
			return this.replaceAllInSelectedText(options);
		} else if (searchIn === "openFiles") {
			return this.replaceAllInOpenFiles(options);
		} else if (searchIn === "files") {
			return this.replaceAllInFiles(options);
		}
	}
	
	async ensureSession(options) {
		if (this.useExistingSession(options)) {
			return;
		}
		
		this.session = new Session(options);
		
		await this.session.init();
	}
	
	async findNext(options) {
		await this.ensureSession(options);
		
		
	}
	
	async findPrevious(options) {
		await this.ensureSession(options);
	}
	
	async replace(options) {
		if (!this.session) {
			await this.findNext(options);
		}
		
		if (!this.session.currentResult) {
			return false;
		}
		
		this.session.currentResult.replace();
	}
	
	loadOptions() {
		return platform.loadJson("findAndReplaceOptions", {});
	}
	
	saveOptions(options) {
		return platform.saveJson("findAndReplaceOptions", options);
	}
}

module.exports = FindAndReplace;