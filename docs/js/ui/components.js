// components.js - Reusable UI components

// Create a loading spinner
function createSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.innerHTML = `
        <div class="spinner-inner"></div>
        <div class="spinner-text">Loading...</div>
    `;
    return spinner;
}

// Create an error message
function createErrorMessage(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.innerHTML = `
        <div class="error-icon">!</div>
        <div class="error-text">${message}</div>
    `;
    return error;
}

// Create a success message
function createSuccessMessage(message) {
    const success = document.createElement('div');
    success.className = 'success-message';
    success.innerHTML = `
        <div class="success-icon">✓</div>
        <div class="success-text">${message}</div>
    `;
    return success;
}

// Create a button with loading state
function createButton(text, onClick, options = {}) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = options.className || '';
    button.disabled = options.disabled || false;
    
    if (onClick) {
        button.addEventListener('click', async () => {
            try {
                button.disabled = true;
                button.textContent = 'Loading...';
                await onClick();
            } catch (error) {
                console.error('Button action failed:', error);
                button.textContent = text;
                button.disabled = false;
            }
        });
    }
    
    return button;
}

// Create a table with headers and data
function createTable(headers, data, options = {}) {
    const table = document.createElement('table');
    table.className = options.className || '';
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cellData, index) => {
            const td = document.createElement('td');
            
            // Check if a custom renderer is provided for this column
            if (options.columnRenderers && options.columnRenderers[index]) {
                options.columnRenderers[index](cellData, td);
            } else if (options.landIdColumns && options.landIdColumns.includes(index)) {
                createLandIdCell(cellData, td);
            } else {
                td.textContent = cellData;
            }
            
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    return table;
}

// Create a land ID cell with history button
function createLandIdCell(landId, container) {
    // Create a wrapper div for the land ID and button
    const wrapper = document.createElement('div');
    wrapper.className = 'land-id-cell';
    
    // Add the land ID text
    const idSpan = document.createElement('span');
    idSpan.textContent = landId;
    wrapper.appendChild(idSpan);
    
    // Add the history button
    const button = document.createElement('button');
    button.className = 'history-btn';
    button.textContent = 'Show History';
    button.onclick = async () => {
        button.disabled = true;
        window.showHistoryModal('<div class="modal-loading">Loading history...</div>');
        
        try {
            const provider = window.getProvider();
            const contract = await window.getContract(provider);
            
            // Get ownership history
            const ownershipHistory = await contract.getCompleteOwnershipHistory(landId);
            
            // Get transfer history
            const transferHistory = await contract.getTransferHistory(landId);
            
            // Format the data for display
            const formattedOwnershipHistory = ownershipHistory.map(record => ({
                owner: record.owner,
                shares: record.shares.toString(),
                timestamp: record.timestamp.toString(),
                action: record.action,
                from: record.from,
                to: record.to
            }));
            
            const formattedTransferHistory = transferHistory.map(record => ({
                from: record.from,
                to: record.to,
                shares: record.shares.toString(),
                timestamp: record.timestamp.toString(),
                price: ethers.utils.formatEther(record.price)
            }));
            
            window.renderSearchResults(landId, formattedOwnershipHistory, formattedTransferHistory);
        } catch (error) {
            console.error('Error fetching land history:', error);
            window.showHistoryModal(`<p style="color:red">Error: ${error.message}</p>`);
        } finally {
            button.disabled = false;
        }
    };
    
    wrapper.appendChild(button);
    container.appendChild(wrapper);
}

// Create a form with fields
function createForm(fields, onSubmit, options = {}) {
    const form = document.createElement('form');
    form.className = options.className || '';
    
    fields.forEach(field => {
        const label = document.createElement('label');
        label.textContent = field.label;
        
        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.name = field.name;
        input.placeholder = field.placeholder || '';
        input.required = field.required || false;
        
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'form-field';
        fieldContainer.appendChild(label);
        fieldContainer.appendChild(input);
        form.appendChild(fieldContainer);
    });
    
    const submitButton = createButton(options.submitText || 'Submit', onSubmit);
    form.appendChild(submitButton);
    
    return form;
}

// Expose components globally
window.createSpinner = createSpinner;
window.createErrorMessage = createErrorMessage;
window.createSuccessMessage = createSuccessMessage;
window.createButton = createButton;
window.createTable = createTable;
window.createForm = createForm;
window.createLandIdCell = createLandIdCell; 