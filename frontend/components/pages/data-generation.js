// Data Generation Page Component

class DataGenerationPage extends BaseComponent {
    getDefaultProps() {
        return {
            apiService: null
        };
    }

    async createHTML() {
        return `
            <div class="data-generation">
                <h1>Data Generation</h1>
                <div class="generation-form">
                    <h2>Configure Data Generation</h2>
                    <div class="form-group">
                        <label>Number of Rows</label>
                        <input type="number" id="row-count" value="1000" min="100" max="1000000">
                    </div>
                    <div class="form-group">
                        <label>Complexity</label>
                        <select id="complexity">
                            <option value="simple">Simple</option>
                            <option value="moderate" selected>Moderate</option>
                            <option value="complex">Complex</option>
                        </select>
                    </div>
                    <button class="btn btn--primary" id="generate-btn">Generate Data</button>
                </div>
                <div id="generation-result"></div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('#generate-btn', 'click', () => this.generateData());
    }

    async generateData() {
        const rowCount = this.find('#row-count').value;
        const complexity = this.find('#complexity').value;
        
        try {
            const response = await this.props.apiService.post('/data/generate', {
                rows: rowCount,
                complexity: complexity
            });
            
            if (response.success) {
                window.app.showNotification('Data generated successfully!', 'success');
                this.displayResult(response.data);
            }
        } catch (error) {
            window.app.showError('Failed to generate data');
        }
    }

    displayResult(data) {
        const resultDiv = this.find('#generation-result');
        resultDiv.innerHTML = `
            <h3>Generation Complete</h3>
            <p>Generated ${data.rows} rows of ${data.complexity} complexity data</p>
            <a href="${data.downloadUrl}" class="btn btn--primary">Download Data</a>
        `;
    }
}

window.DataGenerationPage = DataGenerationPage;