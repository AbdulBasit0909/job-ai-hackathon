chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveToJobHunt",
    title: "Save to JobHunt AI",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveToJobHunt" && info.selectionText) {
    fetch("http://localhost:3000/api/extension/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // THIS sends your logged-in cookies!
      body: JSON.stringify({ text: info.selectionText })
    })
    .then(res => res.json())
    .then(data => {
      console.log("Saved to JobHunt AI:", data);
      chrome.tabs.create({ url: "http://localhost:3000/dashboard/applications" });
    })
    .catch(err => console.error("Error saving:", err));
  }
});