// ==UserScript==
// @name         FuckingFast Batch Downloader - Auto Retry
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Batch downloader with automatic DOWNLOAD retries and configurable delays
// @match        https://fuckingfast.co/*
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const PREFIX = '[FF Batch]';

    // ==============================
    // LOCAL STORAGE KEYS
    // ==============================

    const LINKS_KEY = 'ff_batch_links';
    const INDEX_KEY = 'ff_batch_index';
    const RUNNING_KEY = 'ff_batch_running';
    const CLICKED_KEY = 'ff_batch_clicked';

    const AUTO_NEXT_KEY = 'ff_auto_next';
    const AUTO_NEXT_DELAY_KEY = 'ff_auto_next_delay';

    const RETRY_INTERVAL_KEY = 'ff_retry_interval';
    const MAX_RETRIES_KEY = 'ff_max_retries';

    // ==============================
    // DEFAULT SETTINGS
    // ==============================

    const DEFAULT_AUTO_NEXT = true;

    // Wait this long after a successful click before going to next part
    const DEFAULT_AUTO_NEXT_DELAY = 300; // 5 minutes

    // Wait between DOWNLOAD retries
    const DEFAULT_RETRY_INTERVAL = 10; // 10 seconds

    // Maximum DOWNLOAD attempts
    const DEFAULT_MAX_RETRIES = 3;

    // ==============================
    // STATE
    // ==============================

    let autoNextTimer = null;
    let countdownTimer = null;

    let retryTimer = null;
    let retryCount = 0;

    // ==============================
    // LOGGING
    // ==============================

    function log(message) {
        console.log(`${PREFIX} ${message}`);
    }

    // ==============================
    // STORAGE HELPERS
    // ==============================

    function getLinks() {
        try {
            return JSON.parse(localStorage.getItem(LINKS_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function saveLinks(links) {
        localStorage.setItem(LINKS_KEY, JSON.stringify(links));
    }

    function getIndex() {
        return parseInt(localStorage.getItem(INDEX_KEY) || '0', 10);
    }

    function setIndex(index) {
        localStorage.setItem(INDEX_KEY, String(index));
    }

    function isRunning() {
        return localStorage.getItem(RUNNING_KEY) === 'true';
    }

    function setRunning(value) {
        localStorage.setItem(RUNNING_KEY, value ? 'true' : 'false');
    }

    function wasClicked() {
        return localStorage.getItem(CLICKED_KEY) === 'true';
    }

    function setClicked(value) {
        localStorage.setItem(CLICKED_KEY, value ? 'true' : 'false');
    }

    function isAutoNextEnabled() {
        return localStorage.getItem(AUTO_NEXT_KEY) !== 'false';
    }

    function setAutoNext(value) {
        localStorage.setItem(AUTO_NEXT_KEY, value ? 'true' : 'false');
    }

    function getAutoNextDelay() {
        return parseInt(
            localStorage.getItem(AUTO_NEXT_DELAY_KEY) ||
            DEFAULT_AUTO_NEXT_DELAY,
            10
        );
    }

    function setAutoNextDelay(value) {
        localStorage.setItem(AUTO_NEXT_DELAY_KEY, String(value));
    }

    function getRetryInterval() {
        return parseInt(
            localStorage.getItem(RETRY_INTERVAL_KEY) ||
            DEFAULT_RETRY_INTERVAL,
            10
        );
    }

    function setRetryInterval(value) {
        localStorage.setItem(RETRY_INTERVAL_KEY, String(value));
    }

    function getMaxRetries() {
        return parseInt(
            localStorage.getItem(MAX_RETRIES_KEY) ||
            DEFAULT_MAX_RETRIES,
            10
        );
    }

    function setMaxRetries(value) {
        localStorage.setItem(MAX_RETRIES_KEY, String(value));
    }

    // ==============================
    // FIND DOWNLOAD BUTTON
    // ==============================

    function findDownloadButton() {
        const elements = document.querySelectorAll('a, button');

        for (const element of elements) {
            const text = element.textContent.trim().toUpperCase();

            if (
                text === 'DOWNLOAD' &&
                (
                    element.getAttribute('hx-post')?.endsWith('/go') ||
                    element.tagName === 'BUTTON'
                )
            ) {
                return element;
            }
        }

        return null;
    }

    // ==============================
    // CANCEL RETRY
    // ==============================

    function cancelRetry() {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }

        retryCount = 0;
    }

    // ==============================
    // CANCEL AUTO NEXT
    // ==============================

    function cancelAutoNext() {
        if (autoNextTimer) {
            clearTimeout(autoNextTimer);
            autoNextTimer = null;
        }

        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }

        log('Auto-next timer cancelled.');
    }

    // ==============================
    // AUTO NEXT
    // ==============================

    function startAutoNext() {
        cancelAutoNext();

        if (!isRunning()) {
            return;
        }

        if (!isAutoNextEnabled()) {
            log('Auto-next disabled.');
            return;
        }

        const delay = getAutoNextDelay();

        log(`Waiting ${delay} seconds before next link.`);

        let remaining = delay;

        updateStatus(`Download triggered. Next part in ${remaining}s`);

        countdownTimer = setInterval(() => {
            remaining--;

            if (remaining <= 0) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }

            updateStatus(`Download triggered. Next part in ${Math.max(remaining, 0)}s`);
        }, 1000);

        autoNextTimer = setTimeout(() => {
            autoNextTimer = null;

            if (!isRunning()) {
                return;
            }

            log('Auto-next delay finished.');

            goNext();
        }, delay * 1000);
    }

    // ==============================
    // MOVE TO NEXT LINK
    // ==============================

    function goNext() {
        cancelAutoNext();
        cancelRetry();

        const links = getLinks();
        const index = getIndex();

        if (!links.length) {
            log('No links found.');
            return;
        }

        const nextIndex = index + 1;

        if (nextIndex >= links.length) {
            log('================================');
            log('BATCH COMPLETE!');
            log('================================');

            setRunning(false);
            setClicked(false);

            updateStatus('BATCH COMPLETE');

            return;
        }

        setIndex(nextIndex);
        setClicked(false);

        const nextLink = links[nextIndex];

        log(`Moving to ${nextIndex + 1}/${links.length}`);
        log(`Next URL: ${nextLink}`);

        updateStatus(`Opening part ${nextIndex + 1}/${links.length}...`);

        window.location.assign(nextLink);
    }

    // ==============================
    // DOWNLOAD SUCCESS
    // ==============================

    function downloadTriggered(button) {
        log('DOWNLOAD click appears to have been accepted.');

        setClicked(true);

        cancelRetry();

        updateStatus('Download triggered successfully.');

        startAutoNext();
    }

    // ==============================
// DOWNLOAD
// ==============================

function attemptDownload() {
    if (!isRunning()) {
        return;
    }

    const button = findDownloadButton();

    // Keep looking until the DOWNLOAD button actually appears.
    // This retry is SAFE because we are NOT clicking anything yet.
    if (!button) {
        log('DOWNLOAD button not found yet...');

        updateStatus('Waiting for DOWNLOAD button...');

        retryTimer = setTimeout(() => {
            attemptDownload();
        }, 1000);

        return;
    }

    log('DOWNLOAD button found.');

    updateStatus('Clicking DOWNLOAD...');

    // IMPORTANT:
    // Click exactly ONE time.
    button.click();

    log('DOWNLOAD clicked. Assuming download was triggered.');

    // Mark this page as handled immediately.
    // This prevents the script from clicking it again.
    setClicked(true);

    cancelRetry();

    // Start the normal wait before moving to the next part.
    startAutoNext();
}
    // ==============================
    // PROCESS CURRENT PAGE
    // ==============================

    function processCurrentPage() {
        if (!isRunning()) {
            log('Batch is not running.');
            return;
        }

        const links = getLinks();
        const index = getIndex();

        if (!links.length) {
            log('No batch links.');
            return;
        }

        log(`Processing ${index + 1}/${links.length}`);
        log(`Current URL: ${window.location.href}`);

        // If this page already successfully triggered the download,
        // don't click again.
        if (wasClicked()) {
            log('DOWNLOAD already clicked.');

            startAutoNext();
            return;
        }

        retryCount = 0;

        log('Looking for DOWNLOAD button...');

        attemptDownload();
    }

    // ==============================
    // STATUS
    // ==============================

    function updateStatus(text) {
        const status = document.getElementById('ff-status');

        if (status) {
            status.textContent = text;
        }
    }

    // ==============================
    // PANEL
    // ==============================

    function createPanel() {

        if (document.getElementById('ff-batch-panel')) {
            return;
        }

        const panel = document.createElement('div');

        panel.id = 'ff-batch-panel';

        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 330px;
            background: #111;
            color: #fff;
            padding: 12px;
            border-radius: 8px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 13px;
            box-shadow: 0 4px 20px rgba(0,0,0,.5);
        `;

        panel.innerHTML = `
            <div style="font-size:16px;font-weight:bold;margin-bottom:8px;">
                FuckingFast Batch
            </div>

            <textarea
                id="ff-links"
                placeholder="Paste links here, one per line..."
                style="
                    width:100%;
                    height:90px;
                    box-sizing:border-box;
                    margin-bottom:8px;
                    background:#222;
                    color:#fff;
                    border:1px solid #555;
                    border-radius:4px;
                    padding:6px;
                    resize:vertical;
                "
            ></textarea>

            <div style="margin-bottom:6px;">
                <label>
                    <input type="checkbox" id="ff-auto-next">
                    Auto Next
                </label>
            </div>

            <div style="margin-bottom:6px;">
                <label>
                    Next delay:
                    <input
                        type="number"
                        id="ff-delay"
                        min="5"
                        style="width:70px;"
                    >
                    sec
                </label>
            </div>

            <div style="margin-bottom:6px;">
                <label>
                    Retry every:
                    <input
                        type="number"
                        id="ff-retry"
                        min="1"
                        style="width:60px;"
                    >
                    sec
                </label>
            </div>

            <div style="margin-bottom:8px;">
                <label>
                    Max retries:
                    <input
                        type="number"
                        id="ff-max-retries"
                        min="1"
                        style="width:60px;"
                    >
                </label>
            </div>

            <div style="display:flex;gap:5px;margin-bottom:8px;">

                <button id="ff-start">
                    START
                </button>

                <button id="ff-next">
                    NEXT
                </button>

                <button id="ff-stop">
                    STOP
                </button>

                <button id="ff-reset">
                    RESET
                </button>

            </div>

            <div
                id="ff-status"
                style="
                    padding:6px;
                    background:#222;
                    border-radius:4px;
                    word-break:break-word;
                "
            >
                Idle
            </div>
        `;

        document.body.appendChild(panel);

        // Restore settings
        document.getElementById('ff-auto-next').checked =
            isAutoNextEnabled();

        document.getElementById('ff-delay').value =
            getAutoNextDelay();

        document.getElementById('ff-retry').value =
            getRetryInterval();

        document.getElementById('ff-max-retries').value =
            getMaxRetries();

        // ==========================
        // START
        // ==========================

        document.getElementById('ff-start').onclick = () => {

            const textarea =
                document.getElementById('ff-links');

            const links = textarea.value
                .split('\n')
                .map(x => x.trim())
                .filter(Boolean);

            if (!links.length) {
                alert('Paste some FuckingFast links first.');
                return;
            }

            saveLinks(links);

            setIndex(0);
            setClicked(false);
            setRunning(true);

            log('================================');
            log('BATCH STARTED');
            log(`Total links: ${links.length}`);
            log('================================');

            const firstLink = links[0];

            const currentURL =
                window.location.origin +
                window.location.pathname;

            let firstURL;

            try {
                firstURL =
                    new URL(firstLink).origin +
                    new URL(firstLink).pathname;
            } catch {
                alert('Invalid first link.');
                setRunning(false);
                return;
            }

            // Already on first page
            if (currentURL === firstURL) {
                processCurrentPage();
            } else {
                updateStatus('Opening first part...');
                window.location.assign(firstLink);
            }
        };

        // ==========================
        // NEXT
        // ==========================

        document.getElementById('ff-next').onclick = () => {

            if (!getLinks().length) {
                alert('No batch loaded.');
                return;
            }

            setRunning(true);

            goNext();
        };

        // ==========================
        // STOP
        // ==========================

        document.getElementById('ff-stop').onclick = () => {

            log('Batch stopped.');

            setRunning(false);
            setClicked(false);

            cancelAutoNext();
            cancelRetry();

            updateStatus('Stopped.');
        };

        // ==========================
        // RESET
        // ==========================

        document.getElementById('ff-reset').onclick = () => {

            cancelAutoNext();
            cancelRetry();

            localStorage.removeItem(LINKS_KEY);
            localStorage.removeItem(INDEX_KEY);
            localStorage.removeItem(RUNNING_KEY);
            localStorage.removeItem(CLICKED_KEY);

            textareaClear();

            updateStatus('Reset.');

            log('Batch reset.');
        };

        // ==========================
        // SETTINGS
        // ==========================

        document.getElementById('ff-auto-next').onchange = e => {
            setAutoNext(e.target.checked);

            if (!e.target.checked) {
                cancelAutoNext();
            }
        };

        document.getElementById('ff-delay').onchange = e => {
            let value = parseInt(e.target.value, 10);

            if (!value || value < 5) {
                value = 5;
                e.target.value = value;
            }

            setAutoNextDelay(value);
        };

        document.getElementById('ff-retry').onchange = e => {
            let value = parseInt(e.target.value, 10);

            if (!value || value < 1) {
                value = 1;
                e.target.value = value;
            }

            setRetryInterval(value);
        };

        document.getElementById('ff-max-retries').onchange = e => {
            let value = parseInt(e.target.value, 10);

            if (!value || value < 1) {
                value = 1;
                e.target.value = value;
            }

            setMaxRetries(value);
        };

        function textareaClear() {
            document.getElementById('ff-links').value = '';
        }

        // Populate textarea with saved links
        const savedLinks = getLinks();

        if (savedLinks.length) {
            document.getElementById('ff-links').value =
                savedLinks.join('\n');
        }
    }

    // ==============================
    // INITIALIZE
    // ==============================

    log('================================');
    log('Script loaded!');
    log(`URL: ${window.location.href}`);
    log('================================');

    createPanel();

    if (isRunning()) {

        const links = getLinks();
        const index = getIndex();

        log('Existing batch detected:');
        log(`${index + 1} / ${links.length}`);

        // Give the page a little time to finish loading
        setTimeout(() => {
            processCurrentPage();
        }, 1500);
    }

})();