function setupDataGenerator() {
    const rowsInput = document.getElementById('rows');
    const columnsInput = document.getElementById('columns');
    const fileSizeElement = document.getElementById('file-size');
    const tokenCostElement = document.getElementById('token-cost');

    if (!rowsInput || !columnsInput || !fileSizeElement || !tokenCostElement) return;

    function updateEstimates() {
        const rows = parseInt(rowsInput.value, 10) || 0;
        const columns = parseInt(columnsInput.value, 10) || 0;

        // Simple estimation logic (can be refined)
        const estimatedBytes = rows * columns * 10; // Assume 10 bytes per cell
        const estimatedFileSize = (estimatedBytes / 1024).toFixed(2);
        const estimatedTokenCost = rows * columns;

        fileSizeElement.textContent = `${estimatedFileSize} KB`;
        tokenCostElement.textContent = estimatedTokenCost;
    }

    rowsInput.addEventListener('input', updateEstimates);
    columnsInput.addEventListener('input', updateEstimates);

    updateEstimates();
}

export { setupDataGenerator };
