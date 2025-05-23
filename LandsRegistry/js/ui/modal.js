// modal.js - Reusable modal component for displaying land history

class Modal {
    constructor() {
        this.modal = null;
        this.content = null;
        this.isOpen = false;
    }

    create() {
        if (this.modal) return;

        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Land History</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body"></div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Add event listeners
        this.modal.querySelector('.close-btn').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        this.content = this.modal.querySelector('.modal-body');
    }

    open(content) {
        if (!this.modal) this.create();
        this.content.innerHTML = content;
        this.modal.classList.add('active');
        this.isOpen = true;
    }

    close() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
        this.isOpen = false;
    }

    setContent(content) {
        if (!this.modal) this.create();
        this.content.innerHTML = content;
    }
}

// Create a singleton instance
const modal = new Modal();
window.showHistoryModal = (content) => modal.open(content);
window.closeHistoryModal = () => modal.close(); 