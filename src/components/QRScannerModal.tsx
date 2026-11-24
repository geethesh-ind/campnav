import React, { useState, useEffect } from 'react';
import {
  QrCode,
  X,
  CheckCircle2,
  Printer,
  MapPin,
  Scan,
  Compass,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCampus } from '../context/CampusContext';
import { QRCheckpoint } from '../types/campus';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose }) => {
  const { qrCheckpoints, confirmLocationByQR, buildings, floors } = useCampus();
  const [activeTab, setActiveTab] = useState<'scan' | 'print'>('scan');
  const [selectedCheckpointForPrint, setSelectedCheckpointForPrint] = useState<QRCheckpoint | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (qrCheckpoints.length > 0 && !selectedCheckpointForPrint) {
      setSelectedCheckpointForPrint(qrCheckpoints[0]);
    }
  }, [qrCheckpoints, selectedCheckpointForPrint]);

  useEffect(() => {
    if (selectedCheckpointForPrint) {
      QRCode.toDataURL(selectedCheckpointForPrint.code, {
        width: 240,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [selectedCheckpointForPrint]);

  if (!isOpen) return null;

  const handleSimulateScan = (checkpoint: QRCheckpoint) => {
    const res = confirmLocationByQR(checkpoint.code);
    if (res.success) {
      setScanFeedback(res.message);
      setTimeout(() => {
        setScanFeedback(null);
        onClose();
      }, 1400);
    }
  };

  const getCheckpointMeta = (cp: QRCheckpoint) => {
    const b = buildings.find(item => item.id === cp.buildingId);
    const f = floors.find(item => item.id === cp.floorId);
    return {
      buildingName: b ? b.name : 'Campus Grounds',
      floorName: f ? f.floorName : 'Outdoor Grounds',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0f3b7a]/10 text-[#0f3b7a] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Indoor QR Location Verification
              </h3>
              <p className="text-xs text-slate-500">
                Exact room & floor positioning with zero GPS drift
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors min-w-[36px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-3 flex items-center gap-2 border-b border-slate-100 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('scan')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scan'
                ? 'border-[#0f3b7a] text-[#0f3b7a]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>Scan &amp; Checkpoint List</span>
          </button>
          <button
            onClick={() => setActiveTab('print')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'print'
                ? 'border-[#0f3b7a] text-[#0f3b7a]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Printable Campus QR Signage</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {activeTab === 'scan' ? (
            <div>
              {/* Scan Success Toast */}
              {scanFeedback && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-sm font-bold">{scanFeedback}</span>
                </div>
              )}

              {/* Explainer Banner */}
              <div className="p-3.5 rounded-xl bg-[#0f3b7a]/5 border border-[#0f3b7a]/15 mb-4 text-xs text-slate-600">
                <span className="font-bold text-[#0f3b7a] block mb-1">
                  How Indoor Checkpoints Work:
                </span>
                Satellite GPS cannot detect which floor you are on inside concrete buildings. Tap a QR checkpoint plaque (mounted at stairwells and room doors) to set your exact floor and location.
              </div>

              {/* Test Checkpoints List */}
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Simulate Scanning a Checkpoint
              </h4>
              <div className="space-y-2">
                {qrCheckpoints.map(cp => {
                  const meta = getCheckpointMeta(cp);
                  return (
                    <div
                      key={cp.id}
                      onClick={() => handleSimulateScan(cp)}
                      className="p-3 rounded-xl bg-white hover:bg-[#0f3b7a]/5 border border-slate-200 hover:border-[#0f3b7a]/30 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-[#0f3b7a] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {cp.label}
                          </h5>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {meta.buildingName} · {meta.floorName}
                          </p>
                          <span className="inline-block px-1.5 rounded bg-slate-100 font-mono text-[9.5px] text-slate-500 mt-1">
                            {cp.code}
                          </span>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 min-h-[36px] rounded-lg bg-[#0f3b7a] text-white font-semibold text-xs shrink-0 group-hover:bg-[#0d3368] transition-colors">
                        Set Here
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Printable Signage Tab */
            <div>
              <div className="mb-3 text-xs text-slate-600">
                Select a checkpoint to preview and print its official high-contrast indoor navigation plaque for campus hallways:
              </div>

              {/* Checkpoint selector */}
              <div className="mb-4">
                <select
                  value={selectedCheckpointForPrint?.id || ''}
                  onChange={e => {
                    const found = qrCheckpoints.find(c => c.id === e.target.value);
                    if (found) setSelectedCheckpointForPrint(found);
                  }}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f3b7a]"
                >
                  {qrCheckpoints.map(cp => (
                    <option key={cp.id} value={cp.id}>
                      {cp.label} ({cp.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Printable Plaque Card */}
              {selectedCheckpointForPrint && (
                <div className="p-6 rounded-2xl bg-white border-2 border-[#0f3b7a] shadow-lg text-center max-w-sm mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Compass className="w-5 h-5 text-[#0f3b7a]" />
                    <span className="font-extrabold text-sm tracking-tight text-[#0f3b7a]">
                      CEC CampusNav Checkpoint
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 leading-tight mb-1">
                    {selectedCheckpointForPrint.label}
                  </h3>

                  <div className="my-4 flex items-center justify-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Code for ${selectedCheckpointForPrint.label}`}
                        className="w-48 h-48 rounded-xl border border-slate-200"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                        Generating…
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg inline-block text-xs font-mono font-bold tracking-wider mb-3">
                    {selectedCheckpointForPrint.code}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Scan with your phone camera or CampusNav to confirm your exact indoor floor &amp; location.
                  </p>
                </div>
              )}

              <div className="mt-4 text-center">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-[#0f3b7a] hover:bg-[#0d3368] text-white font-bold text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Checkpoint Plaque</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
