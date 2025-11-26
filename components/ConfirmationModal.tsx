import React from 'react';

interface ConfirmationModalProps {
    show: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isConfirming?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    show,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    isConfirming = false,
}) => {
    if (!show) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] transition-opacity duration-300"
            onClick={onCancel}
            aria-modal="true"
            role="dialog"
            aria-labelledby="confirmation-modal-title"
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all text-center"
                onClick={e => e.stopPropagation()}
            >
                <h2 id="confirmation-modal-title" className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
                <div className="text-gray-600 mb-6">{message}</div>
                <div className="flex justify-center space-x-4">
                    <button
                        onClick={onCancel}
                        className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                        disabled={isConfirming}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors duration-300 disabled:bg-red-400 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        disabled={isConfirming}
                    >
                        {isConfirming ? 'Đang xử lý...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
