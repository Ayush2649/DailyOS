import React from  'react';

type MealScannerModalProps = {
  userId: string;
  date: string;
  onSave: (m: any) => void;
  onClose: () => void;
  onSwitchToManual?: () => void;
  onSwitchToVoice?: () => void;
};

export default function MealScannerModal({ onClose }: MealScannerModalProps) {
  // Placeholder component � actual scanning UI not implemented
  return null;
}
