// StructureViewer_mol.jsx (Mol* viewer component)
import React, { useEffect, useRef } from 'react';
import 'molstar/build/viewer/molstar.css';

function StructureViewer({ pdb, panelId, surface = true }) {
  const containerRef = useRef(null);
  const pluginRef = useRef(null);
  const resizeObsRef = useRef(null);

  useEffect(() => {
    let disposed = false;

    async function init() {
      const el = containerRef.current;
      if (!el) return;

      // wait until the grid has given us a real size
      const hasSize = () => el.offsetWidth > 0 && el.offsetHeight > 0;
      if (!hasSize()) {
        await new Promise(requestAnimationFrame);
        if (!hasSize()) return; // grid not laid out yet; next effect run will retry
      }

      const [{ createPluginUI }, { DefaultPluginUISpec }] = await Promise.all([
        import('molstar/lib/mol-plugin-ui'),
        import('molstar/lib/mol-plugin-ui/spec'),
      ]);
      if (disposed) return;

      const plugin = await createPluginUI(el, {
        ...DefaultPluginUISpec(),
        layout: { initial: { isExpanded: false, showControls: true, showLeftPanel: false, showSequence: false, showLog: false } },
      });
      if (disposed) return;
      pluginRef.current = plugin;

      await plugin.clear();
      if (pdb) {
        const data = await plugin.builders.data.rawData({ data: pdb, label: 'PDB' });
        const traj = await plugin.builders.structure.parseTrajectory(data, 'pdb');
        const preset = await plugin.builders.structure.hierarchy.applyPreset(traj, 'default');

        if (surface) {
          const structure = preset?.structure?.cell?.obj?.data;
          if (structure) {
            await plugin.builders.structure.representation.addRepresentation(structure, {
              type: 'molecular-surface',
              color: 'chain-id',
              size: 'uniform',
              typeParams: { resolution: 4, probeRadius: 1.4, ignoreHydrogens: true },
            });
          }
        }
      }

      plugin.canvas3d?.requestCameraReset();
      plugin.canvas3d?.requestDraw(true);

      // keep Mol* in sync with panel resizes
      resizeObsRef.current = new ResizeObserver(() => {
        plugin.canvas3d?.requestResize();
        plugin.canvas3d?.requestDraw(true);
      });
      resizeObsRef.current.observe(el);
    }

    init();

    return () => {
      disposed = true;
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      pluginRef.current?.dispose();
      pluginRef.current = null;
    };
  }, [pdb, panelId, surface]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 120, position: 'relative', overflow: 'hidden', borderRadius: '0.75rem', background: 'white' }}
      className="structure-viewer-container"
    />
  );
}

export default React.memo(StructureViewer);
