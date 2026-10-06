import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Sparkles } from 'lucide-react';
import type { MealEntry, MealTemplate } from '@/types';

interface AddMealModalProps {
  userId: string;
  date: string;
  onSave: (m: Omit<MealEntry, 'id'>) => void;
  onSaveTemplate: (t: Omit<MealTemplate, 'id'>) => void;
  onClose: () => void;
}

export default function AddMealModal({ userId, date, onSave, onSaveTemplate, onClose }: AddMealModalProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimated, setEstimated] = useState(false);
  const lastEstimated = useRef('');

  const estimateMacros = async (dishName: string) => {
    if (!dishName.trim() || dishName.trim().length < 3) return;
    if (dishName.trim() === lastEstimated.current) return;
    if (calories || protein || carbs || fat) return;
    setEstimating(true);
    setEstimated(false);
    try {
      const res = await fetch('/api/estimate-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: dishName.trim() }),
      });
      const data = await res.json();
      if (!data.error) {
        setCalories(String(data.calories));
        setProtein(String(data.proteinG));
        setCarbs(String(data.carbsG));
        setFat(String(data.fatG));
        lastEstimated.current = dishName.trim();
        setEstimated(true);
      }
    } catch {}
    finally { setEstimating(false); }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const macros = { calories: Number(calories) || 0, proteinG: Number(protein) || 0, carbsG: Number(carbs) || 0, fatG: Number(fat) || 0 };
    if (saveAsTemplate) {
      onSaveTemplate({ userId, name: name.trim(), baseQuantity: 1, unit: 'serving', macros, createdAt: Date.now(), useCount: 0 });
    }
    onSave({ userId, date, name: name.trim(), macros, createdAt: Date.now() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-medium mb-4">Add Meal (Placeholder)</h2>
        <button className="btn-primary" onClick={handleSave}>Save</button>
        <button className="ml-2 btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
