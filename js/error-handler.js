/**
 * نظام معالجة الأخطاء الشامل
 * قهوة الشام - نظام إدارة المقهى
 */

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.listeners = [];
    }

    /**
     * معالجة خطأ عام
     */
    handleError(error, context = '', severity = 'error') {
        const errorInfo = {
            message: error.message || 'خطأ غير معروف',
            stack: error.stack,
            context: context,
            severity: severity,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // إضافة للـ log
        this.addToLog(errorInfo);

        // إشعار المستمعين
        this.notifyListeners(errorInfo);

        // عرض رسالة للمستخدم (حسب الخطورة)
        if (severity === 'critical' || severity === 'error') {
            this.showUserMessage(errorInfo);
        }

        // في الإنتاج، يمكن إرسال الخطأ إلى خدمة مراقبة (مثل Sentry)
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
            this.reportToMonitoring(errorInfo);
        }

        return errorInfo;
    }

    /**
     * معالجة خطأ Firebase
     */
    handleFirebaseError(error, operation = '') {
        let userMessage = 'حدث خطأ أثناء الاتصال بقاعدة البيانات';
        let severity = 'error';

        switch (error.code) {
            case 'PERMISSION_DENIED':
                userMessage = 'ليس لديك صلاحية للوصول إلى هذه البيانات';
                severity = 'warning';
                break;
            case 'UNAVAILABLE':
                userMessage = 'قاعدة البيانات غير متاحة حالياً. يرجى المحاولة لاحقاً';
                severity = 'error';
                break;
            case 'NETWORK_ERROR':
                userMessage = 'خطأ في الاتصال بالإنترنت. يرجى التحقق من الاتصال';
                severity = 'error';
                break;
            case 'DISCONNECTED':
                userMessage = 'انقطع الاتصال بقاعدة البيانات';
                severity = 'warning';
                break;
            case 'EXPIRED_TOKEN':
                userMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
                severity = 'critical';
                // إعادة توجيه لتسجيل الدخول
                setTimeout(() => {
                    window.location.href = 'login-admin.html';
                }, 2000);
                break;
            default:
                userMessage = `خطأ في ${operation || 'العملية'}: ${error.message}`;
        }

        const errorInfo = {
            message: error.message,
            code: error.code,
            operation: operation,
            severity: severity,
            timestamp: new Date().toISOString(),
            userMessage: userMessage
        };

        this.addToLog(errorInfo);
        this.notifyListeners(errorInfo);
        this.showUserMessage(errorInfo);

        return errorInfo;
    }

    /**
     * معالجة خطأ في عملية حساسة (مثل حفظ الطلبات، المدفوعات)
     */
    handleCriticalOperation(error, operation, data = null) {
        const errorInfo = {
            message: error.message,
            operation: operation,
            data: data,
            severity: 'critical',
            timestamp: new Date().toISOString(),
            userMessage: `فشلت العملية: ${operation}. يرجى المحاولة مرة أخرى أو الاتصال بالدعم`
        };

        this.addToLog(errorInfo);
        this.notifyListeners(errorInfo);
        this.showUserMessage(errorInfo, true);

        // محاولة حفظ البيانات محلياً في حالة الفشل
        if (data && operation.includes('order') || operation.includes('payment')) {
            this.saveToLocalBackup(operation, data);
        }

        return errorInfo;
    }

    /**
     * معالجة خطأ في عملية غير حرجة
     */
    handleNonCriticalError(error, operation = '') {
        const errorInfo = {
            message: error.message,
            operation: operation,
            severity: 'warning',
            timestamp: new Date().toISOString(),
            userMessage: `تحذير: ${operation} - ${error.message}`
        };

        this.addToLog(errorInfo);
        this.notifyListeners(errorInfo);

        // عرض toast بسيط بدلاً من alert
        this.showToast(errorInfo.userMessage, 'warning');

        return errorInfo;
    }

    /**
     * إضافة خطأ للـ log
     */
    addToLog(errorInfo) {
        this.errorLog.push(errorInfo);
        
        // الحفاظ على حجم الـ log
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }

        // حفظ في localStorage للفحص لاحقاً (في وضع التطوير فقط)
        if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production') {
            try {
                localStorage.setItem('error_log', JSON.stringify(this.errorLog.slice(-20)));
            } catch (e) {
                // تجاهل خطأ localStorage
            }
        }
    }

    /**
     * إشعار المستمعين
     */
    notifyListeners(errorInfo) {
        this.listeners.forEach(listener => {
            try {
                listener(errorInfo);
            } catch (e) {
                console.error('خطأ في مستمع الأخطاء:', e);
            }
        });
    }

    /**
     * إضافة مستمع للأخطاء
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * إزالة مستمع
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * عرض رسالة للمستخدم
     */
    showUserMessage(errorInfo, isCritical = false) {
        const message = errorInfo.userMessage || errorInfo.message;
        
        if (isCritical) {
            // استخدام modal للرسائل الحرجة
            this.showModal(message, 'خطأ حرج', 'error');
        } else {
            // استخدام toast للرسائل العادية
            this.showToast(message, errorInfo.severity || 'error');
        }
    }

    /**
     * عرض Toast
     */
    showToast(message, type = 'error') {
        // البحث عن toast container أو إنشاؤه
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = {
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            success: 'fa-check-circle',
            info: 'fa-info-circle'
        }[type] || 'fa-info-circle';

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // إزالة بعد 5 ثواني
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * عرض Modal
     */
    showModal(message, title = 'تنبيه', type = 'error') {
        // البحث عن modal container أو إنشاؤه
        let modalOverlay = document.getElementById('error-modal-overlay');
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'error-modal-overlay';
            modalOverlay.className = 'modal-overlay';
            modalOverlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="error-modal-title"></h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p id="error-modal-message"></p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').classList.remove('active')">
                            موافق
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modalOverlay);
        }

        document.getElementById('error-modal-title').textContent = title;
        document.getElementById('error-modal-message').textContent = message;
        modalOverlay.classList.add('active');
    }

    /**
     * حفظ نسخة احتياطية محلية
     */
    saveToLocalBackup(operation, data) {
        try {
            const backup = {
                operation: operation,
                data: data,
                timestamp: new Date().toISOString()
            };

            const backups = JSON.parse(localStorage.getItem('operation_backups') || '[]');
            backups.push(backup);
            
            // الحفاظ على آخر 10 نسخ احتياطية
            if (backups.length > 10) {
                backups.shift();
            }

            localStorage.setItem('operation_backups', JSON.stringify(backups));
        } catch (e) {
            console.error('فشل حفظ النسخة الاحتياطية:', e);
        }
    }

    /**
     * إرسال الخطأ لخدمة المراقبة (في الإنتاج)
     */
    reportToMonitoring(errorInfo) {
        // يمكن إضافة تكامل مع Sentry أو خدمة مراقبة أخرى
        // مثال:
        // if (window.Sentry) {
        //     window.Sentry.captureException(new Error(errorInfo.message), {
        //         extra: errorInfo
        //     });
        // }
    }

    /**
     * الحصول على سجل الأخطاء
     */
    getErrorLog(limit = 20) {
        return this.errorLog.slice(-limit);
    }

    /**
     * مسح سجل الأخطاء
     */
    clearErrorLog() {
        this.errorLog = [];
        if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production') {
            localStorage.removeItem('error_log');
        }
    }

    /**
     * Wrapper لـ Promise مع معالجة أخطاء تلقائية
     */
    async safeExecute(promise, context = '', isCritical = false) {
        try {
            return await promise;
        } catch (error) {
            if (isCritical) {
                return this.handleCriticalOperation(error, context);
            } else {
                return this.handleError(error, context);
            }
        }
    }
}

// إنشاء instance واحد
const errorHandler = new ErrorHandler();

// معالجة الأخطاء غير المعالجة
window.addEventListener('error', (event) => {
    errorHandler.handleError(event.error, 'Unhandled Error', 'error');
});

// معالجة Promise rejections غير المعالجة
window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(event.reason, 'Unhandled Promise Rejection', 'error');
    event.preventDefault();
});

// تصدير
window.ErrorHandler = errorHandler;





