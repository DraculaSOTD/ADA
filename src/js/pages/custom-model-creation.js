import { modelCreationPage } from './model-creation.js';

async function setupCustomModelCreationPage() {
    // Initialize the model creation page with styled dropdowns and cost calculation
    await modelCreationPage.initialize();
}

export { setupCustomModelCreationPage };
