import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, AlertCircle } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  savedPin: string;
  onUnlocked: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  savedPin,
  onUnlocked,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);

      if (nextPin === savedPin) {
        onUnlocked();
      } else if (nextPin.length === savedPin.length) {
        setError(true);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d1117] backdrop-blur-md">
      <div className="bg-[#161b22] border border-[#30363d] w-full max-w-xs rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">Session Locked</h3>
        <p className="text-xs text-gray-400 mb-6">Enter PIN to access soundboard controls</p>

        {/* PIN Dots */}
        <div className="flex space-x-3 mb-6">
          {Array.from({ length: savedPin.length || 4 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                i < pin.length
                  ? error
                    ? 'bg-rose-500 border-rose-500 scale-110'
                    : 'bg-purple-500 border-purple-500 scale-110'
                  : 'border-gray-600 bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center space-x-1 text-xs text-rose-400 mb-4 animate-shake">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Incorrect PIN, try again</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[220px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="w-16 h-16 rounded-2xl bg-[#21262d] hover:bg-purple-600/30 active:bg-purple-600 border border-[#30363d] text-lg font-bold text-white flex items-center justify-center transition-all active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="w-16 h-16 rounded-2xl bg-[#161b22] text-xs font-semibold text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-2xl bg-[#21262d] hover:bg-purple-600/30 active:bg-purple-600 border border-[#30363d] text-lg font-bold text-white flex items-center justify-center transition-all active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-2xl bg-[#161b22] text-xs font-semibold text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ⌫
          </button>
        </div>

      </div>
    </div>
  );
};
