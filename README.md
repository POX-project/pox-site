# POX site

A static site with no build step or runtime dependencies. Serve the folder over HTTP (JSON loading does not work through `file://`):

```sh
python3 -m http.server 8000
```

## Maintainer profiles

Edit `data/maintainers.json`. Each profile accepts `name`, `image`, `description`, and an optional `socials` array. Existing names and bios are **sample content**; replace them with approved profiles before publishing.

Each social link uses a `label` and an absolute `https://` (or `http://`) `url`. For example, this is the **shape of an example entry**, not an actual maintainer account:

```json
{
  "name": "Example maintainer",
  "image": "",
  "description": "An approved short biography.",
  "socials": [
    { "label": "GitHub", "url": "https://github.com/example" },
    { "label": "Website", "url": "https://example.com" }
  ]
}
```

Use any labels (GitHub, Telegram, Mastodon, Instagram, LinkedIn, etc.). Keep `socials` empty or omit it when the maintainer does not want to share links. Empty or unsafe URLs are not rendered. Links open in a new tab with `noopener noreferrer`. No third-party embeds, tracking widgets, or icon libraries are loaded.

## Supported devices

`data/devices.json` is the source for both the home section immediately after About Us and `devices.html`. Each entry has `name`, `manufacturer`, and `codename`. Device enquiry links prefill the request form; they are not download links.

Project-specific compatibility lists remain in `data/projects.json`. They are separate from the site-wide device list; verify their existing content against actual releases before publishing. No project-to-device compatibility or download URLs have been assumed.

## Mobile and motion

The mobile menu supports keyboard focus and Escape to close. Phones and coarse pointers use expanded project cards instead of the desktop wheel, allowing normal page scrolling. Animations use short, staggered reveals and transform/opacity effects; mobile uses a single backdrop-blur layer. Reduced-motion users get static content and no smooth scrolling.
