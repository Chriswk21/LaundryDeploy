        const STORAGE_ORDERS_KEY = 'laundry_mami_orders_multi';
        const STORAGE_ACTIVE_DAY_KEY = 'laundry_mami_active_day_multi';
        const STORAGE_ACTIVE_NOTA_KEY = 'laundry_mami_active_nota';

        // Konfigurasi supabaseClient (Membaca dari config.js atau langsung di bawah ini)
        const SUPABASE_URL = window.CONFIG_SUPABASE_URL || 'YOUR_SUPABASE_URL';
        const SUPABASE_ANON_KEY = window.CONFIG_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        
        let supabaseClient = null;
        try {
            if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }
        } catch (e) {
            console.error("Gagal menginisialisasi client supabaseClient:", e);
        }

        const PRICE_DATA = {
            'Cuci Kering Lipat': {
                type: 'kiloan_tiered',
                tiers: [
                    { min: 0.1, max: 3.5, price: 25000, perKg: 0 },
                    { min: 3.6, max: 5.5, price: 35000, perKg: 0 },
                    { min: 5.6, max: 7.0, price: 50000, perKg: 0 },
                    { min: 7.1, max: 9.0, price: 60000, perKg: 0 },
                    { min: 9.1, max: 11.0, price: 70000, perKg: 0 },
                    { min: 11.1, max: 12.5, price: 85000, perKg: 0 },
                    { min: 12.6, max: 14.5, price: 95000, perKg: 0 },
                    { min: 14.6, max: 16.5, price: 105000, perKg: 0 },
                    { min: 16.6, max: 20.0, price: 130000, perKg: 0 },
                    { min: 20.1, max: 22.0, price: 140000, perKg: 0 },
                    { min: 22.1, max: 25.5, price: 165000, perKg: 0 },
                    { min: 25.6, max: 27.5, price: 175000, perKg: 0 }
                ]
            },
            'Cuci Kering Setrika': {
                type: 'kiloan_tiered',
                tiers: [
                    { min: 0.1, max: 3.5, price: 30000, perKg: 0 },
                    { min: 3.6, max: 5.5, price: 45000, perKg: 0 },
                    { min: 5.6, max: 7.0, price: 60000, perKg: 0 },
                    { min: 7.1, max: 9.0, price: 75000, perKg: 0 },
                    { min: 9.1, max: 11.0, price: 90000, perKg: 0 },
                    { min: 11.1, max: 14.5, price: 120000, perKg: 0 },
                    { min: 14.6, max: 16.5, price: 135000, perKg: 0 },
                    { min: 16.6, max: 20.0, price: 165000, perKg: 0 },
                    { min: 20.1, max: 22.0, price: 180000, perKg: 0 },
                    { min: 22.1, max: 25.5, price: 210000, perKg: 0 },
                    { min: 25.6, max: 27.5, price: 225000, perKg: 0 },
                    { min: 27.6, max: 31.0, price: 255000, perKg: 0 }
                ]
            },

            'Cuci Saja': { type: 'kiloan_standard', pricePerKg: 4000 },
            'Setrika Saja': { type: 'kiloan_standard', pricePerKg: 6000 },

            'Boneka/Tas': {
                type: 'satuan',
                rates: {
                    'Kecil': 20000,
                    'Sedang': 30000,
                    'Besar': 40000,
                    'Super Besar': 50000
                },
                sizes: {
                    'Kecil': 'Kecil (Rp 20.000)',
                    'Sedang': 'Sedang (Rp 30.000)',
                    'Besar': 'Besar (Rp 40.000)',
                    'Super Besar': 'Super Besar (Rp 50.000)'
                }
            },

            'Selimut': {
                type: 'satuan',
                rates: {
                    'Kecil': 15000,
                    'Besar': 15000,
                },
                sizes: {
                    'Kecil': 'Kecil (Rp 15.000)',
                    'Besar': 'Besar (Rp 15.000)'
                }
            },
            'Bed Cover Matras': {
                type: 'satuan',
                rates: {
                    'Kecil': 25000,
                    'Besar': 35000,
                },
                sizes: {
                    'Kecil': 'Kecil (Rp 25.000)',
                    'Besar': 'Besar (Rp 35.000)'
                }
            }
        };

        let orders = [];
        let activeDay = null;
        let activeNota = {
            id: null,
            nota: '',
            customer: '',
            total: 0,
            items: []
        };
        let currentView = 'kasir';
        let currentHistoryDate = null;

        function getCurrentDateTimeString() {
            const now = new Date();
            const date = now.toISOString().slice(0, 10);
            const time = now.toTimeString().slice(0, 8);
            return `${date} ${time}`;
        }

        function getTodayDateString() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        function getDateFromDateTimeString(dateTimeString) {
            return dateTimeString ? dateTimeString.split(' ')[0] : null;
        }

        function formatRupiah(amount) {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        }

        async function loadData() {
            // Pemuatan draf nota aktif dari localStorage tetap dipertahankan
            try {
                const storedActiveNota = localStorage.getItem(STORAGE_ACTIVE_NOTA_KEY);
                if (storedActiveNota) {
                    activeNota = JSON.parse(storedActiveNota);
                }
            } catch (error) {
                console.error("Gagal memuat draf nota aktif:", error);
            }
            activeDay = localStorage.getItem(STORAGE_ACTIVE_DAY_KEY) || null;

            // Pemuatan data transaksi utama dari database supabaseClient
            if (supabaseClient && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
                try {
                    let allOrders = [];
                    let from = 0;
                    const limit = 1000;
                    let hasMore = true;
                    let fetchError = null;

                    while (hasMore) {
                        const { data, error } = await supabaseClient
                            .from('orders')
                            .select('*')
                            .range(from, from + limit - 1)
                            .order('id', { ascending: false });
                        
                        if (error) {
                            fetchError = error;
                            break;
                        }

                        if (data && data.length > 0) {
                            allOrders = allOrders.concat(data);
                            if (data.length < limit) {
                                hasMore = false;
                            } else {
                                from += limit;
                            }
                        } else {
                            hasMore = false;
                        }
                    }
                    
                    if (fetchError) {
                        console.error("Gagal mengambil data dari supabaseClient, memuat dari localStorage:", fetchError);
                        const storedOrders = localStorage.getItem(STORAGE_ORDERS_KEY);
                        orders = storedOrders ? JSON.parse(storedOrders) : [];
                    } else {
                        orders = allOrders;
                    }
                } catch (err) {
                    console.error("Kesalahan koneksi supabaseClient, memuat dari localStorage:", err);
                    const storedOrders = localStorage.getItem(STORAGE_ORDERS_KEY);
                    orders = storedOrders ? JSON.parse(storedOrders) : [];
                }
            } else {
                // Fallback jika supabaseClient belum dikonfigurasi
                const storedOrders = localStorage.getItem(STORAGE_ORDERS_KEY);
                orders = storedOrders ? JSON.parse(storedOrders) : [];
            }

            // Sanitasi data
            orders = orders.map(tx => {
                const sanitizedTx = {
                    ...tx,
                    paymentHistory: tx.paymentHistory || [],
                    paidInDay: tx.paidInDay || (tx.isPaid && tx.paidAt ? getDateFromDateTimeString(tx.paidAt) : null)
                };
                sanitizedTx.paymentHistory = sanitizedTx.paymentHistory.map(ph => ({
                    ...ph,
                    paidInDay: ph.paidInDay || getDateFromDateTimeString(ph.paidAt)
                }));
                return sanitizedTx;
            });
            
            orders.sort((a, b) => b.id - a.id);
        }

        function saveData() {
            try {
                localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
                if (activeDay) {
                    localStorage.setItem(STORAGE_ACTIVE_DAY_KEY, activeDay);
                } else {
                    localStorage.removeItem(STORAGE_ACTIVE_DAY_KEY);
                }
                
                if (activeNota.items.length > 0 || activeNota.nota || activeNota.customer) {
                    localStorage.setItem(STORAGE_ACTIVE_NOTA_KEY, JSON.stringify(activeNota));
                } else {
                    localStorage.removeItem(STORAGE_ACTIVE_NOTA_KEY);
                }

            } catch (error) {
                console.error("Gagal menyimpan data ke localStorage:", error);
            }
        }

        function recalculateActiveNotaTotal() {
            activeNota.total = activeNota.items.reduce((sum, item) => sum + item.total, 0);
        }

        function resetActiveNota() {
            activeNota = {
                id: null,
                nota: '',
                customer: '',
                total: 0,
                items: []
            };
            document.getElementById('nota').value = '';
            document.getElementById('customer').value = '';
            document.getElementById('weight').value = '';
            document.getElementById('qty').value = '';
            document.getElementById('calculated-total').textContent = formatRupiah(0);
            document.getElementById('nota-notes').value = '';
            
            renderActiveNotaItems();
            setPriceOnServiceChange();
        }


        function customModal(title, message, isConfirm = false, confirmText = "Lanjutkan") {
            const modal = document.getElementById('custom-modal');
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-message').innerHTML = message;
            
            const btnCancel = document.getElementById('modal-cancel');
            const btnConfirm = document.getElementById('modal-confirm');
            const btnContainer = document.getElementById('modal-buttons');

            btnConfirm.textContent = confirmText;
            btnConfirm.classList.remove('bg-blue-600', 'bg-red-600', 'hover:bg-blue-700', 'hover:bg-red-700');
            btnConfirm.classList.add(isConfirm ? 'bg-red-600' : 'bg-blue-600', isConfirm ? 'hover:bg-red-700' : 'hover:bg-blue-700');
            
            btnContainer.style.justifyContent = isConfirm ? 'space-between' : 'flex-end';
            btnCancel.style.display = isConfirm ? 'inline-block' : 'none';
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            return new Promise(resolve => {
                const confirmHandler = () => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                    resolve(true);
                    cleanUpListeners();
                };
                
                const cancelHandler = () => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                    resolve(false);
                    cleanUpListeners();
                };
                
                const cleanUpListeners = () => {
                    btnConfirm.removeEventListener('click', confirmHandler);
                    btnCancel.removeEventListener('click', cancelHandler);
                };

                btnConfirm.addEventListener('click', confirmHandler);
                if (isConfirm) {
                    btnCancel.addEventListener('click', cancelHandler);
                }
            });
        }
        
        function openNotesModal(nota) {
            const notesModal = document.getElementById('notes-modal');
            const notaIdSpan = document.getElementById('notes-modal-nota-id');
            const notaCustomerSpan = document.getElementById('notes-modal-nota-customer');
            const textarea = document.getElementById('notes-modal-textarea');
            const saveButton = document.getElementById('notes-modal-save');

            notaIdSpan.textContent = nota.nota || 'TANPA NO. NOTA';
            notaCustomerSpan.textContent = nota.customer;
            textarea.value = nota.notes || '';
            saveButton.dataset.txid = nota.id;

            notesModal.classList.remove('hidden');
            notesModal.classList.add('flex');
        }

        function saveEditedNotes(e) {
            const notesModal = document.getElementById('notes-modal');
            const notaId = parseInt(e.currentTarget.dataset.txid);
            const newNotes = document.getElementById('notes-modal-textarea').value.trim();
            
            const txIndex = orders.findIndex(tx => tx.id === notaId);

            if (txIndex !== -1) {
                orders[txIndex].notes = newNotes;
                saveData();

                notesModal.classList.add('hidden');
                notesModal.classList.remove('flex');
                
                customModal("Berhasil", "Catatan nota telah berhasil diperbarui.", false, "OK");
                switchView(currentView, currentHistoryDate); 
            } else {
                customModal("Error", "Nota tidak ditemukan.", false, "OK");
            }
        }

        function togglePaymentMethodVisibility() {
            const isPaidCheckbox = document.getElementById('isPaid');
            const paymentMethodsContainer = document.querySelector('#save-nota-container .space-y-3.p-3.bg-white.rounded-lg.border div.flex.flex-wrap.gap-4');
            const paymentMethodLabel = document.querySelector('#save-nota-container .space-y-3.p-3.bg-white.rounded-lg.border label.block');
            
            if (isPaidCheckbox.checked) {
                if (paymentMethodsContainer) paymentMethodsContainer.classList.remove('hidden');
                if (paymentMethodLabel) paymentMethodLabel.classList.remove('hidden');
                document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => radio.disabled = false);
            } else {
                if (paymentMethodsContainer) paymentMethodsContainer.classList.add('hidden');
                if (paymentMethodLabel) paymentMethodLabel.classList.add('hidden');
                document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => radio.disabled = true);
            }
        }

        function switchView(newView, detailDate = null) {
            currentView = newView;
            currentHistoryDate = detailDate;
            
            document.querySelectorAll('nav button').forEach(btn => {
                btn.classList.remove('border-blue-600', 'text-blue-600');
                btn.classList.add('text-gray-600');
            });
            document.getElementById(`tab-${currentView}`).classList.add('border-blue-600', 'text-blue-600');
            document.getElementById(`tab-${currentView}`).classList.remove('text-gray-600');
            
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            const activeViewElement = document.getElementById(`view-${currentView}`);
            if (activeViewElement) activeViewElement.classList.remove('hidden');

            if (newView === 'history') {
                const historyListView = document.getElementById('history-list-view');
                const historyDetailView = document.getElementById('history-detail-view');
                if (detailDate) {
                    historyListView.classList.add('hidden');
                    historyDetailView.classList.remove('hidden');
                    renderHistoryDetail(detailDate);
                } else {
                    historyListView.classList.remove('hidden');
                    historyDetailView.classList.add('hidden');
                    renderHistoryList(); 
                }
            } 
            // TAMBAHKAN KONDISI INI
            else if (newView === 'debt') {
                renderDebtBook();
            }

            renderAppContent(); 
        }

        function renderAppContent() {
            const statusText = activeDay 
                ? `Hari aktif: ${activeDay}` 
                : "Status: Belum mulai hari";
            document.getElementById('header-status').textContent = statusText;

            const isDayActive = !!activeDay;
            const notaHeaderContainer = document.getElementById('nota-header-container');
            const itemFormContainer = document.getElementById('transaction-form-container');
            const activeNotaContainer = document.getElementById('active-nota-items');
            const saveNotaContainer = document.getElementById('save-nota-container');
            const noDayMessage = document.getElementById('no-active-day-message');
            const btnEndDay = document.getElementById('btn-end-day');
            const transactionListContainer = document.getElementById('transaction-list-container');
            const recapContainer = document.getElementById('recap-container');

            btnEndDay.disabled = !isDayActive;

            if (isDayActive) {
                notaHeaderContainer.style.display = 'block';
                itemFormContainer.style.display = 'block';
                noDayMessage.style.display = 'none';
                recapContainer.style.display = 'block';
                transactionListContainer.style.display = 'block';
                
                togglePaymentMethodVisibility(); 

                if (activeNota.items.length > 0) {
                    activeNotaContainer.classList.remove('hidden');
                    saveNotaContainer.classList.remove('hidden');
                    document.getElementById('save-nota-display-total').textContent = formatRupiah(activeNota.total);
                } else {
                    activeNotaContainer.classList.add('hidden');
                    saveNotaContainer.classList.add('hidden');
                }
                
                renderActiveNotaItems();
                renderKasirToday();
            } else {
                notaHeaderContainer.style.display = 'none';
                itemFormContainer.style.display = 'none';
                activeNotaContainer.classList.add('hidden');
                saveNotaContainer.classList.add('hidden');
                noDayMessage.style.display = 'block';
                recapContainer.style.display = 'none';
                transactionListContainer.style.display = 'none';
            }
        }

        function renderActiveNotaItems() {
            const itemListElement = document.getElementById('active-item-list');
            itemListElement.innerHTML = '';
            document.getElementById('active-item-count').textContent = activeNota.items.length;
            document.getElementById('active-nota-total').textContent = formatRupiah(activeNota.total);

            if (activeNota.items.length === 0) {
                 itemListElement.innerHTML = '<li id="no-item-message" class="text-gray-500 italic text-sm">Belum ada item di nota.</li>';
                return;
            }

            activeNota.items.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'p-2 bg-gray-50 rounded-lg flex justify-between items-center';
                
                let detailText = '';
                if (item.itemType === 'satuan') {
                    detailText = `${item.qty} pc ${item.service} (${item.size})`;
                } else {
                    let unitInfo = item.itemType === 'kiloan_tiered' ? `(Tiered)` : `${formatRupiah(item.pricePerKg)}/kg`;
                    detailText = `${item.weight} kg ${item.service} @ ${unitInfo}`;
                }

                let priceDisplay = item.isGratis 
                    ? `<span class="text-sm font-bold text-green-600">GRATIS</span>`
                    : `<span class="text-sm font-bold text-red-600">${formatRupiah(item.total)}</span>`;
                
                let gratisButtonClass = item.isGratis
                    ? 'btn-toggle-gratis text-white bg-green-500 hover:bg-green-600 text-xs py-1 px-2 rounded font-bold'
                    : 'btn-toggle-gratis text-gray-500 hover:text-gray-700 text-sm';
                let gratisButtonText = item.isGratis ? '✓' : 'O';

                li.innerHTML = `
                    <span class="text-sm text-gray-800 font-medium">${index + 1}. ${detailText}</span>
                    <div class="flex items-center space-x-2">
                        ${priceDisplay}
                        <button data-index="${index}" class="${gratisButtonClass}">
                            ${gratisButtonText}
                        </button>
                        <button data-index="${index}" class="btn-delete-item text-red-400 hover:text-red-600 text-sm">
                            ×
                        </button>
                    </div>
                `;
                itemListElement.appendChild(li);
            });
            
            document.querySelectorAll('.btn-delete-item').forEach(btn => {
                btn.addEventListener('click', deleteItemFromActiveNota);
            });

            document.querySelectorAll('.btn-toggle-gratis').forEach(btn => {
                btn.addEventListener('click', toggleItemGratisStatus);
            });
        }

        function renderKasirToday() {
            const todayOrders = orders.filter(tx => tx.date === activeDay);
            todayOrders.sort((a, b) => {
                return (a.nota || "").localeCompare(b.nota || "", undefined, {numeric: true, sensitivity: 'base'});
            });
            const recap = calculateRecap(orders, activeDay); 
            
            document.getElementById('recap-date').textContent = activeDay;
            document.getElementById('recap-total-tx').textContent = recap.totalTx;
            document.getElementById('recap-cash').textContent = formatRupiah(recap.cash);
            document.getElementById('recap-qris').textContent = formatRupiah(recap.qris);
            document.getElementById('recap-transfer').textContent = formatRupiah(recap.transfer);
            document.getElementById('recap-total-all').textContent = formatRupiah(recap.totalAllPaid + recap.totalDebtPayment); 
            
            document.getElementById('recap-debt-payment-total').textContent = formatRupiah(recap.totalDebtPayment);
            
            const debtListEl = document.getElementById('recap-debt-payment-list');
            debtListEl.innerHTML = '';
            if (recap.debtPaymentList.length > 0) {
                recap.debtPaymentList.forEach(item => {
                    const li = document.createElement('li');
                    const notaDisplay = item.nota ? `#${item.nota} ` : '';
                    li.textContent = `${notaDisplay}${item.customer} (${formatRupiah(item.amount)}) - ${item.method} (Nota Tgl: ${item.notaDate})`;
                    debtListEl.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'Tidak ada pelunasan utang hari ini.';
                debtListEl.appendChild(li);
            }

            document.getElementById('recap-unpaid').textContent = `${recap.unpaid} Nota`;
            document.getElementById('recap-unpaid-amount').textContent = formatRupiah(recap.totalUnpaidAmount);
            
            const listElement = document.getElementById('transaction-list');
            listElement.innerHTML = '';
            document.getElementById('list-count').textContent = todayOrders.length;
            
            if (todayOrders.length === 0) {
                listElement.innerHTML = '<p class="text-gray-500 italic p-3 text-center">Belum ada nota hari ini.</p>';
            } else {
                 todayOrders.forEach(tx => {
                    listElement.appendChild(createNotaListItem(tx));
                });
            }
        }

        function calculateRecap(allTransactions, targetDate) {
            
            const transactionsCreatedToday = allTransactions.filter(tx => tx.date === targetDate);
            
            const recap = {
                totalTx: transactionsCreatedToday.length, 
                cash: 0,
                qris: 0,
                transfer: 0,
                totalAllPaid: 0, 
                unpaid: 0,
                totalUnpaidAmount: 0,
                totalDebtPayment: 0,
                debtPaymentList: [], 
                statusCount: { PROSES: 0, SELESAI: 0, DIAMBIL: 0, ILANG: 0 }
            };

            transactionsCreatedToday.forEach(tx => {
                if (tx.status in recap.statusCount) {
                    recap.statusCount[tx.status]++;
                }
                if (!tx.isPaid && tx.total > 0) {
                    recap.unpaid++;
                    recap.totalUnpaidAmount += tx.total;
                }
            });
            
            allTransactions.forEach(tx => {
                if (tx.isPaid && tx.paidInDay === targetDate && tx.date === targetDate) {
                    if (tx.paymentMethod === 'CASH') recap.cash += tx.total;
                    if (tx.paymentMethod === 'QRIS') recap.qris += tx.total;
                    if (tx.paymentMethod === 'TRANSFER') recap.transfer += tx.total;
                }
            });

            recap.totalAllPaid = recap.cash + recap.qris + recap.transfer;


            allTransactions.forEach(tx => {
                if (tx.paymentHistory && tx.paymentHistory.length > 0) {
                    tx.paymentHistory.forEach(payment => {
                        if (payment.paidInDay === targetDate) {
                            recap.totalDebtPayment += payment.amount;
                            recap.debtPaymentList.push({
                                nota: tx.nota,
                                customer: tx.customer,
                                amount: payment.amount,
                                method: payment.method,
                                notaDate: tx.date
                            });
                        }
                    });
                }
                else if (tx.isPaid && tx.paidInDay === targetDate && tx.date !== targetDate) {
                     recap.totalDebtPayment += tx.total;
                     recap.debtPaymentList.push({
                         nota: tx.nota,
                         customer: tx.customer,
                         amount: tx.total,
                         method: tx.paymentMethod,
                         notaDate: tx.date
                     });
                }
            });
            
            return recap;
        }

        function calculateHistoryDetailRecap(allTransactions, targetDate) {
             const transactionsCreatedOnTargetDate = allTransactions.filter(tx => tx.date === targetDate);
             
             const recap = {
                totalTx: transactionsCreatedOnTargetDate.length,
                cash: 0,
                qris: 0,
                transfer: 0,
                totalDebtPaid: 0, 
                debtPaidList: [], 
                totalAllPaid: 0, 
                unpaid: 0, 
                totalUnpaidAmount: 0,
                statusCount: { PROSES: 0, SELESAI: 0, DIAMBIL: 0, ILANG: 0 }
             };

             transactionsCreatedOnTargetDate.forEach(tx => {
                 if (tx.status in recap.statusCount) {
                     recap.statusCount[tx.status]++;
                 }

                 if (tx.isPaid) {
                     if (tx.paidInDay === targetDate) {
                         if (tx.paymentMethod === 'CASH') recap.cash += tx.total;
                         if (tx.paymentMethod === 'QRIS') recap.qris += tx.total;
                         if (tx.paymentMethod === 'TRANSFER') recap.transfer += tx.total;
                     } 
                     else if (tx.paidInDay !== targetDate) {
                         recap.totalDebtPaid += tx.total;
                         recap.debtPaidList.push({
                             nota: tx.nota,
                             customer: tx.customer,
                             amount: tx.total,
                             method: tx.paymentMethod,
                             paidInDay: tx.paidInDay
                         });
                     }
                 }
                 
                 if (!tx.isPaid) {
                     recap.unpaid++;
                     recap.totalUnpaidAmount += tx.total;
                 }
             });

             recap.totalAllPaid = recap.cash + recap.qris + recap.transfer; 
             return recap;
        }

        function createNotaListItem(tx, isReadOnly = false) {
            const li = document.createElement('li');
            li.id = `tx-${tx.id}`;
            const isPaid = tx.isPaid || tx.total === 0;
            li.className = `p-4 border rounded-xl shadow-sm ${isPaid ? 'bg-green-50' : 'bg-red-50'} space-y-2`;

            const header = document.createElement('div');
            header.className = 'flex justify-between items-center border-b pb-2 mb-2';
            const notaDisplay = tx.nota ? `#${tx.nota} ` : '';
            header.innerHTML = `
                <p class="text-base font-bold text-gray-800">${notaDisplay}${tx.customer}</p>
                <p class="text-lg font-extrabold ${isPaid ? 'text-green-700' : 'text-red-700'}">${formatRupiah(tx.total)}</p>
            `;
            li.appendChild(header);

            const itemDetails = document.createElement('ul');
            itemDetails.className = 'list-disc ml-4 space-y-0.5';
            tx.items.forEach(item => {
                const itemLi = document.createElement('li');
                itemLi.className = 'text-sm text-gray-600';
                
                let itemText = '';
                if (item.itemType === 'satuan') {
                    itemText = `${item.service}: ${item.qty} pc (${item.size})`;
                } else {
                    itemText = `${item.service}: ${item.weight} kg`;
                }
                
                let priceText = item.isGratis 
                    ? `GRATIS (Harga Normal: ${formatRupiah(item.originalTotal)})`
                    : formatRupiah(item.total);
                    
                itemLi.innerHTML = `${itemText} - <span class="font-semibold">${priceText}</span>`;
                itemDetails.appendChild(itemLi);
            });
            li.appendChild(itemDetails);

            const badges = document.createElement('div');
            badges.className = 'flex flex-wrap gap-2 text-xs font-semibold mt-3';
            
            const statusBadge = document.createElement('span');
            let statusColor = tx.status === 'PROSES' ? 'bg-yellow-100 text-yellow-800' :
                                 tx.status === 'SELESAI' ? 'bg-indigo-100 text-indigo-800' :
                                 tx.status === 'DIAMBIL' ? 'bg-gray-100 text-gray-800' :
                                 tx.status === 'ILANG' ? 'bg-red-200 text-red-800' : 
                                 'bg-gray-100 text-gray-800';
            statusBadge.className = `py-1 px-2 rounded-full ${statusColor}`;
            statusBadge.textContent = tx.status;
            badges.appendChild(statusBadge);

            const paidBadge = document.createElement('span');
            let paidMethodDisplay = tx.paymentMethod;
            
            if (isPaid) {
                if (tx.paidInDay) {
                    const isDebtPayment = tx.paidInDay !== tx.date;
                    
                    if (isDebtPayment && tx.total > 0) {
                        paidBadge.className = 'py-1 px-2 rounded-full bg-pink-500 text-white';
                        paidBadge.textContent = `LUNAS UTANG ${tx.paymentMethod} (Tgl Bayar: ${tx.paidInDay})`;
                    } else if (tx.total === 0) {
                        paidBadge.className = 'py-1 px-2 rounded-full bg-gray-500 text-white';
                        paidBadge.textContent = `GRATIS`;
                    } else {
                        paidBadge.className = 'py-1 px-2 rounded-full bg-green-500 text-white';
                        paidBadge.textContent = `LUNAS ${tx.paymentMethod}`;
                    }
                } else {
                    paidBadge.className = 'py-1 px-2 rounded-full bg-green-500 text-white';
                    paidBadge.textContent = `LUNAS (${paidMethodDisplay})`;
                }
            } else {
                paidBadge.className = 'py-1 px-2 rounded-full bg-red-500 text-white';
                paidBadge.textContent = 'BELUM BAYAR (PIUTANG)';
            }
            badges.appendChild(paidBadge);

            if (tx.paymentHistory && tx.paymentHistory.length > 0) {
                const historyBadge = document.createElement('span');
                historyBadge.className = 'py-1 px-2 rounded-full bg-purple-100 text-purple-700';
                historyBadge.textContent = `Riwayat Pelunasan Utang: ${tx.paymentHistory.length}`;
                badges.appendChild(historyBadge);
            }

            li.appendChild(badges);

            if (tx.notes && tx.notes.trim() !== '') {
                const notesContainer = document.createElement('div');
                notesContainer.className = 'mt-3 p-2 bg-gray-100 rounded-lg border border-gray-200';
                notesContainer.innerHTML = `
                    <p class="text-xs font-semibold text-gray-700">Catatan:</p>
                    <p class="text-sm text-gray-600 italic">${tx.notes}</p>
                `;
                li.appendChild(notesContainer);
            }
            
            if (!isReadOnly) {
                const actions = document.createElement('div');
                actions.className = 'flex flex-wrap gap-2 justify-end pt-3 border-t mt-3';
                
                const btnEditNotes = document.createElement('button');
                btnEditNotes.className = 'text-xs font-semibold py-1 px-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200';
                btnEditNotes.textContent = 'Tambah/Edit Catatan';
                btnEditNotes.addEventListener('click', () => openNotesModal(tx));
                actions.appendChild(btnEditNotes);
                
                if (!tx.isPaid && tx.total > 0) {
                    const btnLunasi = document.createElement('button');
                    btnLunasi.className = 'text-xs font-semibold py-1 px-2 rounded-lg transition-colors bg-green-100 text-green-600 hover:bg-green-200';
                    btnLunasi.textContent = 'Lunasi Nota';
                    btnLunasi.addEventListener('click', () => openPayModal(tx));
                    actions.appendChild(btnLunasi);
                } else if (tx.isPaid && tx.total > 0) {
                    const btnTogglePaid = document.createElement('button');
                    btnTogglePaid.className = 'text-xs font-semibold py-1 px-2 rounded-lg transition-colors bg-orange-100 text-orange-600 hover:bg-orange-200';
                    btnTogglePaid.textContent = 'Batal Lunas';
                    btnTogglePaid.addEventListener('click', () => togglePaidStatus(tx.id));
                    actions.appendChild(btnTogglePaid);
                }
                
                const createStatusButton = (status, text, bgColor = 'bg-gray-100', hoverBg = 'hover:bg-gray-200', textColor = 'text-gray-600') => {
                    const btn = document.createElement('button');
                    btn.className = `text-xs font-semibold py-1 px-2 rounded-lg transition-colors ${bgColor} ${textColor} ${hoverBg}`;
                    btn.textContent = text;
                    btn.addEventListener('click', () => updateOrderStatus(tx.id, status));
                    return btn;
                };
                
                actions.appendChild(createStatusButton('PROSES', 'PROSES', 'bg-yellow-100', 'hover:bg-yellow-200', 'text-yellow-600'));
                actions.appendChild(createStatusButton('SELESAI', 'SELESAI'));
                actions.appendChild(createStatusButton('DIAMBIL', 'DIAMBIL', 'bg-green-100', 'hover:bg-green-200', 'text-green-600'));
              
                
                const btnDelete = document.createElement('button');
                btnDelete.className = 'text-xs font-semibold py-1 px-2 rounded-lg transition-colors bg-red-100 text-red-600 hover:bg-red-200';
                btnDelete.textContent = 'Hapus Nota';
                btnDelete.addEventListener('click', () => deleteTransaction(tx.id));
                actions.appendChild(btnDelete);

                if (actions.children.length > 0) {
                    li.appendChild(actions);
                }
            }

            return li;
        }

        function calculateItemTotal(service, weight, qty, size, pricePerKgManual) {
            const data = PRICE_DATA[service];
            let total = 0;
            let itemType = data.type;
            let finalPricePerKg = 0;

            if (data.type === 'kiloan_standard') {
                if (weight <= 0 || isNaN(weight)) return { total: 0, pricePerKg: 0, itemType: itemType };
                finalPricePerKg = pricePerKgManual > 0 ? pricePerKgManual : data.pricePerKg;
                total = Math.round(weight * finalPricePerKg);
                
            } else if (data.type === 'kiloan_tiered') {
                if (weight <= 0 || isNaN(weight)) return { total: 0, pricePerKg: 0, itemType: itemType };
                
                let finalTierTotal = 0;
                let finalTierPerKg = 0;
                const tier = data.tiers.find(t => weight >= t.min && weight <= t.max);
                
                if (tier) {
                    finalTierTotal = tier.price;
                    finalTierPerKg = Math.round(tier.price / tier.max);
                } else if (weight > data.tiers[data.tiers.length - 1].max) {
                    const maxTier = data.tiers[data.tiers.length - 1];
                    const baseRate = maxTier.price / maxTier.max;
                    finalTierTotal = Math.round(weight * baseRate);
                    finalTierPerKg = Math.round(baseRate);
                } else {
                    return { total: 0, pricePerKg: 0, itemType: itemType };
                }
                
                if (pricePerKgManual > 0) {
                    total = Math.round(weight * pricePerKgManual);
                    finalPricePerKg = pricePerKgManual;
                    itemType = 'kiloan_manual';
                } else {
                    total = finalTierTotal;
                    finalPricePerKg = finalTierPerKg;
                }

            } else if (data.type === 'satuan') {
                if (qty <= 0 || isNaN(qty) || !data.rates || !data.rates[size]) {
                    return { total: 0, pricePerKg: 0, itemType: itemType };
                }
                
                const unitPrice = data.rates[size];
                total = qty * unitPrice;
            }
            
            return { total: total, originalTotal: total, pricePerKg: finalPricePerKg, itemType: itemType };
        }


        function addItemToActiveNota() {
            if (!activeDay) {
                return customModal("Error", "Belum ada hari aktif.", false, "OK");
            }
            
            const service = document.getElementById('service').value;
            const serviceData = PRICE_DATA[service];

            const weight = serviceData.type.includes('kiloan') ? parseFloat(document.getElementById('weight').value) || 0 : 0;
            if (service === 'Cuci Saja' && weight < 5.5) {
                    return customModal(
                        "Minimal Berat Tidak Terpenuhi", 
                        "Layanan **Cuci Saja** minimal harus **5.5 kg**. <br><br>Berat saat ini: " + weight + " kg", 
                        false, 
                        "OK"
                    );
                }
            const pricePerKgInput = serviceData.type.includes('kiloan') ? parseInt(document.getElementById('pricePerKg').value) || 0 : 0;
            const qty = serviceData.type === 'satuan' ? parseInt(document.getElementById('qty').value) || 0 : 0;
            const size = serviceData.type === 'satuan' ? document.getElementById('size').value : '';

            if (serviceData.type.includes('kiloan') && (isNaN(weight) || weight <= 0)) {
                return customModal("Error", "Untuk layanan kiloan, Berat (kg) harus diisi dengan angka positif.", false, "OK");
            }
            if (serviceData.type === 'satuan' && (isNaN(qty) || qty <= 0)) {
                 return customModal("Error", "Untuk layanan satuan, Jumlah (pc) harus diisi dengan angka positif.", false, "OK");
            }

            const calculation = calculateItemTotal(service, weight, qty, size, pricePerKgInput);
            if (calculation.originalTotal <= 0) {
                 return customModal("Error", "Gagal menghitung total item. Pastikan semua input valid.", false, "OK");
            }

            if (!activeNota.id) {
                activeNota.id = Date.now();
            }
            activeNota.nota = document.getElementById('nota').value.trim();
            let customer = document.getElementById('customer').value.trim();
            activeNota.customer = customer || "Pelanggan";
            
            const newItem = {
                service: service,
                itemType: calculation.itemType,
                total: calculation.total,
                originalTotal: calculation.originalTotal,
                isGratis: false,
                pricePerKg: calculation.pricePerKg,
                weight: weight,
                qty: qty,
                size: size,
            };

            activeNota.items.push(newItem);
            recalculateActiveNotaTotal();

            saveData();
            
            document.getElementById('weight').value = '';
            document.getElementById('qty').value = '';
            document.getElementById('calculated-total').textContent = formatRupiah(0);
            
            renderAppContent();
            
            document.getElementById('active-nota-items').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function deleteItemFromActiveNota(e) {
            const index = e.currentTarget.dataset.index;
            if (index !== undefined) {
                activeNota.items.splice(index, 1);
                recalculateActiveNotaTotal();
                saveData();
                renderAppContent();
            }
        }

        function toggleItemGratisStatus(e) {
            const index = parseInt(e.currentTarget.dataset.index);
            if (isNaN(index) || index < 0 || index >= activeNota.items.length) return;

            const item = activeNota.items[index];
            
            if (item.isGratis) {
                item.total = item.originalTotal;
                item.isGratis = false;
            } else {
                item.total = 0;
                item.isGratis = true;
            }
            
            recalculateActiveNotaTotal();
            saveData();
            renderAppContent();
        }


        async function saveActiveNota() {
            if (!activeDay) {
                return customModal("Error", "Anda harus memulai hari aktif untuk mencatat nota.", false, "OK");
            }
            if (activeNota.items.length === 0) {
                return customModal("Error", "Nota tidak memiliki item.", false, "OK");
            }

            let isPaid = document.getElementById('isPaid').checked;
            let paymentMethod = 'CASH';
            let notaNotes = document.getElementById('nota-notes').value.trim();
            
            let paidAt = null;
            let paidInDay = null; 

            if (isPaid) {
                 const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked:not(:disabled)');
                 paymentMethod = selectedPaymentMethod ? selectedPaymentMethod.value : 'CASH';
                 paidAt = getCurrentDateTimeString();
                 paidInDay = activeDay; 
            }
            
            if (activeNota.total === 0) {
                isPaid = true;
                paymentMethod = 'GRATIS';
                paidAt = getCurrentDateTimeString();
                paidInDay = activeDay;
            }

            const finalNota = {
                id: activeNota.id,
                date: activeDay,
                nota: activeNota.nota,
                customer: activeNota.customer,
                total: activeNota.total,
                items: activeNota.items,
                notes: notaNotes,
                paymentMethod: isPaid ? paymentMethod : null,
                isPaid: isPaid,
                paidAt: paidAt,
                paidInDay: paidInDay, 
                status: "PROSES",
                paymentHistory: [] 
            };

            orders.unshift(finalNota);
            
            // Simpan ke supabaseClient jika tersedia
            if (supabaseClient && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
                try {
                    const { error } = await supabaseClient
                        .from('orders')
                        .insert([finalNota]);
                    
                    if (error) {
                        console.error("Gagal menyimpan ke supabaseClient:", error);
                        customModal("Peringatan", "Nota tersimpan lokal, tapi gagal dikirim ke Cloud: " + error.message, false, "OK");
                    }
                } catch (err) {
                    console.error("Kesalahan koneksi supabaseClient saat insert:", err);
                    customModal("Peringatan", "Nota tersimpan lokal, koneksi database terputus.", false, "OK");
                }
            }
            
            resetActiveNota();
            document.getElementById('nota-notes').value = '';
            saveData();
            
            switchView('kasir');
            document.getElementById('transaction-list-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function openPayModal(nota) {
            if (!activeDay) {
                return customModal("Error", "Anda harus memulai hari aktif untuk mencatat pelunasan.", false, "OK");
            }
            const payModal = document.getElementById('pay-modal');
            
            document.getElementById('pay-modal-total').textContent = formatRupiah(nota.total);
            document.getElementById('pay-modal-confirm').dataset.txid = nota.id;
            document.getElementById('pay-modal-message').innerHTML = `Pilih metode pembayaran untuk melunasi nota **#${nota.nota || nota.customer}** sebesar:`;
            
            document.querySelector('input[name="payMethod"][value="CASH"]').checked = true;

            payModal.classList.remove('hidden');
            payModal.classList.add('flex');
        }

        async function finalizePayment() {
            if (!activeDay) {
                return customModal("Error", "Anda harus memulai hari aktif untuk mencatat pelunasan.", false, "OK");
            }
            
            const payModal = document.getElementById('pay-modal');
            const notaId = parseInt(document.getElementById('pay-modal-confirm').dataset.txid);
            const selectedMethod = document.querySelector('input[name="payMethod"]:checked').value;
            const paidTime = getCurrentDateTimeString();
            const paidDate = activeDay; 
            
            const txIndex = orders.findIndex(tx => tx.id === notaId);

            if (txIndex !== -1) {
                const tx = orders[txIndex];
                
                if (tx.isPaid) {
                    customModal("Peringatan", "Nota ini sudah lunas.", false, "OK");
                    payModal.classList.add('hidden');
                    payModal.classList.remove('flex');
                    return;
                }

                const isDebtPayment = tx.date !== paidDate;
                
                if (isDebtPayment) {
                    tx.paymentHistory.push({
                        paidAt: paidTime,
                        method: selectedMethod,
                        amount: tx.total,
                        paidInDay: paidDate 
                    });
                }
                
                tx.isPaid = true;
                tx.paymentMethod = selectedMethod;
                tx.paidAt = paidTime;
                tx.paidInDay = paidDate; 
                
                // Update ke supabaseClient
                if (supabaseClient && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
                    try {
                        const { error } = await supabaseClient
                            .from('orders')
                            .update({
                                isPaid: tx.isPaid,
                                paymentMethod: tx.paymentMethod,
                                paidAt: tx.paidAt,
                                paidInDay: tx.paidInDay,
                                paymentHistory: tx.paymentHistory
                            })
                            .eq('id', tx.id);
                        
                        if (error) {
                            console.error("Gagal sinkronisasi pembayaran ke supabaseClient:", error);
                            customModal("Peringatan", "Pelunasan berhasil disimpan lokal, namun gagal sinkronisasi ke Cloud: " + error.message, false, "OK");
                        }
                    } catch (err) {
                        console.error("Kesalahan koneksi supabaseClient saat update pembayaran:", err);
                        customModal("Peringatan", "Pelunasan disimpan lokal. Koneksi database terputus.", false, "OK");
                    }
                }
                
                saveData();

                payModal.classList.add('hidden');
                payModal.classList.remove('flex');
                
                const timePart = tx.paidAt.split(' ')[1].slice(0, 5);
                customModal("Pelunasan Berhasil", `Nota **#${tx.nota || tx.customer}** (${formatRupiah(tx.total)}) berhasil dilunasi menggunakan **${selectedMethod}** pada pukul **${timePart}**. ${isDebtPayment ? "<br><br>Pembayaran ini dicatat sebagai **Pelunasan Utang** di rekap harian hari ini." : ""}`, false, "OK");
                
                if (currentView === 'kasir') {
                    switchView('kasir');
                } else if (currentView === 'history' && currentHistoryDate) {
                    switchView('history', currentHistoryDate);
                } else {
                    switchView('kasir');
                }
            }
        }

        async function cancelActiveNota() {
            const confirm = await customModal(
                "Konfirmasi Batal",
                `Yakin ingin **MENGHAPUS** semua ${activeNota.items.length} item di nota ini?`,
                true,
                "Batalkan Nota"
            );

            if (confirm) {
                resetActiveNota();
                saveData();
                switchView('kasir');
            }
        }

        function setPriceOnServiceChange() {
            const service = document.getElementById('service').value;
            const data = PRICE_DATA[service];
            
            const kiloanInputs = document.getElementById('kiloan-inputs');
            const satuanInputs = document.getElementById('satuan-inputs');
            const pricePerKgInput = document.getElementById('pricePerKg');
            const sizeSelect = document.getElementById('size');
            
            pricePerKgInput.value = '';
            document.getElementById('calculated-total').textContent = formatRupiah(0);

            if (data.type.includes('kiloan')) {
                kiloanInputs.classList.remove('hidden');
                satuanInputs.classList.add('hidden');

                if (data.type === 'kiloan_standard') {
                    pricePerKgInput.value = data.pricePerKg;
                    pricePerKgInput.previousElementSibling.textContent = 'Harga/kg (Bisa Diubah)';
                } else {
                    pricePerKgInput.value = '';
                    pricePerKgInput.previousElementSibling.textContent = 'Harga/kg Override (Opsional)';
                }

            } else if (data.type === 'satuan') {
                kiloanInputs.classList.add('hidden');
                satuanInputs.classList.remove('hidden');
                
                sizeSelect.innerHTML = '';
                if (data.sizes) {
                    Object.keys(data.sizes).forEach(key => {
                        const option = document.createElement('option');
                        option.value = key;
                        option.textContent = data.sizes[key];
                        sizeSelect.appendChild(option);
                    });
                }
                
                pricePerKgInput.value = '';
            }
            
            updateCalculatedTotal();
        }

        function updateCalculatedTotal() {
            const service = document.getElementById('service').value;
            const data = PRICE_DATA[service];
            
            const weight = data.type.includes('kiloan') ? parseFloat(document.getElementById('weight').value) || 0 : 0;
            const pricePerKgInput = data.type.includes('kiloan') ? parseInt(document.getElementById('pricePerKg').value) || 0 : 0;
            const qty = data.type === 'satuan' ? parseInt(document.getElementById('qty').value) || 0 : 0;
            const size = data.type === 'satuan' ? document.getElementById('size').value : '';
            
            const calculation = calculateItemTotal(service, weight, qty, size, pricePerKgInput);
            document.getElementById('calculated-total').textContent = formatRupiah(calculation.total);
        }

        async function togglePaidStatus(id) {
            const txIndex = orders.findIndex(tx => tx.id === id);
            if (txIndex !== -1) {
                const tx = orders[txIndex];
                if (tx.total === 0) return;
                
                const isConfirmed = await customModal("Batal Lunas", `Yakin ingin membatalkan status lunas untuk nota **#${tx.nota || tx.customer}**? Ini akan mengubah status nota menjadi **BELUM BAYAR (PIUTANG)**.`, true, "Batal Lunas");
                
                if (isConfirmed) {
                    tx.isPaid = false;
                    tx.paymentMethod = null;
                    tx.paidAt = null;
                    tx.paidInDay = null; 
                    tx.paymentHistory = []; 
                    
                    // Update ke supabaseClient
                    if (supabaseClient && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
                        try {
                            const { error } = await supabaseClient
                                .from('orders')
                                .update({
                                    isPaid: false,
                                    paymentMethod: null,
                                    paidAt: null,
                                    paidInDay: null,
                                    paymentHistory: []
                                })
                                .eq('id', tx.id);
                            
                            if (error) {
                                console.error("Gagal update status batal lunas di supabaseClient:", error);
                            }
                        } catch (err) {
                            console.error("Kesalahan koneksi supabaseClient saat update batal lunas:", err);
                        }
                    }
                    
                    saveData();
                    switchView(currentView, currentHistoryDate);
                }
            }
        }

        async function updateOrderStatus(id, newStatus) {
            const txIndex = orders.findIndex(tx => tx.id === id);
            if (txIndex !== -1) {
                orders[txIndex].status = newStatus;
                
                // Update ke supabaseClient
                if (supabaseClient && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
                    try {
                        const { error } = await supabaseClient
                            .from('orders')
                            .update({ status: newStatus })
                            .eq('id', id);
                        
                        if (error) {
                            console.error("Gagal update status pesanan di supabaseClient:", error);
                        }
                    } catch (err) {
                        console.error("Kesalahan koneksi supabaseClient saat update status pesanan:", err);
                    }
                }
                
                saveData();
                switchView(currentView, currentHistoryDate);
            }
        }

        async function deleteTransaction(id) {
            const txIndex = orders.findIndex(tx => tx.id === id);
            if (txIndex === -1) return;

            const tx = orders[txIndex];
            const confirm = await customModal(
                "Konfirmasi Hapus Nota",
                `Yakin ingin menghapus seluruh Nota **${tx.nota || tx.customer}** (Total ${formatRupiah(tx.total)})?`,
                true,
                "Hapus"
            );
            
            if (confirm) {
                // Delete dari supabaseClient
                if (supabaseClient && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
                    try {
                        const { error } = await supabaseClient
                            .from('orders')
                            .delete()
                            .eq('id', id);
                        
                        if (error) {
                            console.error("Gagal menghapus nota dari supabaseClient:", error);
                            customModal("Error", "Gagal menghapus nota dari Cloud: " + error.message, false, "OK");
                            return;
                        }
                    } catch (err) {
                        console.error("Kesalahan koneksi supabaseClient saat menghapus nota:", err);
                        customModal("Error", "Gagal menghapus nota, koneksi database terputus.", false, "OK");
                        return;
                    }
                }
                
                orders.splice(txIndex, 1);
                saveData();
                switchView(currentView, currentHistoryDate);
            }
        }

        async function startNewDay() {
            const today = getTodayDateString();
            
            if (activeDay) {
                const activeDayOrders = orders.filter(tx => tx.date === activeDay);
                const confirmMessage = `Hari aktif sudah ada: <strong>${activeDay}</strong> dengan ${activeDayOrders.length} nota.<br><br>Memulai hari baru akan menutup hari lama. Yakin ganti hari ke <strong>${today}</strong>?`;
                const isConfirmed = await customModal("Konfirmasi Ganti Hari", confirmMessage, true, "Ganti Hari");
                
                if (!isConfirmed) return;
            }
            
            activeDay = today;
            resetActiveNota();
            saveData();
            switchView('kasir');
        }

        async function endActiveDay() {
            if (!activeDay) return;

            if (activeNota.items.length > 0) {
                 const isConfirmedCancel = await customModal("Peringatan", `Ada nota yang belum disimpan (${activeNota.items.length} item). Anda harus menyimpan atau membatalkan nota ini sebelum mengakhiri hari.`, false, "OK");
                 return;
            }

            const activeDayOrders = orders.filter(tx => tx.date === activeDay);
            const confirmMessage = `Yakin ingin **MENGAKHIRI HARI** pada tanggal <strong>${activeDay}</strong>? <br><br>Total ${activeDayOrders.length} nota akan disimpan ke History Harian.`;
            
            const isConfirmed = await customModal("Konfirmasi Akhiri Hari", confirmMessage, true, "Akhiri Hari");
            
            if (isConfirmed) {
                activeDay = null;
                saveData();
                switchView('history', null);
                customModal("Selesai", "Hari aktif telah berhasil diakhiri dan nota sudah tersimpan di History Harian.", false, "OK");
            }
        }

        function exportDataAsJson() {
            if (orders.length === 0) {
                return customModal("Info", "Tidak ada data transaksi yang dapat di-export.", false, "OK");
            }
            
            const dataToExport = JSON.stringify(orders, null, 2);
            const filename = `${getTodayDateString()}_DATA_laundry.json`;
            
            const blob = new Blob([dataToExport], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            customModal("Export Berhasil", `Data berhasil di-export sebagai file **${filename}**. Pastikan file ini tersimpan dengan aman!`, false, "OK");
        }

        async function importDataFromJson(event) {
            const file = event.target.files[0];
            if (!file) return;

            const isConfirmed = await customModal(
                "Konfirmasi Import",
                `Yakin ingin mengimpor file **${file.name}**? Ini akan **MENGHAPUS SEMUA DATA TRANSAKSI SAAT INI** dan menggantinya dengan data dari file.`,
                true,
                "Lanjutkan Import"
            );

            if (!isConfirmed) {
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    let importedOrders = JSON.parse(e.target.result);
                    
                    if (Array.isArray(importedOrders) && importedOrders.every(tx => tx.id && tx.date && tx.total !== undefined)) {
                        
                        importedOrders = importedOrders.map(tx => {
                            const sanitizedTx = {
                                ...tx,
                                paymentHistory: tx.paymentHistory || [],
                                paidInDay: tx.paidInDay || (tx.isPaid && tx.paidAt ? getDateFromDateTimeString(tx.paidAt) : null)
                            };
                            sanitizedTx.paymentHistory = sanitizedTx.paymentHistory.map(ph => ({
                                ...ph,
                                paidInDay: ph.paidInDay || getDateFromDateTimeString(ph.paidAt)
                            }));
                            return sanitizedTx;
                        });
                        
                        orders = importedOrders;
                        saveData();
                        
                        activeDay = null;
                        resetActiveNota();
                        
                        customModal("Import Berhasil", `Berhasil mengimpor ${orders.length} transaksi. Aplikasi akan di-refresh.`, false, "OK").then(() => {
                            switchView('history', null);
                            event.target.value = '';
                        });
                    } else {
                        customModal("Error Import", "Format file JSON tidak valid atau tidak sesuai dengan struktur data transaksi.", false, "OK");
                    }
                } catch (error) {
                    console.error("Gagal parse JSON:", error);
                    customModal("Error Import", "Gagal memproses file. Pastikan file berformat JSON yang benar.", false, "OK");
                }
            };
            reader.readAsText(file);
        }

        function renderHistoryList() {
            const historyDayList = document.getElementById('history-day-list');
            const noHistoryMessageContainer = document.getElementById('no-history-message-container');

            historyDayList.innerHTML = '';
            historyDayList.appendChild(noHistoryMessageContainer);

            const allInvolvedDates = new Set();
            orders.forEach(tx => {
                allInvolvedDates.add(tx.date); 
                if (tx.paidInDay) {
                     allInvolvedDates.add(tx.paidInDay); 
                }
                if (tx.paymentHistory && tx.paymentHistory.length > 0) {
                    tx.paymentHistory.forEach(payment => {
                        allInvolvedDates.add(payment.paidInDay); 
                    });
                }
            });

            const sortedDates = Array.from(allInvolvedDates).sort().reverse(); 
            
            if (sortedDates.length === 0) {
                noHistoryMessageContainer.style.display = 'block';
                return;
            }
            noHistoryMessageContainer.style.display = 'none';

            sortedDates.forEach(date => {
                const recap = calculateRecap(orders, date); 
                
                const dayOrdersCreated = orders.filter(tx => tx.date === date).length;

                const totalAllPaid = recap.totalAllPaid + recap.totalDebtPayment;

                const li = document.createElement('li');
                li.className = 'p-4 bg-white rounded-xl shadow-md border border-gray-200';
                li.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xl font-bold text-gray-800">${date}</p>
                            <p class="text-sm text-gray-600 mt-1">Nota Dibuat: <span class="font-semibold">${dayOrdersCreated}</span></p>
                            <p class="text-sm text-gray-600">Pemasukan Hari Ini(Tanpa UTANG): <span class="font-semibold text-green-600">${formatRupiah(recap.totalAllPaid)}</span></p>
                            <p class="text-sm text-gray-600">Pelunasan Utang Diterima: <span class="font-semibold text-pink-600">${formatRupiah(recap.totalDebtPayment)}</span></p>
                            <p class="text-base font-bold">Total Uang (UTANG + HARI INI): <span class="text-indigo-700">${formatRupiah(totalAllPaid)}</span></p>
                        </div>
                        <button data-date="${date}" class="btn-view-detail large-button bg-blue-500 text-white text-sm hover:bg-blue-600 self-center">
                            Lihat Detail
                        </button>
                    </div>
                    <div class="text-xs mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                        <p class="text-red-500">Utang Aktif (Nota Dibuat Hari Ini): ${recap.unpaid} Nota</p>
                    </div>
                `;
                historyDayList.insertBefore(li, noHistoryMessageContainer);
            });
            
            document.querySelectorAll('.btn-view-detail').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const date = e.currentTarget.dataset.date;
                    switchView('history', date);
                });
            });
        }

        function renderHistoryDetail(date) {
            const recap = calculateHistoryDetailRecap(orders, date); 

            document.getElementById('detail-recap-date').textContent = date;
            document.getElementById('detail-history-title').textContent = `Detail Nota: ${date}`;
            
            document.getElementById('detail-recap-total-tx').textContent = recap.totalTx;
            document.getElementById('detail-recap-cash').textContent = formatRupiah(recap.cash);
            document.getElementById('detail-recap-qris').textContent = formatRupiah(recap.qris);
            document.getElementById('detail-recap-transfer').textContent = formatRupiah(recap.transfer);
            
            document.getElementById('detail-recap-total-all').textContent = formatRupiah(recap.totalAllPaid);

            document.getElementById('detail-recap-debt-payment-total').textContent = formatRupiah(recap.totalDebtPaid);
            
            const debtListEl = document.getElementById('detail-recap-debt-payment-list');
            debtListEl.innerHTML = '';
            if (recap.debtPaidList.length > 0) {
                recap.debtPaidList.forEach(item => {
                    const li = document.createElement('li');
                    const notaDisplay = item.nota ? `#${item.nota} ` : '';
                    li.textContent = `${notaDisplay}${item.customer} (${formatRupiah(item.amount)}) - ${item.method} (Dibayar Tgl: ${item.paidInDay})`;
                    debtListEl.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'Tidak ada pelunasan utang lintas hari untuk nota tanggal ini.';
                debtListEl.appendChild(li);
            }

            document.getElementById('detail-recap-unpaid').textContent = `${recap.unpaid} Nota`;
            document.getElementById('detail-recap-unpaid-amount').textContent = formatRupiah(recap.totalUnpaidAmount);

            const listElement = document.getElementById('history-transaction-list');
            listElement.innerHTML = '';
            
            const filteredOrders = orders.filter(tx => tx.date === date);
            filteredOrders.sort((a, b) => {
                return (a.nota || "").localeCompare(b.nota || "", undefined, {
                    numeric: true, 
                    sensitivity: 'base'
                });
            });

            filteredOrders.forEach(tx => {
                listElement.appendChild(createNotaListItem(tx, false));
            });

            document.getElementById('btn-delete-history-day').dataset.date = date;
        }

        async function deleteHistoryDay(date) {
             const isConfirmed = await customModal("Konfirmasi Hapus History", 
                  `Yakin ingin **MENGHAPUS SEMUA** nota yang **DIBUAT** pada tanggal <strong>${date}</strong>? Tindakan ini tidak dapat dibatalkan. Catatan: Nota dari hari lain yang dilunasi hari ini tidak akan terhapus.`, 
                  true, 
                  "Hapus Permanen"
                );

            if (isConfirmed) {
                // Delete dari supabaseClient
                if (supabaseClient && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
                    try {
                        const { error } = await supabaseClient
                            .from('orders')
                            .delete()
                            .eq('date', date);
                        
                        if (error) {
                            console.error("Gagal menghapus riwayat hari di supabaseClient:", error);
                            customModal("Error", "Gagal menghapus data dari Cloud: " + error.message, false, "OK");
                            return;
                        }
                    } catch (err) {
                        console.error("Kesalahan koneksi supabaseClient saat menghapus riwayat hari:", err);
                        customModal("Error", "Gagal menghapus riwayat, koneksi database terputus.", false, "OK");
                        return;
                    }
                }
                
                orders = orders.filter(tx => tx.date !== date);
                saveData();
                
                switchView('history', null);
            }
        }

        function renderDebtBook() {
            const listEl = document.getElementById('debt-transaction-list');
            const noDebtMsg = document.getElementById('no-debt-message-container');
            const totalPiutangGlobal = document.getElementById('total-piutang-global');
            const totalNotaPiutang = document.getElementById('total-nota-piutang'); // ID baru
            const searchQuery = document.getElementById('search-debt').value.toLowerCase();

            listEl.innerHTML = '';
            listEl.appendChild(noDebtMsg);

            // 1. Ambil SEMUA yang belum lunas untuk angka header (global)
            const allUnpaid = orders.filter(tx => !tx.isPaid && tx.total > 0);
            const globalDebtAmount = allUnpaid.reduce((sum, tx) => sum + tx.total, 0);
            const globalDebtCount = allUnpaid.length;

            // Tampilkan angka global di header
            totalPiutangGlobal.textContent = formatRupiah(globalDebtAmount);
            totalNotaPiutang.textContent = globalDebtCount;

            // 2. Filter berdasarkan search untuk daftar di bawahnya
            const filteredOrders = allUnpaid.filter(tx => {
                return tx.customer.toLowerCase().includes(searchQuery) || 
                    (tx.nota && tx.nota.toLowerCase().includes(searchQuery));
            }).sort((a, b) => new Date(a.date) - new Date(b.date));

            if (filteredOrders.length === 0) {
                noDebtMsg.style.display = 'block';
            } else {
                noDebtMsg.style.display = 'none';
                filteredOrders.forEach(tx => {
                    listEl.appendChild(createNotaListItem(tx));
                });
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            await loadData();
            
            setPriceOnServiceChange();
            
            if (activeDay) {
                 switchView('kasir');
            } else {
                 switchView('history', null);
            }
            
            togglePaymentMethodVisibility();
            
            if (activeNota.nota) document.getElementById('nota').value = activeNota.nota;
            if (activeNota.customer) document.getElementById('customer').value = activeNota.customer;


            document.getElementById('tab-kasir').addEventListener('click', () => {
                switchView('kasir');
            });

            document.getElementById('tab-history').addEventListener('click', () => {
                switchView('history', null);
            });

            document.getElementById('btn-start-day').addEventListener('click', startNewDay);
            document.getElementById('btn-end-day').addEventListener('click', endActiveDay);
            
            document.getElementById('nota').addEventListener('input', () => {
                activeNota.nota = document.getElementById('nota').value.trim();
                saveData();
            });
            document.getElementById('customer').addEventListener('input', () => {
                let customer = document.getElementById('customer').value.trim();
                activeNota.customer = customer || "Pelanggan";
                saveData();
            });
            
            document.getElementById('isPaid').addEventListener('change', togglePaymentMethodVisibility);


            document.getElementById('service').addEventListener('change', setPriceOnServiceChange);
            document.getElementById('weight').addEventListener('input', updateCalculatedTotal);
            document.getElementById('pricePerKg').addEventListener('input', updateCalculatedTotal);
            document.getElementById('qty').addEventListener('input', updateCalculatedTotal);
            document.getElementById('size').addEventListener('change', updateCalculatedTotal);

            document.getElementById('btn-add-item').addEventListener('click', addItemToActiveNota);
            
            document.getElementById('btn-save-nota').addEventListener('click', saveActiveNota);
            document.getElementById('btn-cancel-nota').addEventListener('click', cancelActiveNota);
            
            document.getElementById('pay-modal-cancel').addEventListener('click', () => {
                document.getElementById('pay-modal').classList.add('hidden');
                document.getElementById('pay-modal').classList.remove('flex');
            });
            document.getElementById('pay-modal-confirm').addEventListener('click', finalizePayment);

            document.getElementById('notes-modal-cancel').addEventListener('click', () => {
                document.getElementById('notes-modal').classList.add('hidden');
                document.getElementById('notes-modal').classList.remove('flex');
            });
            document.getElementById('notes-modal-save').addEventListener('click', saveEditedNotes);

            document.getElementById('history-day-list').addEventListener('click', (e) => {
                if (e.target.closest('.btn-view-detail')) {
                    const btn = e.target.closest('.btn-view-detail');
                    const date = btn.dataset.date;
                    switchView('history', date);
                }
            });
            document.getElementById('btn-back-history').addEventListener('click', () => {
                switchView('history', null);
            });
            document.getElementById('btn-delete-history-day').addEventListener('click', (e) => {
                const date = e.currentTarget.dataset.date;
                if (date) deleteHistoryDay(date);
            });

            document.getElementById('btn-export-data').addEventListener('click', exportDataAsJson);
            document.getElementById('file-import').addEventListener('change', importDataFromJson);
            document.getElementById('tab-debt').addEventListener('click', () => {
                switchView('debt');
            });
            document.getElementById('search-debt').addEventListener('input', renderDebtBook);
            
        });
    
