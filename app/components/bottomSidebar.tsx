// components/BottomSidebar.tsx
"use client";
import React, { useState } from "react";
import { User, X } from "lucide-react";
import Image from "next/image";

interface Talent {
  id: number;
  name: string;
  role: string;
  img: string;
}

interface BottomSidebarProps {
  talents: Talent[];
  onRemove: (id: number) => void;
}

const BottomSidebar = ({ talents, onRemove }: BottomSidebarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 sm:right-6 z-50">
      {/* Button */}
      <div
        onClick={() => setOpen(!open)}
        className={`
          bg-yellow-400 rounded-2xl px-6 py-3 cursor-pointer
          flex items-center justify-center shadow-md
          transition-all duration-200 ease-in-out
          ${open ? "scale-110 shadow-lg" : "hover:scale-105 hover:shadow-lg"}
        `}
      >
        <div className="flex flex-col items-center text-black">
          <span className="text-sm font-bold">{talents.length}</span>
          <User size={22} />
        </div>
      </div>

      {/* Popup list */}
      {open && (
        <div
          className="
            absolute bottom-20 right-0 
            w-[calc(100vw-2rem)] sm:w-[28rem] md:w-[36rem] lg:w-[42rem]
            max-h-[70vh] sm:max-h-[80vh]
            bg-white border border-gray-200 
            rounded-3xl shadow-2xl p-4 sm:p-6 
            transition-all duration-300 flex flex-col
          "
        >
          <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-800">
            Added Talents
          </h3>

          {talents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No talents added yet
            </div>
          ) : (
            <ul className="space-y-3 sm:space-y-4 overflow-y-auto pr-2 flex-1">
              {talents.map((talent) => (
                <li
                  key={talent.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={talent.img}
                        alt={talent.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base sm:text-lg text-gray-800 truncate">
                        {talent.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{talent.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      className="flex-1 sm:flex-none bg-[#55C9E7] hover:bg-[#55C9E7]/90 text-white px-4 sm:px-6 py-2 rounded-lg transition font-medium text-sm sm:text-base"
                    >
                      Request Resume
                    </button>
                    <button
                      onClick={() => onRemove(talent.id)}
                      className="
                        w-10 h-10 rounded-lg bg-red-100 text-red-600 
                        hover:bg-red-200 transition-all flex items-center justify-center
                        flex-shrink-0
                      "
                      aria-label="Remove talent"
                    >
                      <X size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => setOpen(false)}
            className="
              mt-4 sm:mt-5 w-full bg-yellow-400 text-black py-2.5 sm:py-3 rounded-2xl 
              font-semibold text-sm sm:text-base hover:bg-yellow-500 transition
            "
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default BottomSidebar;