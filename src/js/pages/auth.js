import { fetchData } from '../services/api.js';
import { loadPage } from '../services/router.js';

function setupAuthPage() {
    const signInForm = document.getElementById('sign-in-form');
    const signUpForm = document.getElementById('sign-up-form');
    const signInTab = document.querySelector('.auth-tab[data-tab="sign-in"]');
    const signUpTab = document.querySelector('.auth-tab[data-tab="sign-up"]');

    // Initial state: ensure sign-in form is active and sign-up form is hidden
    if (signInForm && signUpForm) {
        signInForm.classList.add('active-form');
        signUpForm.classList.remove('active-form');
    }

    // Handle tab switching
    if (signInTab && signUpTab) {
        signInTab.addEventListener('click', () => {
            signInTab.classList.add('active');
            signUpTab.classList.remove('active');
            signInForm.classList.add('active-form');
            signUpForm.classList.remove('active-form');
            signInForm.style.display = 'block';
            signUpForm.style.display = 'none';
        });

        signUpTab.addEventListener('click', () => {
            signUpTab.classList.add('active');
            signInTab.classList.remove('active');
            signUpForm.classList.add('active-form');
            signInForm.classList.remove('active-form');
            signUpForm.style.display = 'block';
            signInForm.style.display = 'none';
        });
    }

    // Handle password toggles
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const wrapper = toggle.closest('.password-input-wrapper');
            const passwordInput = wrapper.querySelector('input[type="password"], input[type="text"]');
            const icon = toggle.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Handle sign-in form submission
    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = signInForm.querySelector('#email').value.trim();
            const password = signInForm.querySelector('#password').value.trim();

            // Validate inputs
            if (!email || !password) {
                alert('Please enter both email and password');
                return;
            }

            // Debug logging
            console.log('Login attempt with email:', email);
            console.log('Password length:', password.length);

            // FastAPI's OAuth2PasswordRequestForm expects form data
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            console.log('Sending login request with form data:', formData.toString());

            const data = await fetchData('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (data && data.error) {
                alert(`Login failed: ${data.message}`);
            } else if (data && data.access_token) {
                localStorage.setItem('token', data.access_token);
                // Store user data for reference
                const userData = {
                    email: email,
                    token_balance: 0 // Will be updated after fetching
                };
                localStorage.setItem('user', JSON.stringify(userData));
                // Store login time to handle timing issues
                localStorage.setItem('loginTime', Date.now().toString());
                
                // Fetch initial token balance
                try {
                    const balanceResponse = await fetchAuthenticatedData('/api/tokens/balance');
                    if (balanceResponse && balanceResponse.current_balance !== undefined) {
                        userData.token_balance = balanceResponse.current_balance;
                        localStorage.setItem('user', JSON.stringify(userData));
                    }
                } catch (error) {
                    console.error('Failed to fetch initial token balance:', error);
                }
                
                loadPage('DashboardPage');
            } else {
                alert('Login failed! Please check your credentials.');
            }
        });
    }

    // Handle sign-up form submission
    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = signUpForm.querySelector('#full-name').value;
            const email = signUpForm.querySelector('#signup-email').value;
            const phoneNumber = signUpForm.querySelector('#phone-number').value;
            const password = signUpForm.querySelector('#signup-password').value;
            const data = await fetchData('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: fullName, email, phone_number: phoneNumber, password })
            });
            if (data) {
                // Automatically log in after registration
                const formData = new URLSearchParams();
                formData.append('username', email);
                formData.append('password', password);

                const loginData = await fetchData('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });
                if (loginData && loginData.access_token) {
                    localStorage.setItem('token', loginData.access_token);
                    // Store user data for reference
                    const userData = {
                        email: email,
                        full_name: fullName,
                        token_balance: 1000 // New users get 1000 tokens
                    };
                    localStorage.setItem('user', JSON.stringify(userData));
                    localStorage.setItem('loginTime', Date.now().toString());
                    
                    // Fetch initial token balance
                    try {
                        const balanceResponse = await fetchAuthenticatedData('/api/tokens/balance');
                        if (balanceResponse && balanceResponse.current_balance !== undefined) {
                            userData.token_balance = balanceResponse.current_balance;
                            localStorage.setItem('user', JSON.stringify(userData));
                        }
                    } catch (error) {
                        console.error('Failed to fetch initial token balance:', error);
                    }
                    
                    loadPage('DashboardPage');
                } else {
                    alert('Registration succeeded, but login failed.');
                    loadPage('AuthPage');
                }
            } else {
                alert('Registration failed!');
            }
        });
    }
}

export { setupAuthPage };
