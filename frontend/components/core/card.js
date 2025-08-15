// Card Component

class CardComponent extends BaseComponent {
    getDefaultProps() {
        return {
            title: '',
            subtitle: '',
            content: '',
            footer: null,
            expandable: false,
            collapsible: false,
            collapsed: false,
            actions: [],
            image: null,
            imagePosition: 'top',
            variant: 'default',
            className: ''
        };
    }

    async createHTML() {
        const { title, subtitle, content, footer, className, variant } = this.props;
        
        const classes = [
            'card',
            `card--${variant}`,
            className
        ].filter(Boolean).join(' ');

        return `
            <div class="${classes}">
                ${title ? `
                    <div class="card__header">
                        <h3 class="card__title">${title}</h3>
                        ${subtitle ? `<p class="card__subtitle">${subtitle}</p>` : ''}
                    </div>
                ` : ''}
                <div class="card__body">
                    ${content}
                </div>
                ${footer ? `<div class="card__footer">${footer}</div>` : ''}
            </div>
        `;
    }
}

window.CardComponent = CardComponent;