import React from 'react';
import { LinkIcon, DocumentDuplicateIcon, XMarkIcon, Bars3Icon, EyeIcon } from '@heroicons/react/24/outline';

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
      title="Remove panel">
<span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-200 border border-gray-400 hover:bg-red-300">
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
        title={isLinked ? 'Unlink panels' : 'Link panel'}>
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded hover:bg-yellow-300
        ${isLinkModeActive ? 'bg-blue-200' :
        isLinked         ? 'bg-green-200' :
                           'bg-gray-200'}
        border border-gray-400`}>
          <LinkIcon
          className={`
            w-5 h-5
            ${isLinkModeActive ? 'text-blue-700' :
              isLinked         ? 'text-green-700' :
                                'text-gray-500'}`}
            aria-hidden="true"
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