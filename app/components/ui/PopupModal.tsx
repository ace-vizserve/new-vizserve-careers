"use client";

import React from "react";
import { CheckCircle, X } from "lucide-react";

interface PopupModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

const PopupModal: React.FC<PopupModalProps> = ({
  open,
  onClose,
  title = "Success",
  message,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-lg w-[90%] max-w-sm p-6 animate-in fade-in zoom-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {title}
          </h2>
          <p className="text-sm text-gray-600">
            {message}
          </p>

          <button
            onClick={onClose}
            className="mt-5 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupModal;
