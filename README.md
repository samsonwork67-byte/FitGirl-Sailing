# FuckingFast Batch Downloader

A Tampermonkey userscript that automates repetitive multi-page download workflows on **FuckingFast**.

The script processes a list of FuckingFast links, navigates between them automatically, detects the DOWNLOAD button, triggers it, and continues to the next link after a configurable delay.

## Requirements

You need:

1. **Firefox** or another compatible browser
2. **Tampermonkey**
3. **Cloudflare One Client / WARP** — recommended as part of the network setup
4. **AdGuard** or another reputable ad/content blocker — recommended to reduce advertisements and unwanted redirects
5. A working FuckingFast link

### Cloudflare One Client

Install and enable **Cloudflare One Client/WARP** if you want to use it as part of your network configuration.

> **Important:** WARP does not bypass CAPTCHA or Cloudflare security challenges. If FuckingFast displays a Cloudflare verification page, complete the verification normally in the browser before allowing the userscript to continue.

### AdGuard

AdGuard or another reputable content blocker is recommended to reduce advertisements and unwanted redirects while browsing.

The userscript itself does not bypass advertisements or Cloudflare security mechanisms.

## Installation

### 1. Install Tampermonkey

Install the Tampermonkey browser extension.

### 2. Install the userscript

Open Tampermonkey → **Create a new script**.

Delete the default code and paste the contents of:

```text
FuckingFast-Batch-Downloader.user.js
```

Save the script.

### 3. Open a FuckingFast link

The script is designed for URLs in this format:

```text
https://fuckingfast.co/<page-id>#<filename>
```

Example:

```text
https://fuckingfast.co/15mv73fzaasa#example-file.rar
```

## How to Use

### 1. Prepare your links

Put one FuckingFast link on each line:

```text
https://fuckingfast.co/example1#part01.rar
https://fuckingfast.co/example2#part02.rar
https://fuckingfast.co/example3#part03.rar
```

### 2. Open FuckingFast

Open one of the links.

The **FuckingFast Batch** panel should appear in the top-right corner.

### 3. Paste your links

Paste the complete list into the text box.

### 4. Configure Auto Next

Enable **Auto Next** and set the **Next delay**.

Example:

```text
Next delay: 300 seconds
```

The delay is configurable because the userscript cannot directly determine when Firefox has completely finished a download.

### 5. Start

Click **START**.

The script will:

1. Open the first link.
2. Wait for the DOWNLOAD button.
3. Click DOWNLOAD once.
4. Wait for the configured delay.
5. Open the next link.
6. Repeat until the batch is complete.

## Controls

| Control        | Function                                  |
| -------------- | ----------------------------------------- |
| **START**      | Start a new batch                         |
| **NEXT**       | Manually move to the next link            |
| **STOP**       | Stop automatic processing                 |
| **RESET**      | Clear saved batch progress                |
| **Auto Next**  | Automatically continue to the next link   |
| **Next delay** | Time to wait before opening the next link |

## Cloudflare Verification

FuckingFast may display Cloudflare verification during normal browsing.

If this happens:

1. Wait for the browser to complete the verification.
2. Complete any normal user verification requested by the site.
3. Wait for the FuckingFast page to load.
4. Allow the userscript to continue.

The userscript does **not** bypass CAPTCHA, Cloudflare verification, authentication, or other access-control mechanisms.

## Limitations

### Download completion

A normal Tampermonkey userscript does not have reliable access to Firefox's download manager.

Therefore, the script uses a configurable delay instead of claiming that a download has definitely finished.

### FuckingFast compatibility

This script is specifically designed for **FuckingFast links**.

It depends on the website's current page structure and DOWNLOAD button. Changes to the website may require changes to the userscript.

## Troubleshooting

### DOWNLOAD button is not detected

Check that:

* The page has finished loading.
* Cloudflare verification has completed.
* You are using a compatible FuckingFast URL.
* Tampermonkey is enabled.

Open **Developer Tools → Console** and look for messages beginning with:

```text
[FF Batch]
```

### Downloads are not starting

Try clicking the DOWNLOAD button manually.

If the manual browser action also fails, the issue may be related to the website, browser, Cloudflare verification, or network rather than the userscript.

### The script moves to the next link too quickly

Increase **Next delay**.

For example:

```text
60 seconds → 300 seconds → 600 seconds
```

## Project Structure

```text
FuckingFast-Batch-Downloader/
│
├── FuckingFast-Batch-Downloader.user.js
└── README.md
```

## Disclaimer

This project is provided for educational and browser-automation purposes. Users are responsible for complying with applicable laws, website terms of service, and copyright requirements.

The script does not bypass CAPTCHA, Cloudflare verification, authentication, or other access-control mechanisms.
