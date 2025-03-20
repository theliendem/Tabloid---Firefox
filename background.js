const storageAPI = browser.storage;
const api = browser;

function getDomain(url) {
	try {
		return new URL(url).hostname.replace("www.", "").split(".").slice(-2).join(".");
	} catch (e) {
		return null;
	}
}

function checkDomain(tabId, url) {
	if (url.startsWith("moz-extension://")) return console.log("Tabloid: Ignoring extension page");

	const domain = getDomain(url);
	if (!domain) return;

	storageAPI.local.get(["categorizedDomains", "ignoredDomains", "snoozed"], (data) => {
		const categorized = data.categorizedDomains || {};
		const ignored = data.ignoredDomains || {};
		let snoozed = data.snoozed || false;

		if (categorized[domain] || ignored[domain]) return;

		if (snoozed && snoozed > Date.now()) return;
		else {
			snoozed = false;
			storageAPI.local.set({ snoozed });
		}

		promptUserToCategorize(tabId, domain);
	});
}

function promptUserToCategorize(tabId, domain) {
	browser.scripting.executeScript({
		target: { tabId: tabId },
		func: showCategorizationPromptUI,
		args: [tabId, domain]
	}).catch((err) => {
		console.error("Error injecting script: ", err);
	})
}

function showCategorizationPromptUI(tabId, domain) {
	// Check if a prompt already exists
	if (document.getElementById("tabloid-prompt")) return;

	// Create the popup container
	const popup = document.createElement("div");

	document.body.innerHTML += `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Rowdies:wght@300;400;700&display=swap" rel="stylesheet"><link href="https://neildembla.com/noot.css" rel="stylesheet">`;
	const style = document.createElement("style");
	style.id = "tabloid-styles";
	style.innerHTML = `@font-face { font-family: 'Veritas'; src: url('Veritas Regular.ttf'); } .floating-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #0b0813; color: #efe9ff; padding: 20px; border-radius: 10px; box-shadow: 0 0 20px rgba(255, 255, 255, 0.8); display: block; z-index: 10000; } .modal-content { text-align: center; }`;
	document.body.appendChild(style);

	popup.id = "tabloid-prompt";
	popup.style.position = "fixed";
	popup.style.top = "10px";
	popup.style.right = "10px";
	popup.style.backgroundColor = "#0b0813";
	popup.style.border = "2px solid #333";
	popup.style.borderRadius = "10px";
	popup.style.boxShadow = "10px 4px 6px rgba(0,0,0,1)";
	popup.style.fontFamily = "\"Inter\", Calibri, Verdana, Arial, sans-serif";
	popup.style.paddingTop = "30px";
	popup.style.paddingBottom = "30px";
	popup.style.paddingLeft = "20px";
	popup.style.paddingRight = "40px";
	popup.style.maxWidth = "40%";
	popup.style.zIndex = "9999";
	popup.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";
	popup.style.color = "#efe9ff";

	// Title
	popup.innerHTML += `<h1><strong style="color: #efe9ff; font-size: 30px; font-family: 'Noot', sans-serif;">Tabloid</strong></h1>`;
	popup.innerHTML += `<span style="color: #efe9ff; font-size: 20px; margin-bottom: 10px;">Categorize ${domain}</span></h1><br><br>`;

	// Dropdown for existing categories
	const categorySelect = document.createElement("select");
	categorySelect.innerHTML = `<option value="">-- Select Category --</option>`;
	categorySelect.style.color = "#efe9ff";
	categorySelect.style.padding = "7px";
	categorySelect.style.marginTop = "5px";
	categorySelect.style.backgroundColor = "#0b0813";
	categorySelect.style.border = "2px solid #8573b1";

	// Fetch existing categories from storage
	browser.storage.local.get(["categorizedDomains"], (data) => {
		const categories = new Set(Object.values(data.categorizedDomains || {}));
		categories.forEach(cat => {
			const option = document.createElement("option");
			option.value = cat;
			option.textContent = cat;
			option.style.color = "black";
			categorySelect.appendChild(option);
		});
	});

	popup.appendChild(categorySelect);
	popup.appendChild(document.createElement("br"));

	// Input for new category
	const categoryInput = document.createElement("input");
	categoryInput.type = "text";
	categoryInput.placeholder = "Or enter a new category";
	categoryInput.style.color = "white";
	categoryInput.style.border = "none";
	categoryInput.style.borderBottom = "2px solid #8573b1";
	categoryInput.style.backgroundColor = "#251c3d";
	categoryInput.style.padding = "5px 8px";
	categoryInput.style.marginTop = "7px";
	categoryInput.style.marginBottom = "7px";
	categoryInput.style.borderRadius = "5px";
	popup.appendChild(categoryInput);
	popup.appendChild(document.createElement("br"));

	// "Never ask again" checkbox
	const neverAskCheckbox = document.createElement("input");
	neverAskCheckbox.type = "checkbox";
	neverAskCheckbox.id = "never-ask-again";
	neverAskCheckbox.style.marginTop = "5px";
	neverAskCheckbox.style.cursor = "pointer";
	neverAskCheckbox.style.color = "black";

	const label = document.createElement("label");
	label.textContent = " Never ask again";
	label.htmlFor = "never-ask-again";
	label.style.marginLeft = "5px";
	label.style.color = "#efe9ff";
	label.style.marginBottom = "10px";

	popup.appendChild(neverAskCheckbox);
	popup.appendChild(label);
	popup.appendChild(document.createElement("br"));

	// Save button
	const saveButton = document.createElement("button");
	saveButton.textContent = "Save";
	saveButton.style.marginTop = "5px";
	saveButton.style.cursor = "pointer";
	saveButton.style.color = "#0b0813";
	saveButton.style.backgroundColor = "#efe9ff";
	saveButton.style.border = "none";
	saveButton.style.padding = "5px 8px";
	saveButton.style.borderRadius = "5px";
	saveButton.style.marginRight = "5px";
	popup.appendChild(saveButton);

	const snoozeButton = document.createElement("button");
	snoozeButton.textContent = "Snooze";
	snoozeButton.style.marginTop = "5px";
	snoozeButton.style.marginLeft = "5px";
	snoozeButton.style.cursor = "pointer";
	snoozeButton.style.color = "#0b0813";
	snoozeButton.style.backgroundColor = "#efe9ff";
	snoozeButton.style.border = "none";
	snoozeButton.style.padding = "5px 8px";
	snoozeButton.style.borderRadius = "5px";
	snoozeButton.style.marginRight = "5px";
	popup.appendChild(snoozeButton);

	// Cancel button
	const cancelButton = document.createElement("button");
	cancelButton.textContent = "Cancel";
	cancelButton.style.marginTop = "5px";
	cancelButton.style.marginLeft = "5px";
	cancelButton.style.cursor = "pointer";
	cancelButton.style.color = "#0b0813";
	cancelButton.style.backgroundColor = "#efe9ff";
	cancelButton.style.border = "none";
	cancelButton.style.padding = "5px 8px";
	cancelButton.style.borderRadius = "5px";
	cancelButton.style.marginRight = "5px";
	popup.appendChild(cancelButton);

	document.body.appendChild(popup);

	snoozeButton.addEventListener("click", () => {
		const snoozeTime = 1000 * 60 * 60 * 2; // 2 hours
		// const snoozeTime = 1000 * 10; // 10 seconds
		const snoozeUntil = Date.now() + snoozeTime;

		browser.storage.local.get("snoozed", data => {
			let snoozed = data.snoozed || {};
			snoozed = snoozeUntil;
			browser.storage.local.set({ snoozed }, () => {
				console.log(`Snoozed for 2 hours`);
			});
		});
		popup.remove();
	});

	// Handle Save
	saveButton.addEventListener("click", () => {
		const selectedCategory = categorySelect.value;
		const newCategory = categoryInput.value.trim();
		const neverAskAgain = neverAskCheckbox.checked;

		browser.storage.local.get(["categorizedDomains", "ignoredDomains"], (data) => {
			let categorized = data.categorizedDomains || {};
			let ignored = data.ignoredDomains || {};

			if (newCategory) {
				categorized[domain] = newCategory;
			} else if (selectedCategory) {
				categorized[domain] = selectedCategory;
			} else if (neverAskAgain) {
				ignored[domain] = true;
			}

			browser.storage.local.set({ categorizedDomains: categorized, ignoredDomains: ignored }, () => {
				console.log(`Successfully categorized ${domain}`);
			});
		});

		popup.remove();
	});

	// Handle Cancel
	cancelButton.addEventListener("click", () => popup.remove());
}

function addTabListeners() {
	browser.tabs.onCreated.addListener((tab) => {
		checkDomain(tab.id, tab.url);
	});

	browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		if (changeInfo.url) checkDomain(tabId, changeInfo.url);
	});
}

// function snoozeDomain(domain) {
// 	// const snoozeTime = 1000 * 60 * 60 * 2; // 2 hours
// 	const snoozeTime = 1000 * 30; // 30 seconds
// 	const snoozeUntil = Date.now() + snoozeTime;

// 	browser.storage.local.get(["snoozedDomains"], (data) => {
// 		const snoozed = data.snoozedDomains || {};
// 		snoozed[domain] = snoozeUntil;
// 		browser.storage.local.set({ snoozedDomains: snoozed }, () => {
// 			// const modal = createFloatingModal(`<h2>Snoozed ${domain} for 2 hours</h2><p>Auto deleting in 3...</p><br><button id="close-modal">Close</button><button id="undo-snooze">Undo</button>`);
// 			// document.getElementById("undo-snooze").addEventListener("click", () => {
// 			// 	delete snoozed[domain];
// 			// 	browser.storage.local.set({ snoozedDomains: snoozed });
// 			// 	modal.remove();
// 			// });
// 			// document.getElementById("close-modal").addEventListener("click", () => {
// 			// 	modal.remove();
// 			// });
// 			// setInterval(() => {
// 			// 	// Update the modal every second to show the countdown from three seconds to zero (when the modal will auto-close)
// 			// 	const count = modal.querySelector("p");
// 			// 	const currentCount = parseInt(count.textContent.split(" ")[2]);
// 			// 	if (currentCount === 0) return modal.remove();
// 			// 	count.textContent = `Auto deleting in ${currentCount - 1}...`;
// 			// }, 1000);
// 			window.alert("Snoozed domain for 30 seconds");
// 		});
// 	});
// }

// function createFloatingModal(content) {
// 	const modal = document.createElement("div");
// 	modal.classList.add("floating-modal");
// 	modal.innerHTML = `<div class='modal-content'>${content}</div>`;
// 	document.body.appendChild(modal);
// 	return modal;
// }

document.addEventListener("DOMContentLoaded", () => {
	addTabListeners();
});