import { loadComponent, loadComponentCSS } from './componentLoader.js';
import { fetchAuthenticatedData } from './api.js';

function updateActiveSidebarLink(pageName) {
    const pageNameWithoutSuffix = pageName.replace(/Page$/, '');
    const pageId = pageNameWithoutSuffix.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });
}

function setupHeaderDropdown(loadPage) {
    const avatar = document.getElementById('user-avatar');
    const dropdown = document.getElementById('user-dropdown');
    if (!avatar || !dropdown) return;

    // Toggle dropdown on avatar click
    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    // Handle dropdown item clicks using event delegation
    dropdown.addEventListener('click', (e) => {
        const target = e.target.closest('.dropdown-item');
        if (target) {
            if (target.classList.contains('logout-item')) {
                // Handle logout
                localStorage.removeItem('token');
                localStorage.removeItem('currentPage');
                window.location.reload();
            } else {
                const page = target.dataset.page;
                if (page) {
                    // Convert kebab-case to PascalCase for page loading
                    const pageName = page.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('') + 'Page';
                    loadPage(pageName);
                }
            }
            dropdown.classList.remove('show'); // Hide dropdown after click
        }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== avatar) {
            dropdown.classList.remove('show');
        }
    });
}

function setupThemeSwitcher() {
    const themeIcon = document.getElementById('theme-icon');
    if (!themeIcon) return;

    const updateThemeIcon = () => {
        if (document.body.classList.contains('dark-mode')) {
            themeIcon.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            themeIcon.innerHTML = '<i class="fas fa-sun"></i>';
        }
    };

    themeIcon.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        updateThemeIcon();
    });

    updateThemeIcon(); // Set initial icon
}

async function updateTokenBalance() {
    try {
        // Use the token sync service if available
        if (window.tokenSyncService) {
            await window.tokenSyncService.forceUpdate();
        } else {
            // Fallback to direct API call
            const balanceData = await fetchAuthenticatedData('/api/tokens/balance');
            if (balanceData) {
                const tokenAmountElement = document.querySelector('.sidebar .token-amount');
                if (tokenAmountElement) {
                    // Format the balance with K/M suffixes
                    const formattedBalance = formatTokenAmount(balanceData.current_balance || 0);
                    tokenAmountElement.textContent = formattedBalance;
                    
                    // Store in localStorage
                    const userData = localStorage.getItem('user');
                    if (userData) {
                        try {
                            const user = JSON.parse(userData);
                            user.token_balance = balanceData.current_balance || 0;
                            localStorage.setItem('user', JSON.stringify(user));
                        } catch (e) {
                            console.error('Failed to update user data:', e);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Failed to update token balance:', error);
        // Try to use cached value from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const tokenAmountElement = document.querySelector('.sidebar .token-amount');
                if (tokenAmountElement && user.token_balance !== undefined) {
                    tokenAmountElement.textContent = formatTokenAmount(user.token_balance);
                }
            } catch (e) {
                // Keep default value
            }
        }
    }
}

function formatTokenAmount(amount) {
    // Handle zero and small values
    if (amount === 0) {
        return '0';
    }
    if (amount < 1000) {
        return amount.toLocaleString();
    }
    // Apply K/M formatting only for 1000+
    if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
}

async function setupChat() {
    await loadComponent('Chat/Chat', '#chat-container');
    loadComponentCSS('src/components/Chat/Chat.css');
    const chatIcon = document.getElementById('chat-icon');
    const chatWindow = document.getElementById('chat-window');
    const closeChat = document.getElementById('close-chat');

    if (chatIcon) {
        chatIcon.addEventListener('click', () => {
            chatWindow.classList.toggle('hidden');
        });
    }

    if (closeChat) {
        closeChat.addEventListener('click', () => {
            chatWindow.classList.add('hidden');
        });
    }
}

export { updateActiveSidebarLink, setupHeaderDropdown, setupThemeSwitcher, setupChat, updateTokenBalance };
