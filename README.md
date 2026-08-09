# Half a Love Letter

Share your heart with the world and leave a note of love for a special someone — or to the world. Completely anonymously. Or just come and read :)

A small site where anyone can write an anonymous love letter or read a random one someone else has written. Letters are shown sliding out of an animated, hand-drawn envelope.

## Features

- **Read** — loads a random letter from Firestore, animated sliding out of the envelope. Longer letters slide out further so the whole thing stays readable.
- **Write** — an anonymous, character-limited (2000) textarea styled to match the letter paper, backed by Firestore.
- Heart-shaped toggle buttons for switching between Read/Write, and a hand-drawn refresh icon for loading the next letter.
- Built entirely with vanilla HTML/CSS/JS — no build step, no framework.

## Tech stack

- Plain HTML/CSS/JS (no build tooling)
- [Firebase Firestore](https://firebase.google.com/docs/firestore) for storing and fetching letters
- Self-hosted [Clear Sans](https://github.com/intel/clear-sans) and [Inter](https://github.com/rsms/inter) fonts

## Project structure

```
.
├── index.html
├── src/
│   ├── style.css
│   ├── app.js        # UI behavior (read/write, animations, etc.)
│   └── backend.js    # Firebase read/write calls
└── assets/
    ├── background.jpg
    ├── fonts/
    ├── letter/        # envelope + paper artwork
    └── buttons/       # heart toggle buttons, refresh icon
```

## Running locally

No build step — just serve the folder statically, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Credits

Made with ❤️ for Valentine's Day 2026 by [Half Odd](https://halfodd.com).

## License

[MIT](LICENSE)
