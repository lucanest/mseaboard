// Buttons.jsx
import { LinkIcon, ChartBarIcon , Squares2X2Icon, DocumentDuplicateIcon, XMarkIcon, Bars3Icon, EyeIcon, LanguageIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

export function DuplicateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      title="Duplicate panel"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-200 border border-gray-400 hover:bg-blue-300">
        <DocumentDuplicateIcon className="w-5 h-5 text-gray-700" />
      </span>
    </button>
  );
}

export function RemoveButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      title="Remove panel"
    >
      <span className="inline-flex items-center justify-center w-6 h-6
       rounded bg-gray-200 border border-gray-400 hover:bg-red-300">
       <XMarkIcon className="w-5 h-5 text-gray-700" />
      </span>
    </button>
  );
}

export function LinkButton({ onClick, isLinked, isLinkModeActive }) {
  return (
    <button
        onClick={onClick}
        className="p-0.5"
        title={isLinked ? 'Unlink panels' : 'Link panel'}
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded hover:bg-yellow-300
        ${isLinkModeActive ? 'bg-blue-200' : isLinked ? 'bg-green-200' :'bg-gray-200'}
        border border-gray-400`}>
          <LinkIcon
          className={`w-5 h-5
            ${isLinkModeActive ? 'text-blue-700' : isLinked ? 'text-green-700' : 'text-gray-500'}`
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
      title="Switch tree view"
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded
        ${isActive ? 'bg-gray-200' : 'bg-gray-200'}
        border border-gray-400 hover:bg-orange-300`}>
        <span className="text-xs font-bold text-purple-800 leading-none">
          <EyeIcon className="w-5 h-5" />
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
      title="Toggle codon view"
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded
        ${isActive ? 'bg-purple-200' : 'bg-gray-200'}
        border border-gray-400 hover:bg-purple-300`}>
        <span className="text-xs font-bold text-purple-800 leading-none">
          <Bars3Icon className="w-5 h-5" />
        </span>
      </span>
    </button>
  );
}

export function SurfaceToggleButton({ onClick, isActive }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      title="Show/hide surface"
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded
        ${isActive ? 'bg-blue-200' : 'bg-gray-200'}
        border border-gray-400 hover:bg-orange-300`}>
        <span className="text-xs font-bold text-purple-800 leading-none">
          <EyeIcon className="w-5 h-5" />
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
      title="Duplicate and translate to protein"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-200 border border-gray-400 hover:bg-orange-300">
          <LanguageIcon className="w-5 h-5" />
      </span>
    </button>
  );
}

export function SeqlogoButton({ onClick }) {
  return (
    <button
      type="button"
      className="p-0.5"
      onClick={onClick}
      title="Generate sequence logo"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-200 border border-gray-400 hover:bg-pink-200">
        <ChartBarIcon className="w-5 h-5" />
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
      title="Create sequence from structure"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-200 border border-gray-400 hover:bg-yellow-200">
        <CodeBracketIcon className="w-5 h-5" />
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
      title={title}
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-200 border border-gray-400 hover:bg-purple-300">
        <Squares2X2Icon className="w-5 h-5" />
      </span>
    </button>
  );
}

export function GitHubButton() {
  return (
    <div className="relative group">
      <a
        href="https://github.com/lucanest/mseaview"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-2 py-1 rounded hover:bg-gray-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 24 24"
          className="w-7 h-7 text-gray-800"
          aria-hidden="true"
        >
          <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.867 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.254-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.396.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.36.31.68.921.68 1.857 0 1.34-.012 2.421-.012 2.751 0 .267.18.578.688.48C19.135 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
        </svg>
      </a>
      <div className="absolute top-full mb-2 left-1/2 -translate-x-1/2 translate-y-12 bg-blue-200 text-black text-xs px-1 py-1 rounded-md opacity-0 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
        GitHub: <br /> - Read <br /> &nbsp; docs <br />  - Run <br /> &nbsp; locally <br /> - Report <br /> &nbsp; issues <br /> - Request <br /> &nbsp; features <br /> - Help to <br /> &nbsp; improve
      </div>
    </div>
  );
}