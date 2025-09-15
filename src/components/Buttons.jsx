// Buttons.jsx
import { LinkIcon, MagnifyingGlassIcon, ChartBarIcon , Squares2X2Icon, DocumentDuplicateIcon, XMarkIcon, Bars3Icon, EyeIcon, LanguageIcon, CodeBracketIcon, ArrowDownTrayIcon, MagnifyingGlassCircleIcon } from '@heroicons/react/24/outline';

export function DuplicateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      //title="Duplicate panel"
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 border border-gray-400 hover:bg-blue-300">
        <DocumentDuplicateIcon className="w-5 h-5 text-blue-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function RemoveButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      //title="Remove panel"
    >
      <span className="inline-flex items-center justify-center w-7 h-7
       rounded-lg bg-gray-100 border border-gray-400 hover:bg-red-300">
       <XMarkIcon className="w-5 h-5 text-red-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function LinkButton({ onClick, isLinkModeActive, isEligibleLinkTarget }) {
  return (
    <button
        onClick={onClick}
        className="p-0.5"
        //title={'Link panel'}
    >
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-yellow-300
${isLinkModeActive ? 'bg-blue-200' :'bg-gray-100'}
${isEligibleLinkTarget ? 'border-2 border-blue-400' : 'border border-gray-400'}`}>
          <LinkIcon
          className={`w-5 h-5 flex-shrink-0 -translate-y-[0px]
            ${isLinkModeActive ? 'text-blue-700' : 'text-yellow-700'}`
            }
          />
      </span>
    </button>
  );
}

export function RadialToggleButton({ onClick, isActive }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      //title="Switch tree view"
    >
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg
        ${isActive ? 'bg-gray-100' : 'bg-gray-100'}
        border border-gray-400 hover:bg-orange-200`}>
        <span className="text-xs font-bold text-orange-800 leading-none">
          <EyeIcon className="w-5 h-5 flex-shrink-0 -translate-y-[0px]" />
        </span>
      </span>
    </button>
  );
}

export function CodonToggleButton({ onClick, isActive }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      //title="Toggle codon view"
    >
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg
        ${isActive ? 'bg-purple-200' : 'bg-gray-100'}
        border border-gray-400 hover:bg-purple-300`}>
        <span className="text-xs font-bold text-orange-800 leading-none">
          <Bars3Icon className="w-5 h-5 flex-shrink-0 -translate-y-[0px] rotate-90" />
        </span>
      </span>
    </button>
  );
}

export function SiteStatsButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      //title="Compute per-site conservation and gap fraction"
    >
      <span className="inline-flex items-center justify-center w-7 h-7
       rounded-lg bg-gray-100 border border-gray-400 hover:bg-orange-300">
       <ChartBarIcon className="w-5 h-5 text-orange-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function SurfaceToggleButton({ onClick, isActive }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      //title="Show/hide surface"
    >
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg
        ${isActive ? 'bg-orange-100' : 'bg-gray-100'}
        border border-gray-400 hover:bg-orange-200`}>
        <span className="text-xs font-bold text-orange-800 leading-none">
          <EyeIcon className="w-5 h-5 flex-shrink-0 -translate-y-[0px]" />
        </span>
      </span>
    </button>
  );
}

export function TranslateButton({ onClick }) {
  return (
    <button
      type="button"
      className="p-0.5"
      onClick={onClick}
      //title="Duplicate and translate to protein"
    >
      <span className="inline-flex items-center text-orange-700 justify-center w-7 h-7 rounded-lg bg-gray-100 border border-gray-400 hover:bg-orange-300">
          <LanguageIcon className="w-5 h-5 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}


function SeqLogoGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <text x="1"  y="20" fill="#be185d" fontSize="20" fontWeight="500">A</text>
      <text x="14" y="13" fill="#be185d" fontSize="14" fontWeight="500">C</text>
      <text x="16" y="22" fill="#be185d" fontSize="4" fontWeight="500">G</text>
    </svg>
  );
}

export function SeqlogoButton({ onClick }){
  return (
    <button
      type="button"
      className="p-0.5"
      onClick={onClick}
      //title="Generate sequence logo"
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 border border-gray-400 hover:bg-pink-200">
        <SeqLogoGlyph className="w-5 h-5 text-gray-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function SequenceButton({ onClick }) {
  return (
    <button
      type="button"
      className="p-0.5"
      onClick={onClick}
      //title="Extract sequences from structure"
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 border border-gray-400 hover:bg-yellow-200">
        <CodeBracketIcon className="w-5 h-5 text-yellow-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function DistanceMatrixButton({ onClick, title = "Build distance matrix from tree" }) {
  return (
    <button
      type="button"
      className="p-0.5"
      onClick={onClick}
      //title={title}
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 border border-gray-400 hover:bg-purple-300">
        <Squares2X2Icon className="w-5 h-5 text-purple-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function DiamondButton({ onClick }) {
  return (
    <button
      type="button"
      className="p-0.5"
      onClick={onClick}
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 border border-gray-400 hover:bg-purple-300">
        <DiamondGlyph className="w-5 h-5 text-gray-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function DownloadButton({ onClick, title = "Download" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className='p-0.5'
      //title={title}
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 border border-gray-400 hover:bg-cyan-200">
        <ArrowDownTrayIcon className="w-5 h-5 text-cyan-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function SearchButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className='p-0.5'
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 border border-gray-400 hover:bg-cyan-200">
        <MagnifyingGlassIcon className="w-5 h-5 text-cyan-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

function DiamondGlyph(props) {
  return (
<svg
    xmlns="http://www.w3.org/2000/svg"
    width={400}
    height={400}
    viewBox="0 0 124 124"
    fill="none"
    {...props}
  >
    <g transform="translate(-8,12)">
      <rect
        opacity={1}
        x={90}
        y={20}
        width={36}
        height={36}
        rx={12}
        transform="rotate(-45 81.1332 80.7198)"
        fill="none"
        stroke="#7B1FA2"
        strokeWidth={7}
      />
      <rect
        opacity={1}
        x={40}
        y={20}
        width={36}
        height={36}
        rx={12}
        transform="rotate(-45 81.1332 80.7198)"
        fill="none"
        stroke="#7B1FA2"
        strokeWidth={7}
      />
      <rect
        opacity={1}
        x={90}
        y={70}
        width={36}
        height={36}
        rx={12}
        transform="rotate(-45 81.1332 80.7198)"
        fill="none"
        stroke="#7B1FA2"
        strokeWidth={7}
      />
    </g>
  </svg>
  );
}


function LogGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <text x="1"  y="18" fill="#c2410c" fontSize="16" fontWeight="500" >l</text>
      <text x="4.2" y="18" fill="#c2410c" fontSize="16" fontWeight="500">o</text>
      <text x="13" y="18" fill="#c2410c" fontSize="16" fontWeight="500">g</text>
    </svg>
  );
}

function TreeGlyph(props) {
  return (
<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
  <g transform="translate(0,2)">
  <path d="M12 3V21
           M12 7 Q 9 7 5 2
           M12 12 Q 18 12 19 5
           M12 15 Q 9 15 4 12" />
  </g>
</svg>
  );
}

export function LogYButton({ onClick, isActive,  title = "Toggle log scale on Y" 
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className='p-0.5'
      //title={title}
    >
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg
       ${isActive ? 'bg-orange-100' : 'bg-gray-100'}
        border border-gray-400 hover:bg-orange-200`}>
        <LogGlyph className="w-5 h-5 text-gray-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}



export function TreeButton({ onClick, tooltip = null }){
  return (
    <button
      type="button"
      className="w-7 h-7"
      onClick={onClick}
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg
        bg-gray-100 hover:bg-green-200 border border-gray-400">
        <TreeGlyph className="w-5 h-5 text-green-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
};

export function GitHubButton() {
  return (
    <div className="relative group">
      <a
        href="https://github.com/lucanest/mseaboard"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-1 py-1 rounded-3xl hover:bg-gray-300"
        title="GitHub repository"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 24 24"
          className="w-6 h-6 text-gray-800"
          aria-hidden="true"
        >
          <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.867 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.254-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.396.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.36.31.68.921.68 1.857 0 1.34-.012 2.421-.012 2.751 0 .267.18.578.688.48C19.135 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
        </svg>
      </a>
        {/* <div className="absolute top-full mb-2 left-1/2 -translate-x-1/2 translate-y-12 bg-blue-200 text-black text-xs px-1 py-1 rounded-lg-md opacity-0 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
        GitHub: <br /> - Read <br /> &nbsp; docs <br />  - Run <br /> &nbsp; locally <br /> - Report <br /> &nbsp; issues <br /> - Request <br /> &nbsp; features <br /> - Help to <br /> &nbsp; improve
      </div> */}
    </div>
  );
}
