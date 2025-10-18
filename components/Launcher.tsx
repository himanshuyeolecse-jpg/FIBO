import React from 'react';
import { InstallIcon } from './icons';

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
    <label className="flex items-center cursor-pointer">
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
            <div className={`block w-14 h-8 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
        </div>
        <div className="ml-4 text-white font-medium text-lg">
            {label}
        </div>
    </label>
);

interface LauncherProps {
    isKiboActive: boolean;
    onToggleKiboActive: () => void;
}

const Launcher: React.FC<LauncherProps> = ({ isKiboActive, onToggleKiboActive }) => {
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center text-white p-8">
            <div className="text-center">
                <div className="flex justify-center items-center gap-4 mb-4">
                     <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center border-4 border-slate-600">
                        <div className="w-16 h-16 rounded-full bg-slate-500 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-slate-300"></div>
                        </div>
                    </div>
                    <h1 className="text-6xl font-bold tracking-tighter">Kibo</h1>
                </div>
                <p className="text-2xl text-slate-300 mb-2">Your AI Desktop Friend</p>
                <p className="max-w-md mx-auto text-slate-400 mb-12">
                    A personal AI companion that lives on your screen, ready to chat, assist with tasks, and keep you company while you work.
                </p>
                <div className="inline-block bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                    <ToggleSwitch 
                        checked={isKiboActive} 
                        onChange={onToggleKiboActive} 
                        label={isKiboActive ? 'Kibo is Active' : 'Launch Kibo'} 
                    />
                </div>

                <div className="mt-12 bg-slate-800/50 border border-slate-700 rounded-xl p-4 max-w-sm mx-auto flex items-center gap-4">
                    <div className="flex-shrink-0 bg-slate-700 p-2 rounded-full">
                         <InstallIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-white">Quick Launch</h3>
                        <p className="text-sm text-slate-400">
                            For the best experience, install Kibo to your desktop using your browser's "Install App" or "Add to Home Screen" option.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Launcher;