let titleNode = null; // To store the channel title from the RSS feed
let imageNode = null; // To store the image URL from the RSS feed
let episodes = [];
let selected = new Set();

async function fetchRSS() {
  document.getElementById('errorMsg').textContent = ""; // Clear previous error
  let url = document.getElementById('rssUrl').value.trim();
  if (!url) {
    document.getElementById('errorMsg').textContent = "Enter a valid URL.";
    return;
  }

  // Check if the URL is an Apple Podcasts URL
  const parsedUrl = new URL(url);
  console.log("parsedUrl:", parsedUrl);
  if (parsedUrl.hostname.endsWith('podcasts.apple.com')) {
    const appleId = extractFromApplePodcastUrl(url);
    console.log("appleId:", appleId);
    if (appleId) {
      // get Feed Url From Apple Podcast Id
      url = await getFeedUrlFromApplePodcastId(appleId);
      console.log("url:", url);
    } else {
      document.getElementById('errorMsg').textContent = "Invalid Apple Podcasts URL.";
      return;
    }
  }

  console.log("url:", url);

  try {
    const response = await fetch(url);
    const text = await response.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    // Check for parser errors or missing elements
    if (xml.querySelector("parsererror") || !xml.querySelector("rss") || !xml.querySelector("channel")) {
      throw new Error("Invalid RSS feed");
    }

    // Set the channel title from the RSS feed
    titleNode = xml.querySelector("channel > title");
    titleNode.textContent = titleNode.textContent + " - Trimmed Feed"; // Modify the title for the custom feed

    // Set the value of the modifiedTitle input box with the channel title
    if (titleNode && document.getElementById('modifiedTitle')) {
      document.getElementById('modifiedTitle').value = titleNode.textContent;
    }

    // Set the image URL if available
    imageNode = xml.querySelector("channel > image > url");

    // Set the episodes array from the RSS feed
    const items = Array.from(xml.querySelectorAll("item"));
    episodes = items.map((item, i) => ({
      title: item.querySelector("title")?.textContent || `Episode ${i + 1}`,
      xml: item.outerHTML
    }));

    selected = new Set(episodes.map((_, i) => i));
    renderEpisodeList();

    // Show controls and upload button
    document.getElementById('titleBox').classList.remove('hidden');
    document.getElementById('episodeControls').classList.remove('hidden');
    document.getElementById('uploadBtn').classList.remove('hidden');
  } catch (e) {
    console.error(e);
    document.getElementById('errorMsg').textContent = "Failed to fetch or parse RSS feed. Please check the URL and try again.";
  }
}

function renderEpisodeList() {
  const list = document.getElementById('episodeList');
  list.innerHTML = '';

  episodes.forEach((ep, index) => {
    const li = document.createElement('li');
    li.className = 'flex items-center space-x-2';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selected.has(index);
    checkbox.onchange = () => {
      checkbox.checked ? selected.add(index) : selected.delete(index);
    };

    const label = document.createElement('label');
    label.textContent = ep.title;
    label.className = 'text-sm';

    li.appendChild(checkbox);
    li.appendChild(label);
    list.appendChild(li);
  });
}

function selectAll() {
  episodes.forEach((_, i) => selected.add(i));
  renderEpisodeList();
}

function selectNone() {
  selected.clear();
  renderEpisodeList();
}

function generateAndUploadXML() {
  if (selected.size === 0) {
    alert("No episodes selected.");
    return;
  }

  const selectedItems = [...selected].map(i => episodes[i].xml).join("\n    ");
  const modifiedTitle = document.getElementById('modifiedTitle')?.value || "Trimmed Feed";


  const fullXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${modifiedTitle}</title>
    <image>
      <url>${imageNode ? imageNode.textContent : ''}</url>
      <title>${modifiedTitle}</title>
      <link>https://feedtrimmer.georgeparris.com</link>
    </image>
    <link>https://feedtrimmer.georgeparris.com</link>
    <description>Custom podcast feed</description>
    ${selectedItems}
  </channel>
</rss>`;

  window.generatedXML = fullXML; // Save for upload
  uploadXML();
}

async function uploadXML() {
  const xmlString = window.generatedXML;
  if (!xmlString) {
    document.getElementById('uploadStatus').textContent = "Please generate XML first.";
    return;
  }
  document.getElementById('uploadStatus').textContent = "Uploading...";
  try {
    const response = await fetch('https://feedtrimmer-backend.onrender.com/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: xmlString
    });
    console.log("Upload request sent. Status:", response.status, response.statusText);
    if (response.ok) {
      const result = await response.json();
      document.getElementById('uploadStatus').innerHTML = `
        <span>${result.public_url || "No public_url in response."}</span>
        ${result.public_url ? `<button id="copyUrlBtn" style="margin-left:8px;">⧉</button>` : ""}
      `;
      if (result.public_url) {
        const copyBtn = document.getElementById('copyUrlBtn');
        copyBtn.onclick = async () => {
          try {
        await navigator.clipboard.writeText(result.public_url);
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
          } catch (err) {
        copyBtn.textContent = "Failed";
          }
        };
      }
      console.log("Upload successful! Response:", result);
    } else {
      const errorText = await response.text();
      document.getElementById('uploadStatus').textContent = "Upload failed.";
      console.error("Upload failed:", response.status, response.statusText, errorText);
    }
  } catch (e) {
    document.getElementById('uploadStatus').textContent = "Error uploading: " + e.message;
    console.error("Error uploading:", e);
  }
}

function extractFromApplePodcastUrl(url) {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.endsWith('podcasts.apple.com') &&
      /\/id\d+$/.test(parsed.pathname)
    ) {
      const match = parsed.pathname.match(/\/id(\d+)$/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function getFeedUrlFromApplePodcastId(applePodcastId) {
  try {
    const response = await fetch(`https://itunes.apple.com/lookup?id=${applePodcastId}`);
    if (!response.ok) throw new Error("Failed to fetch from iTunes API");
    const results = await response.json();
    // console.log("iTunes API results:", results.results[0].feedUrl);
    if (results.resultCount > 0 && results.results[0].feedUrl) {
      return results.results[0].feedUrl;
    }
    return null;
  } catch (e) {
    console.error("Error fetching feedUrl:", e);
    return null;
  }
}
