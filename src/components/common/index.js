// Common UI Components Export
export { DataTable } from '../DataTable/DataTable.js';
export { ProgressBar, CircularProgressBar } from '../ProgressBar/ProgressBar.js';
export { Modal } from '../Modal/Modal.js';
export { Toast, ToastManager, toastManager } from '../Toast/Toast.js';
export { StyledDropdown } from '../StyledDropdown/StyledDropdown.js';

// Re-export commonly used utilities
export const UIComponents = {
    DataTable: () => import('../DataTable/DataTable.js').then(m => m.DataTable),
    ProgressBar: () => import('../ProgressBar/ProgressBar.js').then(m => m.ProgressBar),
    Modal: () => import('../Modal/Modal.js').then(m => m.Modal),
    Toast: () => import('../Toast/Toast.js').then(m => m.Toast),
    StyledDropdown: () => import('../StyledDropdown/StyledDropdown.js').then(m => m.StyledDropdown)
};

// Helper function to show toast notifications
export const showToast = {
    success: (message, options) => toastManager.success(message, options),
    error: (message, options) => toastManager.error(message, options),
    warning: (message, options) => toastManager.warning(message, options),
    info: (message, options) => toastManager.info(message, options)
};

// Helper function to show modal dialogs
export const showModal = {
    confirm: (options) => Modal.confirm(options),
    alert: (options) => Modal.alert(options),
    prompt: (options) => Modal.prompt(options)
};