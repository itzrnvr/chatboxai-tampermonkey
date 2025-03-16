// ==UserScript==
// @name         Think Collapse Chatbox v4
// @namespace    http://tampermonkey.net/
// @version      2025-03-16
// @description  try to take over the world!
// @author       You
// @match        https://web.chatboxai.app/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatboxai.app
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
        .think-toggle { 
            background-color: #2a2a2a;
            color: #e0e0e0;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 6px 12px;
            margin: 5px 0;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.2s ease;
        }
        
        .think-toggle:hover {
            background-color: #3a3a3a;
            border-color: #666;
        }
        
        .think-toggle:active {
            background-color: #444;
            transform: translateY(1px);
        }
        
        .think-content {
            background-color: #1e1e1e;
            border: 1px solid #333;
            border-radius: 4px;
            padding: 10px;
            margin-top: 5px;
            color: #bbb;
            font-size: 0.9rem;
        }
        
        .think-collapsible {
            margin: 8px 0;
        }
    `);
    document.adoptedStyleSheets.push(sheet);
    
    // Track the currently expanded thinking process
    unsafeWindow.currentExpandedThinkId = null;
    
    // Track the latest message with thinking content
    let latestThinkMessageId = null;
    
    // Define the toggleThink function and expose it globally
    unsafeWindow.toggleThink = function(id) {
        const thinkContent = document.getElementById(id);
        const button = thinkContent.previousElementSibling;
        
        // If clicking to expand this section
        if (thinkContent.style.display === "none") {
            // First, collapse the currently expanded section, if any
            if (unsafeWindow.currentExpandedThinkId && unsafeWindow.currentExpandedThinkId !== id) {
                const currentExpanded = document.getElementById(unsafeWindow.currentExpandedThinkId);
                if (currentExpanded) {
                    currentExpanded.style.display = "none";
                    const currentButton = currentExpanded.previousElementSibling;
                    if (currentButton) {
                        currentButton.textContent = "Show Thinking Process";
                    }
                }
            }
            
            // Then expand this section
            thinkContent.style.display = "block";
            button.textContent = "Hide Thinking Process";
            unsafeWindow.currentExpandedThinkId = id;
        } else {
            // Collapse this section
            thinkContent.style.display = "none";
            button.textContent = "Show Thinking Process";
            if (unsafeWindow.currentExpandedThinkId === id) {
                unsafeWindow.currentExpandedThinkId = null;
            }
        }
    };

    // Keep track of processed elements and their wrappers
    const processedElements = new Map();

    // Function to process think tags in content
    function processThinkTags(html, isLatest) {
        // Regular expressions for both encoded and non-encoded tags
        const encodedRegex = /(&lt;think&gt;)([\s\S]*?)(&lt;\/think&gt;)/g;
        const plainRegex = /(<think>)([\s\S]*?)(<\/think>)/g;

        // Process encoded tags
        html = html.replace(encodedRegex, (match, openTag, content, closeTag) => {
            const id = 'think-' + Math.random().toString(36).substr(2, 9);
            
            // Keep track of this ID if it's the latest message
            if (isLatest) {
                latestThinkMessageId = id;
                unsafeWindow.currentExpandedThinkId = id;
            }
            
            // Set display based on whether this is the latest message
            const displayStyle = isLatest ? "block" : "none";
            const buttonText = isLatest ? "Hide Thinking Process" : "Show Thinking Process";
            
            return `
                <div class="think-collapsible">
                    <button class="think-toggle" onclick="window.toggleThink('${id}')">
                        ${buttonText}
                    </button>
                    <div id="${id}" class="think-content" style="display: ${displayStyle};">
                        ${openTag}${content}${closeTag}
                    </div>
                </div>
            `;
        });

        // Process plain tags
        html = html.replace(plainRegex, (match, openTag, content, closeTag) => {
            const id = 'think-' + Math.random().toString(36).substr(2, 9);
            
            // Keep track of this ID if it's the latest message
            if (isLatest) {
                latestThinkMessageId = id;
                unsafeWindow.currentExpandedThinkId = id;
            }
            
            // Set display based on whether this is the latest message
            const displayStyle = isLatest ? "block" : "none";
            const buttonText = isLatest ? "Hide Thinking Process" : "Show Thinking Process";
            
            return `
                <div class="think-collapsible">
                    <button class="think-toggle" onclick="window.toggleThink('${id}')">
                        ${buttonText}
                    </button>
                    <div id="${id}" class="think-content" style="display: ${displayStyle};">
                        ${openTag}${content}${closeTag}
                    </div>
                </div>
            `;
        });

        return html;
    }

    // Function to process content with partially complete think tags
    function processPartialThinkTags(html, isLatest) {
        // Keep track if we have started a think section but haven't seen the end yet
        const hasOpeningThinkTag = html.includes('<think>') || html.includes('&lt;think&gt;');
        
        if (!hasOpeningThinkTag) {
            return html; // No think tag found, return unchanged
        }
        
        // Generate a unique ID for this think section
        const id = 'think-' + Math.random().toString(36).substr(2, 9);
        
        // Keep track of this ID if it's the latest message
        if (isLatest) {
            latestThinkMessageId = id;
            unsafeWindow.currentExpandedThinkId = id;
        }
        
        // Extract content after the opening tag
        let content = html;
        if (html.includes('<think>')) {
            content = html.replace(/<think>/, '');
        } else if (html.includes('&lt;think&gt;')) {
            content = html.replace(/&lt;think&gt;/, '');
        }
        
        // Set display based on whether this is the latest message
        const displayStyle = isLatest ? "block" : "none";
        const buttonText = isLatest ? "Hide Thinking Process" : "Show Thinking Process";
        
        // Create the collapsible UI with the content so far
        return `
            <div class="think-collapsible">
                <button class="think-toggle" onclick="window.toggleThink('${id}')">
                    ${buttonText}
                </button>
                <div id="${id}" class="think-content" style="display: ${displayStyle};">
                    ${content}
                </div>
            </div>
        `;
    }

    // Function to create a wrapper for the message content
    function makeThinkContentCollapsible() {
        // Find all elements with class "msg-content"
        const messageContents = document.querySelectorAll('.msg-content');
        const messageArray = Array.from(messageContents);
        
        // Get the latest message (last in the DOM)
        const latestMessage = messageArray[messageArray.length - 1];

        messageContents.forEach(originalElement => {
            // Skip if we've already processed this element
            if (processedElements.has(originalElement)) {
                return;
            }

            // Create a wrapper div to contain both original and display elements
            const wrapper = document.createElement('div');
            wrapper.className = 'think-wrapper';

            // Create a display element that will show the processed content
            const displayElement = document.createElement('div');
            displayElement.className = 'think-display';

            // Place the original element in the wrapper
            originalElement.parentNode.insertBefore(wrapper, originalElement);
            wrapper.appendChild(originalElement);

            // Add the display element to the wrapper
            wrapper.appendChild(displayElement);

            // Check if this is the latest message
            const isLatest = originalElement === latestMessage;

            // Set up a MutationObserver to watch for changes in the original element
            const observer = new MutationObserver(() => {
                // Get the updated content
                const originalContent = originalElement.innerHTML;
                
                // Check if content contains opening think tag
                const hasThinkTag = originalContent.includes('<think>') || 
                                    originalContent.includes('&lt;think&gt;');
                
                // Check if content contains both opening and closing think tags
                const hasCompleteThinkTags = (originalContent.includes('<think>') && originalContent.includes('</think>')) || 
                                           (originalContent.includes('&lt;think&gt;') && originalContent.includes('&lt;/think&gt;'));
                
                if (hasThinkTag) {
                    // If we have complete think tags, use the original processor
                    if (hasCompleteThinkTags) {
                        const processedContent = processThinkTags(originalContent, isLatest);
                        displayElement.innerHTML = processedContent;
                    } else {
                        // Otherwise use the partial processor for in-progress thinking
                        const processedContent = processPartialThinkTags(originalContent, isLatest);
                        displayElement.innerHTML = processedContent;
                    }
                    
                    originalElement.style.display = 'none';
                    displayElement.style.display = 'block';
                } else {
                    // No think tags, show original content
                    displayElement.style.display = 'none';
                    originalElement.style.display = 'block';
                }
            });

            // Start observing
            observer.observe(originalElement, {
                childList: true,
                characterData: true,
                subtree: true
            });

            // Store reference to processed element
            processedElements.set(originalElement, {
                wrapper,
                displayElement,
                observer
            });

            // Initial check
            const originalContent = originalElement.innerHTML;
            const hasThinkTag = originalContent.includes('<think>') || 
                              originalContent.includes('&lt;think&gt;');
            
            if (hasThinkTag) {
                const hasCompleteThinkTags = (originalContent.includes('<think>') && originalContent.includes('</think>')) || 
                                          (originalContent.includes('&lt;think&gt;') && originalContent.includes('&lt;/think&gt;'));
                
                if (hasCompleteThinkTags) {
                    const processedContent = processThinkTags(originalContent, isLatest);
                    displayElement.innerHTML = processedContent;
                } else {
                    const processedContent = processPartialThinkTags(originalContent, isLatest);
                    displayElement.innerHTML = processedContent;
                }
                originalElement.style.display = 'none';
                displayElement.style.display = 'block';
            }
        });
    }

    // Run the function periodically
    setInterval(makeThinkContentCollapsible, 500);
})();