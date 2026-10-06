import React from 'react';

type SavedMealsModalProps = {
  templates: any[];
  userId: string;
  date: string;
  onLog: (template: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export default function SavedMealsModal({ onClose }: SavedMealsModalProps) {
  // Placeholder – real UI to be implemented elsewhere
  return null;
}
