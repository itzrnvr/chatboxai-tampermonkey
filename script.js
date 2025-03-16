// ==UserScript==
// @name         Custom Theme
// @namespace    http://tampermonkey.net/
// @version      2025-03-16
// @description  try to take over the world!
// @author       You
// @match        https://web.chatboxai.app/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatboxai.app
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `

        body {
            background-color: #191a1a !important;
            font-family: "Google Sans", "Helvetica Neue", sans-serif !important;
            font-size: 16px !important;
        }

        h1{
            font-size: x-large!important;
        }

        h2 {
            font-size: larger!important;
        }

        pre {
            font-size: small;
        }

        .betterDrawer{
            background-color: #202222 !important;
            color: #8d9191 !important;
        }

        .betterDrawer svg{
            fill: #8d9191 !important;
        }


        .MuiPaper-root.MuiPaper-elevation.MuiPaper-elevation0.MuiDrawer-paper.MuiDrawer-paperAnchorLeft.MuiDrawer-paperAnchorDockedLeft.css-1x70eu1{
            border-right-width: 0 !important;
        }
        .MuiList-root.MuiList-padding.MuiList-subheader.css-1kath76 li {
            font-size: 12px !important;
        }

        .MuiList-root.MuiList-padding.css-1ontqvh li span {
            font-size: 14px !important;
        }

        .MuiButtonBase-root.MuiMenuItem-root.MuiMenuItem-gutters.MuiMenuItem-root.MuiMenuItem-gutters.css-1tf8sn4 div p {
            font-size: 14px !important;
        }
    `;
    document.head.appendChild(style);


    function setToolbarTheme() {
        const toolbar = document.querySelector('.ToolBar')
        if (toolbar) {
            toolbar.classList.add('betterDrawer');
        }
    }

    function setMargin() {
        const element = document.querySelector('[data-testid="virtuoso-scroller"]');
        if (element) {
            element.style.marginLeft = '32px';
            console.log('Margin set on virtuoso-scroller');
        }
    }

    // Run immediately
    setMargin();
    setToolbarTheme();


    // For dynamic content, use a MutationObserver
    const observer = new MutationObserver(function(mutations) {
        setMargin();
        setToolbarTheme();
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
})();