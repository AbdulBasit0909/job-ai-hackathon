chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveToJobHunt",
    title: "Save to JobHunt AI",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveToJobHunt" && info.selectionText) {
    try {
      const response = await fetch("https://job-ai-hackathon.vercel.app/api/extension/save", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ 
          text: info.selectionText,
          sourceUrl: tab.url // SEND THE ORIGINAL URL HERE!
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Saved to JobHunt AI:", data);
      
      // Open dashboard applications page to view the newly saved job
      chrome.tabs.create({ url: "https://job-ai-hackathon.vercel.app/dashboard/applications" });
    } catch (err) {
      console.error("Error saving to JobHunt AI:", err);
    }
  }
});