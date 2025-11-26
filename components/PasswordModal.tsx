import React, { useState, useEffect, useRef } from 'react';

interface PasswordModalProps {
    onClose: () => void;
    onSubmit: (password: string) => void;
    show: boolean;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onClose, onSubmit, show }) => {
    const [password, setPassword] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (show) {
            // Focus the input when the modal opens
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            // Reset password when modal closes
            setPassword('');
        }
    }, [show]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(password);
    };

    if (!show) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Đăng nhập Giáo viên</h2>
                <p className="text-center text-gray-600 mb-6">Vui lòng nhập mật khẩu để tiếp tục.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                        autoComplete="current-password"
                    />
                    <button
                        type="submit"
                        className="w-full mt-6 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-400"
                        disabled={!password}
                    >
                        Xác nhận
                    </button>
                     <button
                        type="button"
                        onClick={onClose}
                        className="w-full mt-2 text-center text-sm text-gray-500 hover:text-gray-800 p-2"
                    >
                        Hủy
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PasswordModal;
