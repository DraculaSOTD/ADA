// ProgressBar Component

class ProgressBarComponent extends BaseComponent {
    getDefaultProps() {
        return {
            value: 0,
            max: 100,
            label: '',
            showPercentage: true,
            variant: 'primary',
            striped: false,
            animated: false,
            size: 'md',
            className: ''
        };
    }

    async createHTML() {
        const { value, max, label, showPercentage, variant, striped, animated, size, className } = this.props;
        
        const percentage = Math.round((value / max) * 100);
        
        const classes = [
            'progress',
            `progress--${size}`,
            className
        ].filter(Boolean).join(' ');

        const barClasses = [
            'progress__bar',
            `progress__bar--${variant}`,
            striped ? 'progress__bar--striped' : '',
            animated ? 'progress__bar--animated' : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="${classes}">
                ${label ? `<div class="progress__label">${label}</div>` : ''}
                <div class="progress__track">
                    <div class="${barClasses}" style="width: ${percentage}%">
                        ${showPercentage ? `<span class="progress__text">${percentage}%</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    setValue(value) {
        this.update({ value });
    }
}

window.ProgressBarComponent = ProgressBarComponent;