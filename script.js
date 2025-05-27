document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const productForm = document.getElementById('product-form');
    const formTitleEl = document.getElementById('form-title');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productCategoryInput = document.getElementById('product-category');
    const productQuantityInput = document.getElementById('product-quantity');
    const productPriceInput = document.getElementById('product-price');
    const productMinStockInput = document.getElementById('product-min-stock');
    const productImageInput = document.getElementById('product-image');
    const productListContainer = document.getElementById('product-list-container');
    const emptyStateMessageEl = document.getElementById('empty-state-message');
    const addFirstProductBtn = document.getElementById('add-first-product-btn');

    const btnSaveProduct = document.getElementById('btn-save-product');
    const btnClearForm = document.getElementById('btn-clear-form');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');

    const searchInput = document.getElementById('search-input');
    const categoryFilterInput = document.getElementById('category-filter');
    const sortByInput = document.getElementById('sort-by');

    const themeToggle = document.getElementById('theme-toggle');
    const themeText = document.getElementById('theme-text');
    const themeIcon = themeToggle.querySelector('i');

    const totalProductsDbEl = document.getElementById('total-products-db');
    const totalValueDbEl = document.getElementById('total-value-db');
    const lowStockCountDbEl = document.getElementById('low-stock-count-db');
    // const dbTotalValueItem = document.getElementById('db-total-value'); // Mantido para referência, não usado para click
    const dbLowStockItem = document.getElementById('db-low-stock-count');

    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const currentPageInfoEl = document.getElementById('current-page-info');

    const historyModal = document.getElementById('history-modal');
    const historyProductNameModalEl = document.getElementById('history-product-name-modal');
    const historyListEl = document.getElementById('history-list');
    const noHistoryMessage = historyModal.querySelector('#no-history');
    const closeModalBtn = historyModal.querySelector('.close-button');

    const toastContainer = document.getElementById('toast-container');

    // --- State ---
    let products = JSON.parse(localStorage.getItem('controleEstoqueSBB_v1_2')) || []; // Nome da chave do localStorage atualizado
    let editingProductId = null;
    let currentPage = 1;
    const itemsPerPage = 6;
    let globalTotalInventoryValue = 0;

    // --- THEME ---
    const applyTheme = (theme, initial = false) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            themeText.textContent = 'Tema Claro';
        } else {
            document.body.classList.remove('dark-mode');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            themeText.textContent = 'Tema Escuro';
        }
        if (!initial) showToast(`Tema alterado para ${theme === 'dark' ? 'Escuro' : 'Claro'}.`, 'info');
    };

    const toggleTheme = () => {
        const currentTheme = localStorage.getItem('themeSBB_v1_2') || 'light'; // Nome da chave do tema atualizado
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeSBB_v1_2', newTheme);
        applyTheme(newTheme);
    };
    themeToggle.addEventListener('click', toggleTheme);
    applyTheme(localStorage.getItem('themeSBB_v1_2') || 'light', true);


    // --- TOAST NOTIFICATIONS ---
    const showToast = (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.classList.add('toast', type);
        toast.setAttribute('role', 'alert');
        let iconClass = 'fas fa-info-circle';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
        else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

        toast.innerHTML = `<i class="${iconClass}"></i> ${message}`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, duration);
    };


    // --- LOCAL STORAGE ---
    const saveProducts = () => {
        localStorage.setItem('controleEstoqueSBB_v1_2', JSON.stringify(products));
    };


    // --- FORM VALIDATION & INPUT HANDLING ---
    const validateField = (field) => {
        const errorEl = field.parentElement.querySelector('.error-message') || (field.parentElement.parentElement.querySelector('.error-message'));
        let isValid = true;
        let errorMessage = '';

        field.classList.remove('input-error');
        if (errorEl) errorEl.textContent = '';

        if (field.hasAttribute('required') && !field.value.trim()) {
            isValid = false;
            errorMessage = 'Este campo é obrigatório.';
        } else if (field.type === 'number') {
            const numValue = parseFloat(field.value);
            const min = parseFloat(field.min);
            if (isNaN(numValue)) {
                 if (field.hasAttribute('required') || field.value.trim() !== '') {
                    isValid = false;
                    errorMessage = 'Por favor, insira um número válido.';
                 }
            } else if (!isNaN(min) && numValue < min) {
                isValid = false;
                errorMessage = `O valor deve ser no mínimo ${min}.`;
            }
        } else if (field.type === 'url' && field.value.trim() && !/^https?:\/\/.+\..+/.test(field.value.trim())) {
            isValid = false;
            errorMessage = 'Por favor, insira uma URL válida (ex: http://site.com).';
        }

        if (!isValid && errorEl) {
            field.classList.add('input-error');
            errorEl.textContent = errorMessage;
        }
        return isValid;
    };

    const validateForm = () => {
        let isFormValid = true;
        [productNameInput, productPriceInput, productQuantityInput, productMinStockInput].forEach(input => {
            if (!validateField(input)) isFormValid = false;
        });
        if (productImageInput.value.trim()) {
            if (!validateField(productImageInput)) isFormValid = false;
        }
        return isFormValid;
    };

    [productNameInput, productPriceInput, productQuantityInput, productMinStockInput, productImageInput].forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            if(input.classList.contains('input-error')) {
                input.classList.remove('input-error');
                const errorEl = input.parentElement.querySelector('.error-message') || (input.parentElement.parentElement.querySelector('.error-message'));
                if (errorEl) errorEl.textContent = '';
            }
        });
    });

    // --- PRODUCT HISTORY ---
    const addHistoryEntry = (productId, action, details) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            product.history = product.history || [];
            product.history.unshift({ date: new Date().toISOString(), action, details });
            if (product.history.length > 20) product.history.pop();
        }
    };


    // --- DASHBOARD ---
    const updateDashboard = () => {
        totalProductsDbEl.textContent = products.length;
        globalTotalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        totalValueDbEl.textContent = `R$ ${globalTotalInventoryValue.toFixed(2).replace('.', ',')}`;
        const lowStockCount = products.filter(p => p.quantity < p.minStock).length;
        lowStockCountDbEl.textContent = lowStockCount;
    };

    dbLowStockItem.addEventListener('click', () => {
        categoryFilterInput.value = '--LOW-STOCK--';
        searchInput.value = '';
        currentPage = 1;
        showToast('Filtrando por estoque baixo.', 'info');
        renderProducts();
    });


    // --- RENDERING PRODUCTS ---
    const renderProducts = (filterOverride = null) => {
        let filteredProducts = [...products];

        if (filterOverride === '--LOW-STOCK--') {
            filteredProducts = filteredProducts.filter(p => p.quantity < p.minStock);
            categoryFilterInput.value = '--LOW-STOCK--';
        } else {
            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) {
                filteredProducts = filteredProducts.filter(p =>
                    p.name.toLowerCase().includes(searchTerm) ||
                    (p.category && p.category.toLowerCase().includes(searchTerm))
                );
            }
            const selectedCategory = categoryFilterInput.value;
            if (selectedCategory && selectedCategory !== '--LOW-STOCK--') {
                filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
            } else if (selectedCategory === '--LOW-STOCK--') {
                 filteredProducts = filteredProducts.filter(p => p.quantity < p.minStock);
            }
        }

        const sortBy = sortByInput.value;
        switch (sortBy) {
            case 'name-asc': filteredProducts.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'name-desc': filteredProducts.sort((a, b) => b.name.localeCompare(a.name)); break;
            case 'price-asc': filteredProducts.sort((a, b) => a.price - b.price); break;
            case 'price-desc': filteredProducts.sort((a, b) => b.price - a.price); break;
            case 'quantity-asc': filteredProducts.sort((a, b) => a.quantity - b.quantity); break;
            case 'quantity-desc': filteredProducts.sort((a, b) => b.quantity - a.quantity); break;
            case 'added-desc': filteredProducts.sort((a,b) => new Date(b.addedDate) - new Date(a.addedDate)); break;
            case 'value-desc': filteredProducts.sort((a,b) => (b.price * b.quantity) - (a.price * a.quantity)); break;
            case 'value-asc': filteredProducts.sort((a,b) => (a.price * a.quantity) - (b.price * b.quantity)); break;
        }

        const totalItems = filteredProducts.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

        productListContainer.innerHTML = '';

        if (totalItems === 0) {
            emptyStateMessageEl.style.display = 'flex';
        } else {
            emptyStateMessageEl.style.display = 'none';
            paginatedProducts.forEach(product => {
                const card = document.createElement('div');
                card.classList.add('product-card');
                if (product.quantity < product.minStock) {
                    card.classList.add('low-stock-indicator');
                }
                card.dataset.id = product.id;
                card.setAttribute('role', 'listitem');
                card.classList.add('card-enter');
                requestAnimationFrame(() => card.classList.remove('card-enter'));

                const defaultImage = 'https://via.placeholder.com/280x180.png?text=Indispon%C3%ADvel';
                const imageSrc = product.image || defaultImage;
                const productValue = product.price * product.quantity;
                const percentageOfTotal = globalTotalInventoryValue > 0 ? (productValue / globalTotalInventoryValue) * 100 : 0;

                card.innerHTML = `
                    <img src="${imageSrc}" alt="${product.name}" onerror="this.onerror=null;this.src='${defaultImage}';">
                    <h3>${product.name}</h3>
                    ${product.category ? `<span class="category">${product.category}</span>` : ''}
                    <p><strong>Preço Unit.:</strong> R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</p>
                    <p><strong>Em Estoque:</strong> ${product.quantity} (Mín: ${product.minStock})</p>
                    <div class="stock-value-info">
                        <p><strong>Valor em Estoque:</strong> R$ ${productValue.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Representa:</strong> ${percentageOfTotal.toFixed(2).replace('.', ',')}% do total</p>
                    </div>
                    <div class="actions">
                        <button class="btn-edit" onclick="prepareEditProduct('${product.id}')" data-tooltip="Editar Produto"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn-delete" onclick="deleteProduct('${product.id}')" data-tooltip="Excluir Produto"><i class="fas fa-trash-alt"></i> Excluir</button>
                        <button class="btn-history" onclick="showProductHistory('${product.id}')" data-tooltip="Ver Histórico"><i class="fas fa-history"></i> Histórico</button>
                    </div>
                `;
                productListContainer.appendChild(card);
            });
        }
        updatePaginationControls(totalPages, totalItems);
        updateDashboard();
    };


    // --- PAGINATION CONTROLS ---
    const updatePaginationControls = (totalPages, totalItems) => {
        currentPageInfoEl.textContent = totalItems > 0 ? `Página ${currentPage} de ${totalPages}` : 'Nenhum item';
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    };

    prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderProducts(); } });
    nextPageBtn.addEventListener('click', () => {
        let filteredForTotal = [...products];
        const currentFilter = categoryFilterInput.value;
        if (currentFilter === '--LOW-STOCK--') {
            filteredForTotal = filteredForTotal.filter(p => p.quantity < p.minStock);
        } else {
            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) {
                filteredForTotal = filteredForTotal.filter(p => p.name.toLowerCase().includes(searchTerm) || (p.category && p.category.toLowerCase().includes(searchTerm)));
            }
            if (currentFilter) {
                filteredForTotal = filteredForTotal.filter(p => p.category === currentFilter);
            }
        }
        const totalPages = Math.ceil(filteredForTotal.length / itemsPerPage);
        if (currentPage < totalPages) { currentPage++; renderProducts(); }
    });


    // --- BUTTON STATE HANDLING ---
    const setButtonLoading = (button, isLoading, defaultText = "Salvar") => {
        const textSpan = button.querySelector('.btn-text');
        if (isLoading) {
            button.disabled = true;
            if (textSpan) textSpan.textContent = 'Salvando...';
            if (!button.querySelector('.spinner')) { // Evitar adicionar múltiplos spinners
                const spinner = document.createElement('span');
                spinner.className = 'spinner';
                button.prepend(spinner);
            }
        } else {
            button.disabled = false;
            if (textSpan) textSpan.textContent = defaultText;
            const spinner = button.querySelector('.spinner');
            if (spinner) spinner.remove();
        }
    };


    // --- FORM HANDLING (ADD/EDIT) ---
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showToast('Por favor, corrija os erros no formulário.', 'error');
            const firstErrorField = productForm.querySelector('.input-error');
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        const name = productNameInput.value.trim(); // Definir aqui para usar no toastMessage
        setButtonLoading(btnSaveProduct, true, editingProductId ? "Atualizar Produto" : "Salvar Produto");
        await new Promise(resolve => setTimeout(resolve, 300)); // Simula delay

        const category = productCategoryInput.value;
        const quantity = parseInt(productQuantityInput.value);
        const price = parseFloat(productPriceInput.value);
        const minStock = parseInt(productMinStockInput.value);
        const image = productImageInput.value.trim();
        const now = new Date().toISOString();
        let toastMessage = '';

        if (editingProductId) {
            const productIndex = products.findIndex(p => p.id === editingProductId);
            if (productIndex > -1) {
                const oldProduct = { ...products[productIndex] };
                const updatedFieldsMessages = [];

                if (oldProduct.name !== name) updatedFieldsMessages.push(`Nome: de '${oldProduct.name}' para '${name}'`);
                if ((oldProduct.category || '') !== (category || '')) updatedFieldsMessages.push(`Categoria: de '${oldProduct.category || 'N/A'}' para '${category || 'N/A'}'`);
                if (oldProduct.quantity !== quantity) updatedFieldsMessages.push(`Quantidade: de ${oldProduct.quantity} para ${quantity}`);
                if (parseFloat(oldProduct.price).toFixed(2) !== price.toFixed(2)) updatedFieldsMessages.push(`Preço: de R$${parseFloat(oldProduct.price).toFixed(2).replace('.', ',')} para R$${price.toFixed(2).replace('.', ',')}`);
                if (oldProduct.minStock !== minStock) updatedFieldsMessages.push(`Est. Mínimo: de ${oldProduct.minStock} para ${minStock}`);
                if ((oldProduct.image || '') !== (image || '')) updatedFieldsMessages.push(`URL da Imagem alterada.`);

                products[productIndex] = { ...oldProduct, name, category, quantity, price, minStock, image, lastModified: now };

                if (updatedFieldsMessages.length > 0) {
                    addHistoryEntry(editingProductId, 'update', `Campos atualizados: ${updatedFieldsMessages.join('; ')}.`);
                } else {
                    addHistoryEntry(editingProductId, 'update', `Nenhuma alteração de dados detectada (salvo novamente).`);
                }
                toastMessage = `Produto "${name}" atualizado com sucesso!`;
            }
        } else {
            const newProduct = { id: Date.now().toString(), name, category, quantity, price, minStock, image, addedDate: now, lastModified: now, history: [] };
            addHistoryEntry(newProduct.id, 'create', `Criado (Qtd: ${quantity}, Preço: R$${price.toFixed(2).replace('.', ',')})`);
            products.push(newProduct);
            toastMessage = `Produto "${name}" adicionado com sucesso!`;
        }

        saveProducts();
        resetFormAndState();
        currentPage = editingProductId ? currentPage : 1;
        renderProducts();
        setButtonLoading(btnSaveProduct, false, "Salvar Produto"); // Reset para o estado inicial do botão Adicionar
        showToast(toastMessage, 'success');
        productNameInput.focus();
    });

    const clearFormValidations = () => {
        productForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        productForm.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    };
    
    const resetFormAndState = () => {
        productForm.reset();
        editingProductId = null;
        productIdInput.value = '';
        formTitleEl.innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar Novo Produto';
        btnCancelEdit.style.display = 'none';
        setButtonLoading(btnSaveProduct, false, "Salvar Produto");
        clearFormValidations();
        productNameInput.focus();
    };

    btnClearForm.addEventListener('click', () => {
        if (editingProductId) {
            const product = products.find(p => p.id === editingProductId);
            if (product) populateFormForEdit(product);
            else resetFormAndState();
        } else {
            resetFormAndState();
        }
        showToast('Formulário limpo.', 'info');
    });

    btnCancelEdit.addEventListener('click', () => {
        resetFormAndState();
        showToast('Edição cancelada.', 'warning');
    });

    addFirstProductBtn.addEventListener('click', () => {
        productNameInput.focus();
        const formTop = productForm.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({top: formTop, behavior: 'smooth'});
    });


    // --- PRODUCT ACTIONS (EDIT, DELETE, HISTORY) ---
    const populateFormForEdit = (product) => {
        productIdInput.value = product.id;
        productNameInput.value = product.name;
        productCategoryInput.value = product.category || '';
        productQuantityInput.value = product.quantity;
        productPriceInput.value = product.price;
        productMinStockInput.value = product.minStock;
        productImageInput.value = product.image || '';
    };

    window.prepareEditProduct = (id) => {
        const product = products.find(p => p.id === id);
        if (product) {
            resetFormAndState();
            editingProductId = id;
            populateFormForEdit(product);
            formTitleEl.innerHTML = '<i class="fas fa-edit"></i> Editar Produto';
            setButtonLoading(btnSaveProduct, false, "Atualizar Produto"); // Definir texto do botão para "Atualizar"
            btnCancelEdit.style.display = 'inline-flex';
            const formTop = productForm.getBoundingClientRect().top + window.pageYOffset - 20;
            window.scrollTo({top: formTop, behavior: 'smooth'});
            productNameInput.focus();
            clearFormValidations();
        } else {
            showToast('Produto não encontrado para edição.', 'error');
        }
    };

    window.deleteProduct = (id) => {
        const product = products.find(p => p.id === id);
        if (!product) {
            showToast('Produto não encontrado para exclusão.', 'error');
            return;
        }
        if (confirm(`Tem certeza que deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`)) {
            const cardToRemove = productListContainer.querySelector(`.product-card[data-id="${id}"]`);
            if (cardToRemove) {
                cardToRemove.classList.add('card-exit');
                cardToRemove.addEventListener('transitionend', () => {
                    products = products.filter(p => p.id !== id);
                    saveProducts();
                    if (editingProductId === id) resetFormAndState();
                    renderProducts();
                    showToast(`Produto "${product.name}" excluído.`, 'success');
                }, { once: true });
            } else {
                products = products.filter(p => p.id !== id);
                saveProducts();
                if (editingProductId === id) resetFormAndState();
                renderProducts();
                showToast(`Produto "${product.name}" excluído.`, 'success');
            }
        }
    };

    window.showProductHistory = (id) => {
        const product = products.find(p => p.id === id);
        if (product) {
            historyProductNameModalEl.textContent = product.name;
            historyListEl.innerHTML = '';
            if (product.history && product.history.length > 0) {
                noHistoryMessage.style.display = 'none';
                product.history.forEach(entry => {
                    const li = document.createElement('li');
                    const date = new Date(entry.date);
                    li.innerHTML = `<span class="history-date">${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}</span> ${entry.details}`;
                    historyListEl.appendChild(li);
                });
            } else {
                noHistoryMessage.style.display = 'block';
            }
            historyModal.classList.add('show');
            closeModalBtn.focus();
        } else {
            showToast('Produto não encontrado para ver histórico.', 'error');
        }
    };

    const closeModal = (modalElement) => {
        modalElement.classList.remove('show');
    };

    closeModalBtn.addEventListener('click', () => closeModal(historyModal));
    historyModal.addEventListener('click', (event) => {
        if (event.target === historyModal) closeModal(historyModal);
    });


    // --- KEYBOARD ACCESSIBILITY ---
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (historyModal.classList.contains('show')) {
                closeModal(historyModal);
            } else if (editingProductId) {
                btnCancelEdit.click();
            }
        }
    });


    // --- EVENT LISTENERS FOR FILTERS & SORT ---
    [searchInput, categoryFilterInput, sortByInput].forEach(el => {
        el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
             currentPage = 1; renderProducts();
        });
    });


    // --- INITIALIZATION ---
    document.getElementById('current-year').textContent = new Date().getFullYear();
    renderProducts();
    if(products.length === 0) {
        productNameInput.focus();
    }

    // --- SERVICE WORKER REGISTRATION ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('Service Worker: Controle de Estoque SBB registrado com sucesso, escopo:', registration.scope);
                })
                .catch(error => {
                    console.log('Service Worker: Falha no registro do Controle de Estoque SBB:', error);
                });
        });
    }
});