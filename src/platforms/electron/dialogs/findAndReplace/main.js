import getDialogOptions from "platform/modules/getDialogOptions";
import init from "platform/init";
import App from "./modules/App";
import AppComponent from "./components/App.svelte";

init(async function() {
	let app = new App(getDialogOptions());
	
	await app.init();
	
	new AppComponent({
		target: document.body,
		
		props: {
			app,
		},
	});
	
	// DEV:
	
	window.app = app;
});