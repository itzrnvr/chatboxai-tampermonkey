// ==UserScript==
// @name         ElectronHub API Credits Checker
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

    // Add the CSS styles
    const style = document.createElement('style');
    style.textContent = `
        .fetch-creditBtn {
            background-color: transparent !important;
            color: #5a5b5b !important;
            border-radius: 4px;
            padding: 5px 14px;
            margin-right: 8px;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid #5a5b5b;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .fetch-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #5a5b5b;
            border-radius: 50%;
            border-top: 2px solid transparent;
            animation: spin 1s linear infinite;
            display: none;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Function to create a button with API key handling
    function createApiButton(text, apiKey) {
        const button = document.createElement('button');
        button.className = 'fetch-creditBtn';
        
        // Create spinner inside the button
        const spinner = document.createElement('div');
        spinner.className = 'fetch-spinner';
        button.appendChild(spinner);
        
        // Add text to button
        const textNode = document.createTextNode(text);
        button.appendChild(textNode);
        
        // Add click event listener
        button.addEventListener('click', function() {
            console.log(`Fetching credits for ${text}`);
            spinner.style.display = 'inline-block'; // Show spinner when clicked
            
            // Make the API request
            fetch('https://api.electronhub.top/user/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            })
            .then(response => response.json())
            .then(data => {
                // Format numbers with commas
                const availableCredits = Number(data.credits).toLocaleString();
                const totalDailyCredits = Number(data.daily_credits).toLocaleString();
                
                // Update the button text with the credit information
                button.textContent = `Available: ${availableCredits}`;
                
                // Add spinner back after text update
                button.prepend(spinner);
                
                // Log the results
                console.log(`Total daily: ${totalDailyCredits}`);
                console.log(`Available: ${availableCredits}`);
            })
            .catch(error => {
                console.error('Error fetching credits:', error);
                button.textContent = 'Error fetching';
                // Add spinner back after text update
                button.prepend(spinner);
            })
            .finally(() => {
                spinner.style.display = 'none'; // Hide spinner when done
            });
        });
        
        return button;
    }
    
    // Function to find the parent div and insert our buttons
    function findTargetAndInsertButtons() {
        // Find the div that contains both a search button and 'HistoryIcon'
        const parentDiv = document.querySelector('[class*="MuiButtonBase-root"][class*="MuiButton-outlined"][class*="transform-none"][class*="opacity-30"][class*="css-1054deo"]')?.parentElement;
        
        // If we found the parentDiv, insert buttons
        if (parentDiv) {
            // Check if we already added our buttons to avoid duplicates
            if (parentDiv.querySelector('.fetch-creditBtn')) {
                return true; // Buttons already exist
            }
            
            // Create the first button (with the new API key)
            const firstButton = createApiButton('Fetch Credits ElectroStupidity', 'apkey');
            
            // Create the second button (with the original API key)
            const secondButton = createApiButton('Fetch Credits ElectroRandy', 'apikey');
            
            // Insert buttons as the first children (in reverse order so first is leftmost)
            parentDiv.prepend(secondButton);
            parentDiv.prepend(firstButton);
            
            console.log('Buttons inserted successfully!');
            return true; // Found and inserted
        }
        
        return false; // Not found yet
    }
    
    // Try immediately in case the element is already on the page
    if (!findTargetAndInsertButtons()) {
        // If not found, set up an interval to keep trying
        console.log('Target div not found initially, setting up polling...');
        const checkInterval = setInterval(() => {
            if (findTargetAndInsertButtons()) {
                // If the buttons were successfully inserted, clear the interval
                console.log('Target div found after polling, buttons inserted.');
                clearInterval(checkInterval);
            }
        }, 1000); // Check every second
        
        // Stop checking after a reasonable timeout (30 seconds)
        setTimeout(() => {
            clearInterval(checkInterval);
            console.log('Stopped looking for target div after timeout');
        }, 30000);
    }
})();