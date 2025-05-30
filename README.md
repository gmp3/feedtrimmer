# FeedTrimmer

FeedTrimmer is a simple web tool to help you pick selected episodes from a podcast RSS feed and generate a trimmed XML file.

## Features

- Enter a podcast RSS feed URL
- Fetch and display episodes
- Select or deselect episodes
- Download a new RSS XML with only the episodes you want

## Usage

1. Open `index.html` in your browser.
2. Enter the RSS feed URL of your podcast.
3. Click **Fetch Feed**.
4. Select the episodes you want to keep.
5. Click **Download Trimmed XML** to get your custom feed.

## Development

- All logic is in `app.js`.
- Styling uses [Tailwind CSS](https://tailwindcss.com/).
- No build step required; just open `index.html`.

## Project Structure

```
/feedtrimmer
  ├── index.html
  ├── app.js
  ├── README.md
  └── .gitignore
```

## License

MIT
