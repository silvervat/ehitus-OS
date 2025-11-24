import React, { useState } from 'react';
import { Camera, Upload, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { generateInspectionReport } from '../services/geminiService';

interface FormField {
    id: string;
    label: string;
    value: string;
}

export const VehicleForm: React.FC = () => {
  const [formState, setFormState] = useState<Record<string, string>>({
      'SE1': '',
      'SE2': '',
      'SE3': '',
      'SE4': '',
      'SE5': '',
      'SE6': '',
      'DESC': ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (id: string, value: string) => {
      setFormState(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    // Mock AI check
    const report = await generateInspectionReport(formState);
    alert(`Salvestatud! AI Raport: \n${report}`);
    setIsSubmitting(false);
  }

  const SelectInput = ({ id, label, required }: { id: string, label: string, required?: boolean }) => (
      <div className="mb-6 group">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              {label} {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <select 
                value={formState[id]}
                onChange={(e) => handleChange(id, e.target.value)}
                className="block w-full bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-3 rounded leading-tight focus:outline-none focus:bg-white focus:border-teal-500 transition-colors"
            >
                <option value="">palun tee valik</option>
                <option value="OK">O - korras</option>
                <option value="ISSUE">X - puudus/probleem</option>
                <option value="CRITICAL">R - kriitiline</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
          <div className="mt-1 h-0.5 w-full bg-slate-100 group-hover:bg-slate-200 transition-colors" />
      </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 bg-white min-h-full shadow-sm border-x border-slate-200">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">1/6 SÕIDUKI ESIOSA</h1>
        
        <div className="flex justify-center mb-6">
            {/* CSS Vehicle Graphic Simulation */}
            <div className="relative w-64 h-32 bg-slate-800 rounded-xl border-4 border-slate-900 flex items-center justify-center">
                {/* Windshield */}
                <div className="absolute top-2 left-16 right-4 h-24 bg-slate-700 rounded-r-lg border-l-4 border-slate-500"></div>
                {/* Arrow */}
                <div className="absolute -left-12 top-10 bg-teal-500 text-white px-2 py-1 text-xs font-bold rounded flex items-center">
                    SE <ArrowRight size={12} className="ml-1" />
                </div>
            </div>
        </div>

        <div className="text-sm text-slate-600 space-y-1 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p><span className="font-bold">O</span> = probleeme pole, korras, terve</p>
            <p><span className="font-bold">X</span> = puudus, probleemid, vigastusi esineb</p>
            <p><span className="font-bold">R</span> = kriitiline olukord ja vajab kohest tähelepanu</p>
            <p className="mt-2 text-slate-500 italic text-xs">kui sõidukil puuduvad udutuled märkida O</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-2">
        <SelectInput id="SE1" label="SE1. KAPOTT" required />
        <SelectInput id="SE2" label="SE2. ESITULED" required />
        <SelectInput id="SE3" label="SE3. ESIKLAAS" required />
        <SelectInput id="SE4" label="SE4. UDUTULED" required />
        <SelectInput id="SE5" label="SE5. STANGE" required />
        <SelectInput id="SE6" label="SE6. STANGE ALT SERV & PÕHJAKAITSE" required />
      </div>

      {/* Photo Upload Area */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
            SE. FOTOD ( min 2tk ) <span className="text-red-500">*</span>
        </label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-teal-500 transition-colors cursor-pointer">
            <Upload className="mb-3 text-slate-400" size={32} />
            <h3 className="font-bold text-slate-700 mb-1">ALUSTAMISEKS VAJUTA SIIA</h3>
            <p className="text-xs">telefonis kaamera käivitamiseks puuduta siia</p>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
            1. Foto üldine nii, et terve esiosa oleks nähtaval + 2. Foto nii, et foto on madalamalt ja stange on selgelt nähtav
        </p>
      </div>

      {/* Description Area */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
            SE. PROBLEEMIDE KIRJELDUSED
        </label>
        <textarea 
            value={formState['DESC']}
            onChange={(e) => handleChange('DESC', e.target.value)}
            className="w-full h-32 bg-slate-50 border border-slate-300 rounded p-3 text-sm focus:outline-none focus:border-teal-500"
            placeholder="näiteks: klaasis mõra, kapotil kriim, stange vasakus alumises servas vigastus"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between pt-6 border-t border-slate-200 sticky bottom-0 bg-white py-4">
          <button className="px-6 py-2 bg-slate-400 text-white rounded font-medium hover:bg-slate-500 transition-colors">
              TAGASI
          </button>
          <div className="flex gap-3">
              <button 
                onClick={handleSave}
                className="px-6 py-2 border border-teal-600 text-teal-600 rounded font-medium hover:bg-teal-50 transition-colors"
              >
                  {isSubmitting ? '...' : 'salvesta'}
              </button>
              <button className="px-6 py-2 bg-teal-600 text-white rounded font-medium hover:bg-teal-700 transition-colors shadow-md">
                  EDASI
              </button>
          </div>
      </div>
    </div>
  );
};