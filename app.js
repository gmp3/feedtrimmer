let episodes = [];
let selected = new Set();

async function fetchRSS() {
  const url = document.getElementById('rssUrl').value.trim();
  if (!url) return alert("Enter a valid URL.");

  try {
    const response = await fetch(url);
    const text = await response.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    if (xml.querySelector("parsererror") || !xml.querySelector("rss") || !xml.querySelector("channel")) {
      throw new Error("Invalid RSS feed");
    }

    const items = Array.from(xml.querySelectorAll("item"));
    episodes = items.map((item, i) => ({
      title: item.querySelector("title")?.textContent || `Episode ${i + 1}`,
      xml: item.outerHTML
    }));

    selected = new Set(episodes.map((_, i) => i));
    renderEpisodeList();

    // Show controls
    document.getElementById('episodeControls').classList.remove('hidden');
    document.getElementById('downloadBtn').classList.remove('hidden');

  } catch (e) {
    console.error(e);
    alert("Failed to fetch or parse RSS feed.");
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

function generateXML() {
  if (selected.size === 0) return alert("No episodes selected.");

  const selectedItems = [...selected].map(i => episodes[i].xml).join("\n    ");
  const fullXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Trimmed Feed</title>
    <link>https://example.com</link>
    <description>Custom podcast feed</description>
    ${selectedItems}
  </channel>
</rss>`;

  const blob = new Blob([fullXML], { type: "application/rss+xml" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'trimmed_feed.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Show upload button after generating XML
  document.getElementById('uploadBtn').classList.remove('hidden');
  window.generatedXML = fullXML; // Save for upload
}

async function uploadXML() {
  const xmlString = window.generatedXML;
  if (!xmlString) {
    document.getElementById('uploadStatus').textContent = "Please generate XML first.";
    return;
  }
  document.getElementById('uploadStatus').textContent = "Uploading...";
  try {
    const response = await fetch('https://podtrimmer-backend.onrender.com/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: xmlString
    });
    if (response.ok) {
      const result = await response.json();
      document.getElementById('uploadStatus').textContent = "Upload successful! " + (result.url ? `URL: ${result.url}` : "");
    } else {
      document.getElementById('uploadStatus').textContent = "Upload failed.";
    }
  } catch (e) {
    document.getElementById('uploadStatus').textContent = "Error uploading: " + e.message;
  }
}
