/* Bhoomi Stock Management Workflow - localStorage powered */
(function () {
    const STORAGE_KEYS = {
        submissions: 'bhoomi_stock_submissions',
        requirements: 'bhoomi_industry_requirements'
    };

    function loadSubmissions() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.submissions);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to parse submissions from storage', e);
            return [];
        }
    }

    function saveSubmissions(list) {
        localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(list));
    }

    function generateId() {
        const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
        const time = Date.now().toString(36).toUpperCase();
        return `STK-${time}-${rand}`;
    }

    function generateReqId() {
        const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
        const time = Date.now().toString(36).toUpperCase();
        return `REQ-${time}-${rand}`;
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function toBase64(file) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function createSubmissionFromForm(form) {
        const formData = new FormData(form);
        const photos = form.photos && form.photos.files ? Array.from(form.photos.files) : [];
        const photoLimit = photos.slice(0, 5);
        return Promise.all(photoLimit.map(toBase64)).then(function (base64s) {
            const id = generateId();
            return {
                id: id,
                cropType: formData.get('cropType') || '',
                byproductType: formData.get('byproductType') || '',
                quantity: Number(formData.get('quantity') || 0),
                quantityUnit: formData.get('quantityUnit') || 'Tons',
                qualityGrade: formData.get('qualityGrade') || '',
                harvestDate: formData.get('harvestDate') || '',
                storageLocation: formData.get('storageLocation') || '',
                expectedPriceRange: formData.get('expectedPriceRange') || '',
                notes: formData.get('notes') || '',
                farmerName: formData.get('farmerName') || '',
                farmerContact: formData.get('farmerContact') || '',
                photos: base64s,
                createdAt: nowIso(),
                statusHistory: [{ status: 'Pending', at: nowIso(), note: '' }],
                currentStatus: 'Pending',
                warehouse: { contactDetails: '', message: '' },
                rejection: { reason: '' }
            };
        });
    }

    function updateStatus(id, status, noteObj) {
        const list = loadSubmissions();
        const idx = list.findIndex(function (s) { return s.id === id; });
        if (idx === -1) { return false; }
        if (status === 'Accepted') {
            list[idx].warehouse = {
                contactDetails: (noteObj && noteObj.contactDetails) || '',
                message: (noteObj && noteObj.message) || ''
            };
            list[idx].rejection = { reason: '' };
        }
        if (status === 'Rejected') {
            list[idx].rejection = { reason: (noteObj && noteObj.reason) || '' };
            list[idx].warehouse = { contactDetails: '', message: '' };
        }
        list[idx].currentStatus = status;
        list[idx].statusHistory.push({ status: status, at: nowIso(), note: (noteObj && (noteObj.reason || noteObj.message)) || '' });
        saveSubmissions(list);
        return true;
    }

    function reapplySubmission(id) {
        const list = loadSubmissions();
        const submission = list.find(function (s) { return s.id === id; });
        if (!submission) { return null; }
        const clone = Object.assign({}, submission, {
            id: generateId(),
            createdAt: nowIso(),
            currentStatus: 'Pending',
            statusHistory: [{ status: 'Pending', at: nowIso(), note: 'Reapplied' }],
            warehouse: { contactDetails: '', message: '' },
            rejection: { reason: '' }
        });
        list.push(clone);
        saveSubmissions(list);
        return clone;
    }

    function formatDateShort(iso) {
        if (!iso) { return ''; }
        try {
            const d = new Date(iso);
            return d.toLocaleDateString();
        } catch (e) { return iso; }
    }

    function statusBadge(status) {
        var cls = 'secondary';
        if (status === 'Pending') cls = 'warning';
        if (status === 'Accepted') cls = 'success';
        if (status === 'Rejected') cls = 'danger';
        return '<span class="badge bg-' + cls + '">' + status + '</span>';
    }

    function renderFarmerTable(filterStatus) {
        const tbody = document.getElementById('farmerSubmissionsTable');
        if (!tbody) { return; }
        const list = loadSubmissions().slice().reverse();
        const filtered = filterStatus ? list.filter(function (s) { return s.currentStatus === filterStatus; }) : list;
        tbody.innerHTML = filtered.map(function (s) {
            var actions = '';
            if (s.currentStatus === 'Rejected') {
                actions += '<button class="btn btn-sm btn-primary reapply-btn" data-id="' + s.id + '">Reapply</button>';
            } else if (s.currentStatus === 'Accepted') {
                actions += '<button class="btn btn-sm btn-outline-secondary view-accepted-btn" data-id="' + s.id + '">View</button>';
            } else {
                actions += '<span class="text-muted">—</span>';
            }
            return '<tr>' +
                '<td class="text-nowrap">' + s.id + '</td>' +
                '<td>' + s.cropType + '</td>' +
                '<td>' + s.byproductType + '</td>' +
                '<td>' + s.quantity + ' ' + s.quantityUnit + '</td>' +
                '<td>' + statusBadge(s.currentStatus) + '</td>' +
                '<td>' + actions + '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.reapply-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                openConfirmReapply(id);
            });
        });

        tbody.querySelectorAll('.view-accepted-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                const list = loadSubmissions();
                const s = list.find(function (x) { return x.id === id; });
                if (!s) { return; }
                alert('Warehouse Contact Details:\n' + (s.warehouse.contactDetails || 'N/A') + '\n\nMessage:\n' + (s.warehouse.message || ''));
            });
        });
    }

    function renderFarmerNotifications() {
        const holder = document.getElementById('farmerNotifications');
        if (!holder) { return; }
        const list = loadSubmissions().slice().reverse();
        holder.innerHTML = list.map(function (s) {
            if (s.currentStatus === 'Accepted') {
                return '<a class="list-group-item list-group-item-action">' +
                    '<div class="d-flex w-100 justify-content-between">' +
                        '<strong>Stock Request Approved</strong>' +
                        '<small class="text-muted">' + formatDateShort(s.createdAt) + '</small>' +
                    '</div>' +
                    '<div class="small">' + s.cropType + ' - ' + s.byproductType + ' (' + s.quantity + ' ' + s.quantityUnit + ')</div>' +
                    '<div class="mt-1">Warehouse Contact: ' + (s.warehouse.contactDetails || '—') + '</div>' +
                    (s.warehouse.message ? '<div class="text-muted">' + s.warehouse.message + '</div>' : '') +
                '</a>';
            }
            if (s.currentStatus === 'Rejected') {
                return '<a class="list-group-item list-group-item-action">' +
                    '<div class="d-flex w-100 justify-content-between">' +
                        '<strong>Stock Request Rejected</strong>' +
                        '<small class="text-muted">' + formatDateShort(s.createdAt) + '</small>' +
                    '</div>' +
                    '<div class="small">Reason: ' + (s.rejection.reason || '—') + '</div>' +
                    '<div class="mt-1"><button class="btn btn-sm btn-primary reapply-inline" data-id="' + s.id + '">Reapply</button></div>' +
                '</a>';
            }
            return '<a class="list-group-item">' +
                '<div class="d-flex w-100 justify-content-between">' +
                    '<strong>Stock Submitted</strong>' +
                    '<small class="text-muted">' + formatDateShort(s.createdAt) + '</small>' +
                '</div>' +
                '<div class="small">Awaiting warehouse response...</div>' +
            '</a>';
        }).join('');

        holder.querySelectorAll('.reapply-inline').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                openConfirmReapply(id);
            });
        });
    }

    function openConfirmReapply(id) {
        var modalEl = document.getElementById('confirmReapplyModal');
        if (!modalEl) { return; }
        var modal = new bootstrap.Modal(modalEl);
        var confirmBtn = document.getElementById('confirmReapplyBtn');
        function handler() {
            const newSubmission = reapplySubmission(id);
            modal.hide();
            renderFarmerTable(document.getElementById('farmerFilterStatus') ? document.getElementById('farmerFilterStatus').value : '');
            renderFarmerNotifications();
            confirmBtn.removeEventListener('click', handler);
        }
        confirmBtn.addEventListener('click', handler);
        modal.show();
    }

    function initFarmerPage() {
        const form = document.getElementById('farmerStockForm');
        const submitModalEl = document.getElementById('confirmSubmitModal');
        var pendingSubmission = null;
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                pendingSubmission = form;
                var modal = new bootstrap.Modal(submitModalEl);
                modal.show();
            });
        }
        var confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
        if (confirmSubmitBtn) {
            confirmSubmitBtn.addEventListener('click', function () {
                if (!pendingSubmission) return;
                createSubmissionFromForm(pendingSubmission).then(function (submission) {
                    const list = loadSubmissions();
                    list.push(submission);
                    saveSubmissions(list);
                    pendingSubmission.reset();
                    bootstrap.Modal.getInstance(submitModalEl).hide();
                    renderFarmerTable(document.getElementById('farmerFilterStatus') ? document.getElementById('farmerFilterStatus').value : '');
                    renderFarmerNotifications();
                });
            });
        }

        var filter = document.getElementById('farmerFilterStatus');
        if (filter) {
            filter.addEventListener('change', function () { renderFarmerTable(filter.value); });
        }
        renderFarmerTable(filter ? filter.value : '');
        renderFarmerNotifications();
    }

    function renderWarehouseTable() {
        const tbody = document.getElementById('warehouseRequestsTable');
        if (!tbody) { return; }
        const search = (document.getElementById('searchInput') && document.getElementById('searchInput').value || '').toLowerCase();
        const status = (document.getElementById('statusFilter') && document.getElementById('statusFilter').value) || '';
        let list = loadSubmissions().slice().reverse();
        if (status) list = list.filter(function (s) { return s.currentStatus === status; });
        if (search) {
            list = list.filter(function (s) {
                const hay = [s.farmerName, s.farmerContact, s.cropType, s.byproductType, s.storageLocation].join(' ').toLowerCase();
                return hay.indexOf(search) !== -1;
            });
        }
        tbody.innerHTML = list.map(function (s) {
            const actionBtns = s.currentStatus === 'Pending'
                ? ('<div class="d-flex gap-2">' +
                    '<button class="btn btn-sm btn-success accept-btn" data-id="' + s.id + '">Accept & Invite</button>' +
                    '<button class="btn btn-sm btn-danger reject-btn" data-id="' + s.id + '">Reject</button>' +
                   '</div>')
                : '<span class="text-muted">—</span>';
            return '<tr>' +
                '<td class="text-nowrap">' + s.id + '</td>' +
                '<td>' + (s.farmerName || '—') + '</td>' +
                '<td>' + (s.farmerContact || '—') + '</td>' +
                '<td>' + s.cropType + ' / ' + s.byproductType + '</td>' +
                '<td>' + s.quantity + ' ' + s.quantityUnit + '</td>' +
                '<td>' + s.storageLocation + '</td>' +
                '<td>' + s.harvestDate + '</td>' +
                '<td>' + statusBadge(s.currentStatus) + '</td>' +
                '<td>' + actionBtns + '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.accept-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openAcceptModal(btn.getAttribute('data-id'));
            });
        });
        tbody.querySelectorAll('.reject-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openRejectModal(btn.getAttribute('data-id'));
            });
        });
    }

    function openAcceptModal(id) {
        var modalEl = document.getElementById('acceptModal');
        if (!modalEl) { return; }
        var modal = new bootstrap.Modal(modalEl);
        var confirmBtn = document.getElementById('confirmAcceptBtn');
        var contactEl = document.getElementById('acceptContactDetails');
        var messageEl = document.getElementById('acceptMessage');
        contactEl.value = '';
        messageEl.value = '';
        function handler() {
            updateStatus(id, 'Accepted', { contactDetails: contactEl.value, message: messageEl.value });
            modal.hide();
            renderWarehouseTable();
        }
        confirmBtn.addEventListener('click', handler, { once: true });
        modal.show();
    }

    function openRejectModal(id) {
        var modalEl = document.getElementById('rejectModal');
        if (!modalEl) { return; }
        var modal = new bootstrap.Modal(modalEl);
        var confirmBtn = document.getElementById('confirmRejectBtn');
        var reasonEl = document.getElementById('rejectReason');
        reasonEl.value = '';
        function handler() {
            updateStatus(id, 'Rejected', { reason: reasonEl.value });
            modal.hide();
            renderWarehouseTable();
        }
        confirmBtn.addEventListener('click', handler, { once: true });
        modal.show();
    }

    function initWarehousePage() {
        var searchEl = document.getElementById('searchInput');
        var statusEl = document.getElementById('statusFilter');
        if (searchEl) searchEl.addEventListener('input', renderWarehouseTable);
        if (statusEl) statusEl.addEventListener('change', renderWarehouseTable);
        renderWarehouseTable();
    }

    // ===================== Industry Requirements Workflow =====================
    function loadRequirements() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.requirements);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to parse requirements from storage', e);
            return [];
        }
    }

    function saveRequirements(list) {
        localStorage.setItem(STORAGE_KEYS.requirements, JSON.stringify(list));
    }

    function createRequirementFromForm(form) {
        const fd = new FormData(form);
        return {
            id: generateReqId(),
            materialType: fd.get('materialType') || '',
            quantity: Number(fd.get('quantity') || 0),
            quantityUnit: fd.get('quantityUnit') || 'Tons',
            qualitySpec: fd.get('qualitySpec') || '',
            deliveryDate: fd.get('deliveryDate') || '',
            deliveryLocation: fd.get('deliveryLocation') || '',
            budgetRange: fd.get('budgetRange') || '',
            useCase: fd.get('useCase') || '',
            urgency: fd.get('urgency') || 'Normal',
            notes: fd.get('notes') || '',
            poDetails: fd.get('poDetails') || '',
            companyName: fd.get('companyName') || '',
            companyContact: fd.get('companyContact') || '',
            createdAt: nowIso(),
            statusHistory: [{ status: 'Pending', at: nowIso(), note: '' }],
            currentStatus: 'Pending',
            warehouseQuote: { price: '', timeline: '', contact: '', message: '' },
            rejection: { reason: '' }
        };
    }

    function updateRequirementStatus(id, status, detail) {
        const list = loadRequirements();
        const idx = list.findIndex(function (r) { return r.id === id; });
        if (idx === -1) return false;
        if (status === 'Accepted') {
            list[idx].warehouseQuote = {
                price: (detail && detail.price) || '',
                timeline: (detail && detail.timeline) || '',
                contact: (detail && detail.contact) || '',
                message: (detail && detail.message) || ''
            };
            list[idx].rejection = { reason: '' };
        }
        if (status === 'Rejected') {
            list[idx].rejection = { reason: (detail && detail.reason) || '' };
            list[idx].warehouseQuote = { price: '', timeline: '', contact: '', message: '' };
        }
        list[idx].currentStatus = status;
        list[idx].statusHistory.push({ status: status, at: nowIso(), note: (detail && (detail.reason || detail.message)) || '' });
        saveRequirements(list);
        return true;
    }

    function resubmitRequirement(id) {
        const list = loadRequirements();
        const r = list.find(function (x) { return x.id === id; });
        if (!r) return null;
        const clone = Object.assign({}, r, {
            id: generateReqId(),
            createdAt: nowIso(),
            currentStatus: 'Pending',
            statusHistory: [{ status: 'Pending', at: nowIso(), note: 'Resubmitted' }],
            warehouseQuote: { price: '', timeline: '', contact: '', message: '' },
            rejection: { reason: '' }
        });
        list.push(clone);
        saveRequirements(list);
        return clone;
    }

    function renderIndustryTable(filterStatus) {
        const tbody = document.getElementById('industryRequirementsTable');
        if (!tbody) return;
        const list = loadRequirements().slice().reverse();
        const filtered = filterStatus ? list.filter(function (r) { return r.currentStatus === filterStatus; }) : list;
        tbody.innerHTML = filtered.map(function (r) {
            var actions = '';
            if (r.currentStatus === 'Rejected') {
                actions += '<button class="btn btn-sm btn-primary resubmit-btn" data-id="' + r.id + '">Resubmit</button>';
            } else if (r.currentStatus === 'Accepted') {
                actions += '<button class="btn btn-sm btn-outline-secondary view-quote-btn" data-id="' + r.id + '">View</button>';
            } else {
                actions += '<span class="text-muted">—</span>';
            }
            return '<tr>' +
                '<td class="text-nowrap">' + r.id + '</td>' +
                '<td>' + r.materialType + '</td>' +
                '<td>' + r.quantity + ' ' + r.quantityUnit + '</td>' +
                '<td>' + statusBadge(r.currentStatus) + '</td>' +
                '<td>' + actions + '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.resubmit-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openConfirmResubmit(btn.getAttribute('data-id'));
            });
        });
        tbody.querySelectorAll('.view-quote-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                const list = loadRequirements();
                const r = list.find(function (x) { return x.id === id; });
                if (!r) return;
                alert('Warehouse Quote Details:\nPrice: ' + (r.warehouseQuote.price || 'N/A') + '\nTimeline: ' + (r.warehouseQuote.timeline || 'N/A') + '\nContact: ' + (r.warehouseQuote.contact || 'N/A') + '\n\nMessage:\n' + (r.warehouseQuote.message || ''));
            });
        });
    }

    function renderIndustryNotifications() {
        const holder = document.getElementById('industryNotifications');
        if (!holder) return;
        const list = loadRequirements().slice().reverse();
        holder.innerHTML = list.map(function (r) {
            if (r.currentStatus === 'Accepted') {
                return '<a class="list-group-item list-group-item-action">' +
                    '<div class="d-flex w-100 justify-content-between">' +
                        '<strong>Requirement Approved</strong>' +
                        '<small class="text-muted">' + formatDateShort(r.createdAt) + '</small>' +
                    '</div>' +
                    '<div class="small">' + r.materialType + ' (' + r.quantity + ' ' + r.quantityUnit + ')</div>' +
                    '<div class="mt-1">Quote: ' + (r.warehouseQuote.price || '—') + ' | ' + (r.warehouseQuote.timeline || '') + '</div>' +
                    (r.warehouseQuote.contact ? '<div class="text-muted">Contact: ' + r.warehouseQuote.contact + '</div>' : '') +
                    (r.warehouseQuote.message ? '<div class="text-muted">' + r.warehouseQuote.message + '</div>' : '') +
                '</a>';
            }
            if (r.currentStatus === 'Rejected') {
                return '<a class="list-group-item list-group-item-action">' +
                    '<div class="d-flex w-100 justify-content-between">' +
                        '<strong>Requirement Rejected</strong>' +
                        '<small class="text-muted">' + formatDateShort(r.createdAt) + '</small>' +
                    '</div>' +
                    '<div class="small">Reason: ' + (r.rejection.reason || '—') + '</div>' +
                    '<div class="mt-1"><button class="btn btn-sm btn-primary resubmit-inline" data-id="' + r.id + '">Resubmit</button></div>' +
                '</a>';
            }
            return '<a class="list-group-item">' +
                '<div class="d-flex w-100 justify-content-between">' +
                    '<strong>Requirement Submitted</strong>' +
                    '<small class="text-muted">' + formatDateShort(r.createdAt) + '</small>' +
                '</div>' +
                '<div class="small">Awaiting warehouse response...</div>' +
            '</a>';
        }).join('');

        holder.querySelectorAll('.resubmit-inline').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openConfirmResubmit(btn.getAttribute('data-id'));
            });
        });
    }

    function openConfirmResubmit(id) {
        var modalEl = document.getElementById('confirmResubmitModal');
        if (!modalEl) return;
        var modal = new bootstrap.Modal(modalEl);
        var confirmBtn = document.getElementById('confirmResubmitBtn');
        function handler() {
            resubmitRequirement(id);
            modal.hide();
            renderIndustryTable(document.getElementById('industryFilterStatus') ? document.getElementById('industryFilterStatus').value : '');
            renderIndustryNotifications();
            confirmBtn.removeEventListener('click', handler);
        }
        confirmBtn.addEventListener('click', handler);
        modal.show();
    }

    function openAcceptReqModal(id) {
        var modalEl = document.getElementById('acceptReqModal');
        if (!modalEl) return;
        var modal = new bootstrap.Modal(modalEl);
        var priceEl = document.getElementById('acceptReqPrice');
        var timelineEl = document.getElementById('acceptReqTimeline');
        var contactEl = document.getElementById('acceptReqContact');
        var messageEl = document.getElementById('acceptReqMessage');
        priceEl.value = '';
        timelineEl.value = '';
        contactEl.value = '';
        messageEl.value = '';
        var confirmBtn = document.getElementById('acceptReqConfirmBtn');
        function handler() {
            updateRequirementStatus(id, 'Accepted', {
                price: priceEl.value,
                timeline: timelineEl.value,
                contact: contactEl.value,
                message: messageEl.value
            });
            modal.hide();
            renderWarehouseRequirementsTable();
        }
        confirmBtn.addEventListener('click', handler, { once: true });
        modal.show();
    }

    function openRejectReqModal(id) {
        var modalEl = document.getElementById('rejectReqModal');
        if (!modalEl) return;
        var modal = new bootstrap.Modal(modalEl);
        var reasonEl = document.getElementById('rejectReqReason');
        reasonEl.value = '';
        var confirmBtn = document.getElementById('rejectReqConfirmBtn');
        function handler() {
            updateRequirementStatus(id, 'Rejected', { reason: reasonEl.value });
            modal.hide();
            renderWarehouseRequirementsTable();
        }
        confirmBtn.addEventListener('click', handler, { once: true });
        modal.show();
    }

    function renderWarehouseRequirementsTable() {
        const tbody = document.getElementById('warehouseRequirementsTable');
        if (!tbody) return;
        const search = (document.getElementById('searchReqInput') && document.getElementById('searchReqInput').value || '').toLowerCase();
        const status = (document.getElementById('statusReqFilter') && document.getElementById('statusReqFilter').value) || '';
        let list = loadRequirements().slice().reverse();
        if (status) list = list.filter(function (r) { return r.currentStatus === status; });
        if (search) {
            list = list.filter(function (r) {
                const hay = [r.companyName, r.companyContact, r.materialType, r.deliveryLocation].join(' ').toLowerCase();
                return hay.indexOf(search) !== -1;
            });
        }
        tbody.innerHTML = list.map(function (r) {
            const actionBtns = r.currentStatus === 'Pending'
                ? ('<div class="d-flex gap-2">' +
                    '<button class="btn btn-sm btn-success accept-req-btn" data-id="' + r.id + '">Accept & Quote</button>' +
                    '<button class="btn btn-sm btn-danger reject-req-btn" data-id="' + r.id + '">Reject</button>' +
                   '</div>')
                : '<span class="text-muted">—</span>';
            return '<tr>' +
                '<td class="text-nowrap">' + r.id + '</td>' +
                '<td>' + (r.companyName || '—') + '</td>' +
                '<td>' + (r.companyContact || '—') + '</td>' +
                '<td>' + r.materialType + ' (' + r.qualitySpec + ')</td>' +
                '<td>' + r.quantity + ' ' + r.quantityUnit + '</td>' +
                '<td>' + r.deliveryLocation + ' | ' + r.deliveryDate + '</td>' +
                '<td>' + (r.budgetRange || '—') + '</td>' +
                '<td>' + statusBadge(r.currentStatus) + '</td>' +
                '<td>' + actionBtns + '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.accept-req-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { openAcceptReqModal(btn.getAttribute('data-id')); });
        });
        tbody.querySelectorAll('.reject-req-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { openRejectReqModal(btn.getAttribute('data-id')); });
        });
    }

    function initIndustryPage() {
        const form = document.getElementById('industryReqForm');
        const submitModalEl = document.getElementById('confirmIndustrySubmitModal');
        var pending = null;
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                pending = form;
                var modal = new bootstrap.Modal(submitModalEl);
                modal.show();
            });
        }
        var confirmBtn = document.getElementById('confirmIndustrySubmitBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function () {
                if (!pending) return;
                const req = createRequirementFromForm(pending);
                const list = loadRequirements();
                list.push(req);
                saveRequirements(list);
                pending.reset();
                bootstrap.Modal.getInstance(submitModalEl).hide();
                renderIndustryTable(document.getElementById('industryFilterStatus') ? document.getElementById('industryFilterStatus').value : '');
                renderIndustryNotifications();
            });
        }

        var filter = document.getElementById('industryFilterStatus');
        if (filter) {
            filter.addEventListener('change', function () { renderIndustryTable(filter.value); });
        }
        renderIndustryTable(filter ? filter.value : '');
        renderIndustryNotifications();
    }

    function initWarehouseRequirements() {
        var searchEl = document.getElementById('searchReqInput');
        var statusEl = document.getElementById('statusReqFilter');
        if (searchEl) searchEl.addEventListener('input', renderWarehouseRequirementsTable);
        if (statusEl) statusEl.addEventListener('change', renderWarehouseRequirementsTable);
        renderWarehouseRequirementsTable();
    }

    // ===================== Storage Rentals & Billing =====================
    function loadRentals() {
        try {
            const raw = localStorage.getItem('bhoomi_rentals');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }
    function saveRentals(list) { localStorage.setItem('bhoomi_rentals', JSON.stringify(list)); }

    function loadInvoices() {
        try {
            const raw = localStorage.getItem('bhoomi_invoices');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }
    function saveInvoices(list) { localStorage.setItem('bhoomi_invoices', JSON.stringify(list)); }

    function loadAgreements() {
        try {
            const raw = localStorage.getItem('bhoomi_agreements');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }
    function saveAgreements(list) { localStorage.setItem('bhoomi_agreements', JSON.stringify(list)); }

    function loadReminders() {
        try {
            const raw = localStorage.getItem('bhoomi_reminders');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }
    function saveReminders(list) { localStorage.setItem('bhoomi_reminders', JSON.stringify(list)); }

    function createRentalFromForm(form) {
        const fd = new FormData(form);
        const reqs = [];
        if (fd.get('req_temp')) reqs.push('Temperature Control');
        if (fd.get('req_moist')) reqs.push('Moisture Protection');
        if (fd.get('req_pest')) reqs.push('Pest Control');
        if (fd.get('req_security')) reqs.push('Security');
        return {
            id: generateReqId().replace('REQ', 'RNT'),
            farmerName: fd.get('farmerName') || '',
            farmerContact: fd.get('farmerContact') || '',
            durationValue: Number(fd.get('durationValue') || 0),
            durationUnit: fd.get('durationUnit') || 'Months',
            area: Number(fd.get('area') || 0),
            areaUnit: fd.get('areaUnit') || 'sq.ft',
            commodityType: fd.get('commodityType') || '',
            commodityQty: fd.get('commodityQty') || '',
            startDate: fd.get('startDate') || '',
            budget: fd.get('budget') || '',
            requirements: reqs,
            notes: fd.get('notes') || '',
            createdAt: nowIso(),
            currentStatus: 'Pending',
            statusHistory: [{ status: 'Pending', at: nowIso(), note: '' }],
            warehouseQuote: { ratePerSqftMonth: '', message: '', contact: '' }
        };
    }

    function updateRentalStatus(id, status, detail) {
        const list = loadRentals();
        const idx = list.findIndex(function (r) { return r.id === id; });
        if (idx === -1) return false;
        if (status === 'Accepted') {
            list[idx].warehouseQuote = {
                ratePerSqftMonth: (detail && detail.rate) || '',
                message: (detail && detail.message) || '',
                contact: (detail && detail.contact) || ''
            };
        }
        if (status === 'Rejected') {
            list[idx].warehouseQuote = { ratePerSqftMonth: '', message: '', contact: '' };
        }
        list[idx].currentStatus = status;
        list[idx].statusHistory.push({ status: status, at: nowIso(), note: (detail && (detail.reason || detail.message)) || '' });
        saveRentals(list);
        return true;
    }

    function calcInvoiceTotals(payload) {
        const storageCharge = payload.storageRate * payload.area * payload.durationMonths;
        const handling = payload.handlingCharges || 0;
        const maintenance = payload.maintenanceFees || 0;
        const security = payload.securityServices || 0;
        const subTotal = storageCharge + handling + maintenance + security;
        const gst = subTotal * 0.18;
        const platformCommission = subTotal * (payload.commissionRate || 0.02);
        const total = subTotal + gst + platformCommission;
        return { storageCharge, handling, maintenance, security, subTotal, gst, platformCommission, total };
    }

    function generateInvoice(rentalId, payload) {
        const id = 'INV-' + Date.now().toString(36).toUpperCase();
        const totals = calcInvoiceTotals(payload);
        const inv = {
            id: id,
            rentalId: rentalId,
            warehouse: payload.warehouse,
            service: {
                area: payload.area,
                durationMonths: payload.durationMonths,
                storageRate: payload.storageRate,
                handlingCharges: payload.handlingCharges || 0,
                maintenanceFees: payload.maintenanceFees || 0,
                securityServices: payload.securityServices || 0
            },
            totals: totals,
            createdAt: nowIso(),
            status: 'Unpaid'
        };
        const list = loadInvoices();
        list.push(inv);
        saveInvoices(list);
        return inv;
    }

    function markInvoicePaid(invoiceId) {
        const list = loadInvoices();
        const idx = list.findIndex(function (i) { return i.id === invoiceId; });
        if (idx === -1) return false;
        list[idx].status = 'Paid';
        list[idx].paidAt = nowIso();
        saveInvoices(list);
        return true;
    }

    function renderFarmerRentals(filterStatus) {
        const tbody = document.getElementById('farmerRentalsTable');
        if (!tbody) return;
        let list = loadRentals().slice().reverse();
        if (filterStatus) list = list.filter(function (r) { return r.currentStatus === filterStatus; });
        tbody.innerHTML = list.map(function (r) {
            var actions = '';
            if (r.currentStatus === 'Accepted') {
                actions = '<button class="btn btn-sm btn-outline-secondary view-rental-quote" data-id="' + r.id + '">View</button>';
            } else if (r.currentStatus === 'Rejected') {
                actions = '<span class="text-muted">—</span>';
            } else {
                actions = '<span class="text-muted">—</span>';
            }
            return '<tr>' +
                '<td class="text-nowrap">' + r.id + '</td>' +
                '<td>' + r.area + ' ' + r.areaUnit + '</td>' +
                '<td>' + r.durationValue + ' ' + r.durationUnit + '</td>' +
                '<td>' + statusBadge(r.currentStatus) + '</td>' +
                '<td>' + actions + '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.view-rental-quote').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                const list = loadRentals();
                const r = list.find(function (x) { return x.id === id; });
                if (!r) return;
                alert('Warehouse Rental Quote\nRate: ' + (r.warehouseQuote.ratePerSqftMonth || 'N/A') + ' per sq.ft/month\nContact: ' + (r.warehouseQuote.contact || 'N/A') + '\n\nMessage:\n' + (r.warehouseQuote.message || ''));
            });
        });
    }

    function renderFarmerRentalInvoices() {
        const tbody = document.getElementById('farmerRentalInvoicesTable');
        if (!tbody) return;
        const invoices = loadInvoices().slice().reverse();
        tbody.innerHTML = invoices.map(function (inv) {
            return '<tr>' +
                '<td>' + inv.id + '</td>' +
                '<td>₹' + inv.totals.total.toFixed(2) + '</td>' +
                '<td>' + statusBadge(inv.status === 'Paid' ? 'Accepted' : 'Pending') + '</td>' +
                '<td><div class="d-flex gap-2"><button class="btn btn-sm btn-primary view-invoice" data-id="' + inv.id + '">View</button>' + (inv.status !== 'Paid' ? '<button class="btn btn-sm btn-success pay-invoice" data-id="' + inv.id + '">Mark Paid</button>' : '') + '</div></td>' +
            '</tr>';
        }).join('');
        tbody.querySelectorAll('.view-invoice').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                const list = loadInvoices();
                const inv = list.find(function (x) { return x.id === id; });
                if (!inv) return;
                const t = inv.totals;
                alert('Invoice ' + inv.id + '\nWarehouse: ' + inv.warehouse.companyName + '\nGSTIN: ' + inv.warehouse.gstin + '\n\nStorage: ₹' + t.storageCharge.toFixed(2) + '\nHandling: ₹' + t.handling.toFixed(2) + '\nMaintenance: ₹' + t.maintenance.toFixed(2) + '\nSecurity: ₹' + t.security.toFixed(2) + '\nGST (18%): ₹' + t.gst.toFixed(2) + '\nPlatform Commission: ₹' + t.platformCommission.toFixed(2) + '\nTotal: ₹' + t.total.toFixed(2));
            });
        });
        tbody.querySelectorAll('.pay-invoice').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                markInvoicePaid(id);
                renderFarmerRentalInvoices();
            });
        });
    }

    function renderWarehouseRentalsTable() {
        const tbody = document.getElementById('warehouseRentalsTable');
        if (!tbody) return;
        const search = (document.getElementById('searchRentalInput') && document.getElementById('searchRentalInput').value || '').toLowerCase();
        const status = (document.getElementById('statusRentalFilter') && document.getElementById('statusRentalFilter').value) || '';
        let list = loadRentals().slice().reverse();
        if (status) list = list.filter(function (r) { return r.currentStatus === status; });
        if (search) {
            list = list.filter(function (r) {
                const hay = [r.farmerName, r.farmerContact, r.commodityType].join(' ').toLowerCase();
                return hay.indexOf(search) !== -1;
            });
        }
        tbody.innerHTML = list.map(function (r) {
            const actionBtns = r.currentStatus === 'Pending'
                ? ('<div class="d-flex gap-2">' +
                    '<button class="btn btn-sm btn-success accept-rental-btn" data-id="' + r.id + '">Accept & Quote</button>' +
                    '<button class="btn btn-sm btn-danger reject-rental-btn" data-id="' + r.id + '">Reject</button>' +
                   '</div>')
                : '<span class="text-muted">—</span>';
            return '<tr>' +
                '<td class="text-nowrap">' + r.id + '</td>' +
                '<td>' + (r.farmerName || '—') + '</td>' +
                '<td>' + (r.farmerContact || '—') + '</td>' +
                '<td>' + r.area + ' ' + r.areaUnit + '</td>' +
                '<td>' + r.durationValue + ' ' + r.durationUnit + '</td>' +
                '<td>' + r.commodityType + '</td>' +
                '<td>' + r.startDate + '</td>' +
                '<td>' + statusBadge(r.currentStatus) + '</td>' +
                '<td>' + actionBtns + '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.accept-rental-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { openAcceptRentalModal(btn.getAttribute('data-id')); });
        });
        tbody.querySelectorAll('.reject-rental-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { openRejectRentalModal(btn.getAttribute('data-id')); });
        });
    }

    function openAcceptRentalModal(id) {
        var modalEl = document.getElementById('acceptRentalModal');
        if (!modalEl) return;
        var modal = new bootstrap.Modal(modalEl);
        var rateEl = document.getElementById('acceptRentalRate');
        var contactEl = document.getElementById('acceptRentalContact');
        var messageEl = document.getElementById('acceptRentalMessage');
        rateEl.value = '';
        contactEl.value = '';
        messageEl.value = '';
        var confirmBtn = document.getElementById('acceptRentalConfirmBtn');
        function handler() {
            updateRentalStatus(id, 'Accepted', { rate: rateEl.value, contact: contactEl.value, message: messageEl.value });
            modal.hide();
            renderWarehouseRentalsTable();
        }
        confirmBtn.addEventListener('click', handler, { once: true });
        modal.show();
    }

    function openRejectRentalModal(id) {
        var modalEl = document.getElementById('rejectRentalModal');
        if (!modalEl) return;
        var modal = new bootstrap.Modal(modalEl);
        var reasonEl = document.getElementById('rejectRentalReason');
        reasonEl.value = '';
        var confirmBtn = document.getElementById('rejectRentalConfirmBtn');
        function handler() {
            updateRentalStatus(id, 'Rejected', { reason: reasonEl.value });
            modal.hide();
            renderWarehouseRentalsTable();
        }
        confirmBtn.addEventListener('click', handler, { once: true });
        modal.show();
    }

    function initRentals() {
        const form = document.getElementById('rentalRequestForm');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                const rental = createRentalFromForm(form);
                const list = loadRentals();
                list.push(rental);
                saveRentals(list);
                form.reset();
                renderFarmerRentals(document.getElementById('rentalFilterStatus') ? document.getElementById('rentalFilterStatus').value : '');
                renderFarmerRentalInvoices();
            });
        }
        var filter = document.getElementById('rentalFilterStatus');
        if (filter) filter.addEventListener('change', function () { renderFarmerRentals(filter.value); });
        renderFarmerRentals(filter ? filter.value : '');
        renderFarmerRentalInvoices();
    }

    function initWarehouseRentals() {
        var searchEl = document.getElementById('searchRentalInput');
        var statusEl = document.getElementById('statusRentalFilter');
        if (searchEl) searchEl.addEventListener('input', renderWarehouseRentalsTable);
        if (statusEl) statusEl.addEventListener('change', renderWarehouseRentalsTable);
        renderWarehouseRentalsTable();
    }

    function monthKey(dateIso) {
        const d = new Date(dateIso);
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    }
    function quarterKey(dateIso) {
        const d = new Date(dateIso);
        const q = Math.floor(d.getMonth()/3)+1;
        return d.getFullYear() + '-Q' + q;
    }

    function renderIncomeTable() {
        const periodEl = document.getElementById('incomePeriod');
        if (!periodEl) return;
        const period = periodEl.value || 'monthly';
        const tbody = document.getElementById('rentalIncomeTable');
        const invoices = loadInvoices();
        const groups = {};
        invoices.forEach(function (inv) {
            const key = period === 'monthly' ? monthKey(inv.createdAt) : quarterKey(inv.createdAt);
            if (!groups[key]) groups[key] = { gross: 0, commission: 0, paid: 0, unpaid: 0 };
            groups[key].gross += inv.totals.subTotal + inv.totals.gst + inv.totals.platformCommission;
            groups[key].commission += inv.totals.platformCommission;
            if (inv.status === 'Paid') groups[key].paid += inv.totals.total; else groups[key].unpaid += inv.totals.total;
        });
        const rows = Object.keys(groups).sort().map(function (key) {
            const g = groups[key];
            const net = g.gross - g.commission;
            return '<tr>' +
                '<td>' + key + '</td>' +
                '<td>₹' + g.gross.toFixed(2) + '</td>' +
                '<td>₹' + g.commission.toFixed(2) + '</td>' +
                '<td>₹' + net.toFixed(2) + '</td>' +
                '<td>₹' + g.paid.toFixed(2) + '</td>' +
                '<td>₹' + g.unpaid.toFixed(2) + '</td>' +
            '</tr>';
        }).join('');
        tbody.innerHTML = rows || '<tr><td colspan="6" class="text-center text-muted">No invoices yet</td></tr>';
    }

    function computeUpcomingRenewals() {
        const holder = document.getElementById('upcomingRenewals');
        if (!holder) return;
        const rentals = loadRentals();
        const now = new Date();
        const soon = new Date();
        soon.setDate(soon.getDate()+30);
        const upcoming = rentals.filter(function (r) {
            if (r.currentStatus !== 'Accepted') return false;
            const start = new Date(r.startDate);
            const months = (r.durationUnit.toLowerCase().indexOf('month') !== -1) ? r.durationValue : (r.durationValue/30);
            const end = new Date(start);
            end.setMonth(end.getMonth()+Math.ceil(months));
            return end >= now && end <= soon;
        });
        if (upcoming.length === 0) { holder.innerHTML = '<div class="text-muted">None</div>'; return; }
        holder.innerHTML = upcoming.map(function (r) {
            return '<div>Rental ' + r.id + ' for ' + r.area + ' ' + r.areaUnit + ' ends soon. Start: ' + r.startDate + '</div>';
        }).join('');
    }

    function initIncome() {
        var periodEl = document.getElementById('incomePeriod');
        if (periodEl) periodEl.addEventListener('change', renderIncomeTable);
        renderIncomeTable();
        computeUpcomingRenewals();
    }

    // ===================== Export Management =====================
    function loadExports() {
        try {
            const raw = localStorage.getItem('bhoomi_exports');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }
    function saveExports(list) { localStorage.setItem('bhoomi_exports', JSON.stringify(list)); }

    function createExportFromForm(form) {
        const fd = new FormData(form);
        return {
            id: generateReqId().replace('REQ', 'EXP'),
            country: fd.get('country') || '',
            incoterm: fd.get('incoterm') || '',
            byproductType: fd.get('byproductType') || '',
            quantityTons: Number(fd.get('quantity') || 0),
            qualityGrade: fd.get('qualityGrade') || '',
            hsCode: fd.get('hsCode') || '',
            shipmentDate: fd.get('shipmentDate') || '',
            pol: fd.get('pol') || '',
            pod: fd.get('pod') || '',
            buyer: {
                company: fd.get('buyerCompany') || '',
                address: fd.get('buyerAddress') || '',
                contact: fd.get('buyerContact') || '',
                license: fd.get('buyerLicense') || ''
            },
            insurance: fd.get('insurance') || '',
            specialHandling: fd.get('specialHandling') || '',
            documents: {
                commercialInvoice: null,
                packingList: null,
                proForma: null,
                certificateOfOrigin: null
            },
            complianceChecklist: [],
            gstRefund: { eligible: true, status: 'Unclaimed' },
            status: 'Initiated',
            createdAt: nowIso()
        };
    }

    function buildCommercialInvoice(exp) {
        return {
            title: 'Commercial Invoice',
            gst: 0, // zero-rated exports
            seller: { companyName: 'Bhoomi Warehouse Pvt Ltd', gstin: '27ABCDE1234F1Z5', address: 'Mumbai, India' },
            buyer: exp.buyer,
            items: [{ description: exp.byproductType + ' (' + exp.qualityGrade + ')', hsCode: exp.hsCode, qtyTons: exp.quantityTons, rate: 0, amount: 0 }],
            meta: { incoterm: exp.incoterm, pol: exp.pol, pod: exp.pod, shipmentDate: exp.shipmentDate },
            createdAt: nowIso()
        };
    }
    function buildPackingList(exp) {
        return {
            title: 'Packing List',
            lines: [{ commodity: exp.byproductType, grade: exp.qualityGrade, hsCode: exp.hsCode, quantityTons: exp.quantityTons }],
            createdAt: nowIso()
        };
    }
    function buildProForma(exp) {
        return { title: 'Pro Forma Invoice', details: { commodity: exp.byproductType, hsCode: exp.hsCode, quantityTons: exp.quantityTons }, createdAt: nowIso() };
    }
    function buildCOO(exp) {
        return { title: 'Certificate of Origin', origin: 'India', commodity: exp.byproductType, hsCode: exp.hsCode, createdAt: nowIso() };
    }

    function generateExportDocs(id) {
        const list = loadExports();
        const idx = list.findIndex(function (e) { return e.id === id; });
        if (idx === -1) return false;
        const exp = list[idx];
        exp.documents.commercialInvoice = buildCommercialInvoice(exp);
        exp.documents.packingList = buildPackingList(exp);
        exp.documents.proForma = buildProForma(exp);
        exp.documents.certificateOfOrigin = buildCOO(exp);
        exp.status = 'Documents Ready';
        saveExports(list);
        return true;
    }

    function renderExportsTable(filter) {
        const tbody = document.getElementById('exportsTable');
        if (!tbody) return;
        let list = loadExports().slice().reverse();
        if (filter) list = list.filter(function (e) { return e.status === filter; });
        tbody.innerHTML = list.map(function (e) {
            return '<tr>' +
                '<td class="text-nowrap">' + e.id + '</td>' +
                '<td>' + e.country + '</td>' +
                '<td>' + e.byproductType + '</td>' +
                '<td>' + e.status + '</td>' +
                '<td><div class="d-flex gap-2">' +
                    '<button class="btn btn-sm btn-primary btn-export-docs" data-id="' + e.id + '">Gen Docs</button>' +
                    '<button class="btn btn-sm btn-outline-secondary btn-export-track" data-id="' + e.id + '">Advance</button>' +
                '</div></td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.btn-export-docs').forEach(function (btn) {
            btn.addEventListener('click', function () { generateExportDocs(btn.getAttribute('data-id')); renderExportsTable(document.getElementById('exportFilterStatus') ? document.getElementById('exportFilterStatus').value : ''); });
        });
        tbody.querySelectorAll('.btn-export-track').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                const list = loadExports();
                const idx = list.findIndex(function (x) { return x.id === id; });
                if (idx === -1) return;
                const order = ['Initiated','Documents Ready','Customs Cleared','Shipped','Delivered'];
                const cur = order.indexOf(list[idx].status);
                list[idx].status = order[Math.min(order.length-1, cur+1)];
                saveExports(list);
                renderExportsTable(document.getElementById('exportFilterStatus') ? document.getElementById('exportFilterStatus').value : '');
            });
        });
    }

    function renderExportAnalytics() {
        const tbody = document.getElementById('exportAnalyticsTable');
        if (!tbody) return;
        const list = loadExports();
        const byCountry = {};
        list.forEach(function (e) {
            if (!byCountry[e.country]) byCountry[e.country] = { tons: 0, shipments: 0 };
            byCountry[e.country].tons += e.quantityTons;
            byCountry[e.country].shipments += 1;
        });
        const rows = Object.keys(byCountry).sort().map(function (c) {
            return '<tr><td>' + c + '</td><td>' + byCountry[c].tons.toFixed(2) + '</td><td>' + byCountry[c].shipments + '</td></tr>';
        }).join('');
        tbody.innerHTML = rows || '<tr><td colspan="3" class="text-muted text-center">No exports yet</td></tr>';
    }

    async function generateComplianceReportAI(exp) {
        if (!window.geminiAPI) return null;
        const commodity = exp.byproductType;
        const country = exp.country;
        try {
            const compliance = await window.geminiAPI.checkCompliance(commodity, country);
            const docs = await window.geminiAPI.getDocumentationRequirements(commodity, country);
            const duties = await window.geminiAPI.calculateDuties(commodity, country, 0);
            const alerts = await window.geminiAPI.getRegulatoryAlerts(commodity, country);
            return { compliance, docs, duties, alerts };
        } catch (e) { console.error(e); return null; }
    }

    function initExport() {
        const form = document.getElementById('exportInitiateForm');
        const filter = document.getElementById('exportFilterStatus');
        const btnAI = document.getElementById('btnComplianceAI');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                const exp = createExportFromForm(form);
                const list = loadExports();
                list.push(exp);
                saveExports(list);
                form.reset();
                renderExportsTable(filter ? filter.value : '');
                renderExportAnalytics();
            });
        }
        if (filter) filter.addEventListener('change', function () { renderExportsTable(filter.value); });
        if (btnAI) {
            btnAI.addEventListener('click', async function () {
                const fd = new FormData(form);
                const exp = createExportFromForm(form);
                const report = await generateComplianceReportAI(exp);
                alert('AI Compliance Summary\nAllowed: ' + (report && report.compliance ? report.compliance.allowed : 'n/a') + '\nDuties: ' + (report && report.duties ? JSON.stringify(report.duties) : 'n/a'));
            });
        }
        renderExportsTable(filter ? filter.value : '');
        renderExportAnalytics();
    }

    window.BhoomiStock = {
        initFarmerPage: initFarmerPage,
        initWarehousePage: initWarehousePage,
        initIndustryPage: initIndustryPage,
        initWarehouseRequirements: initWarehouseRequirements,
        initRentals: initRentals,
        initWarehouseRentals: initWarehouseRentals,
        initIncome: initIncome,
        generateInvoice: generateInvoice,
        markInvoicePaid: markInvoicePaid,
        loadAgreements: loadAgreements,
        saveAgreements: saveAgreements,
        loadReminders: loadReminders,
        saveReminders: saveReminders
    };
})();


