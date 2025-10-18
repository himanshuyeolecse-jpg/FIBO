import React from 'react';
import { useKibo } from './hooks/useKibo';
import Launcher from './components/Launcher';
import KiboInterface from './components/KiboInterface';

const App: React.FC = () => {
  const kiboHook = useKibo();
  const { kiboState } = kiboHook;

  return (
    <>
      {kiboState.isKiboActive ? (
        <KiboInterface kiboHook={kiboHook} />
      ) : (
        <Launcher 
          isKiboActive={kiboState.isKiboActive} 
          onToggleKiboActive={kiboHook.handleToggleKiboActive}
        />
      )}
    </>
  );
};

export default App;
