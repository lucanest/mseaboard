// Buttons.jsx
import { LinkIcon, MagnifyingGlassIcon,ScissorsIcon, ChartBarIcon , Squares2X2Icon, DocumentDuplicateIcon,
   XMarkIcon, Bars3Icon, EyeIcon, LanguageIcon, CodeBracketIcon, PhotoIcon,
    ArrowDownTrayIcon, SwatchIcon } from '@heroicons/react/24/outline';

export function ColorButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      //title="Duplicate panel"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 border border-gray-400 hover:bg-lime-200">
        <SwatchIcon className="w-4 h-4 text-lime-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function DuplicateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
      //title="Duplicate panel"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 border border-gray-400 hover:bg-blue-200">
        <DocumentDuplicateIcon className="w-4 h-4 text-blue-700 flex-shrink-0 -translate-y-[0px]" />
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
      <span className="inline-flex items-center justify-center w-6 h-6
       rounded-lg bg-gray-100 border border-gray-400 hover:bg-red-300">
       <XMarkIcon className="w-4 h-4 text-red-700 flex-shrink-0 -translate-y-[0px]" />
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
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-yellow-200
${isLinkModeActive ? 'bg-blue-200' :'bg-gray-100'}
${isEligibleLinkTarget ? 'border-2 border-blue-400' : 'border border-gray-400'}`}>
          <LinkIcon
          className={`w-4 h-4 flex-shrink-0 -translate-y-[0px]
            ${isLinkModeActive ? 'text-blue-700' : 'text-yellow-700'}`
            }
          />
      </span>
    </button>
  );
}

export function PictureButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
    >
      <span className="inline-flex items-center justify-center w-6 h-6
       rounded-lg bg-gray-100 border border-gray-400 hover:bg-indigo-200">
       <PhotoIcon className="w-4 h-4 text-indigo-700 flex-shrink-0 -translate-y-[0px]" />
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
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg
        ${isActive ? 'bg-gray-100' : 'bg-gray-100'}
        border border-gray-400 hover:bg-orange-200`}>
        <span className="text-xs font-bold text-orange-800 leading-none">
          <EyeIcon className="w-4 h-4 flex-shrink-0 -translate-y-[0px]" />
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
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg
        ${isActive ? 'bg-purple-200' : 'bg-gray-100'}
        border border-gray-400 hover:bg-purple-200`}>
        <span className="text-xs font-bold text-orange-800 leading-none">
          <Bars3Icon className="w-4 h-4 flex-shrink-0 -translate-y-[0px] rotate-90" />
        </span>
      </span>
    </button>
  );
}

export function TableChartButton({ onClick, isActive }) {
  return (
    <button
      onClick={onClick}
      className="p-0.5"
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100
        border border-gray-400 hover:bg-green-200`}>
                <span className="text-xs font-bold text-green-800 leading-none">
          {!isActive ? (
            <Bars3Icon className="w-4 h-4 flex-shrink-0 -translate-y-[0px] rotate-0" />
          ) : (
            <ChartBarIcon className="w-4 h-4 flex-shrink-0 -translate-y-[0px]" />
          )}
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
      <span className="inline-flex items-center justify-center w-6 h-6
       rounded-lg bg-gray-100 border border-gray-400 hover:bg-orange-200">
       <ChartBarIcon className="w-4 h-4 text-orange-700 flex-shrink-0 -translate-y-[0px]" />
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
      <span className="inline-flex items-center text-orange-700 justify-center w-6 h-6 rounded-lg bg-gray-100 border border-gray-400 hover:bg-orange-200">
          <LanguageIcon className="w-4 h-4 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}


function SeqLogoGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <text x="1"  y="20" fill="#be185d" fontSize="22" fontWeight="500">A</text>
      <text x="14" y="10" fill="#be185d" fontSize="12" fontWeight="500">C</text>
      <text x="16" y="20" fill="#be185d" fontSize="10" fontWeight="500">T</text>
    </svg>
  );
}

function ZeroOneGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <text x="0"  y="18" fill="#be185d" fontSize="16" fontWeight="500">0</text>
      <text x="10"  y="18" fill="#be185d" fontSize="18" fontWeight="500">/</text>
      <text x="16" y="18" fill="#be185d" fontSize="16" fontWeight="500">1</text>
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
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 border border-gray-400 hover:bg-pink-200">
        <SeqLogoGlyph className="w-4 h-4 text-gray-700 flex-shrink-0 -translate-y-[0px]" />
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
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 border border-gray-400 hover:bg-yellow-200">
        <CodeBracketIcon className="w-4 h-4 text-yellow-700 flex-shrink-0 -translate-y-[0px]" />
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
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 border border-gray-400 hover:bg-purple-200">
        <Squares2X2Icon className="w-4 h-4 text-purple-700 flex-shrink-0 -translate-y-[0px]" />
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
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 border border-gray-400 hover:bg-purple-200">
        <DiamondGlyph className="w-4 h-4 text-gray-700 flex-shrink-0 -translate-y-[0px]" />
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
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 border border-gray-400 hover:bg-cyan-200">
        <ArrowDownTrayIcon className="w-4 h-4 text-cyan-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function PruneButton({ onClick, isActive}) {
  return (
    <button

      type="button"
      onClick={onClick}
      className='p-0.5'
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg
        ${isActive ? 'bg-red-200' : 'bg-gray-100'}
        border ${isActive ? 'border-2 border-red-400' : 'border-gray-400'}
        hover:bg-red-200`}>
        <ScissorsIcon className="w-4 h-4 text-red-700 flex-shrink-0 -translate-y-[0px]" />
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
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 border border-gray-400 hover:bg-cyan-200">
        <MagnifyingGlassIcon className="w-4 h-4 text-cyan-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}

export function OmegaGlyph(props) {
  return (
    <svg viewBox="0 0 1784.000000 1744.000000"
    aria-hidden="true"  {...props} fill="#a21caf" >
    <g transform="translate(-1250.000000,2900.000000) scale(0.560000,-0.5600000)"><path d="M4133 5156 c-250 -267 -313 -568 -194 -923 18 -53 18 -53 -118 -53 -674 0 -934 -355 -776 -1057 5 -22 3 -23 -62 -23 -298 -1 -517 -89 -654 -263 -22 -27 -39 -54 -39 -61 0 -9 72 -69 100 -83 3 -2 39 30 80 70 135 130 269 177 504 177 134 0 134 0 165 -93 46 -136 78 -327 55 -327 -6 0 -81 51 -299 206 -162 114 -158 113 -239 73 -78 -38 -80 -31 42 -115 175 -122 393 -284 439 -327 35 -33 29 -60 -31 -142 -12 -16 -25 -35 -29 -41 -5 -9 101 -94 118 -94 2 0 25 29 50 64 151 212 163 411 48 769 -5 17 -1 18 68 11 270 -29 409 4 428 103 6 32 14 71 17 87 6 26 5 28 -12 21 -84 -34 -133 -39 -354 -40 -254 0 -232 -17 -264 203 -16 113 -22 114 133 -2 177 -131 230 -150 330 -115 44 16 38 23 -75 102 -54 39 -146 108 -204 155 -58 46 -122 94 -143 106 -43 24 -45 60 -7 155 24 63 7 72 310 -165 333 -261 306 -247 364 -199 58 47 57 52 -6 100 -29 21 -127 98 -218 170 -91 72 -202 160 -248 195 -45 35 -81 68 -79 74 6 19 170 95 232 108 60 12 438 18 449 7 23 -22 76 -299 58 -299 -20 0 -93 49 -205 136 -135 106 -159 113 -262 69 -40 -17 -40 -17 -17 -33 13 -8 80 -61 150 -116 327 -261 327 -261 402 -227 36 17 75 31 86 31 44 1 47 11 35 116 -10 81 -37 206 -67 305 -4 14 16 17 143 27 354 28 524 117 711 374 42 57 42 57 -19 108 -60 50 -60 50 -106 -12 -156 -213 -312 -285 -631 -293 -188 -5 -167 -17 -201 117 -57 224 -52 227 139 83 151 -114 180 -129 238 -120 103 15 117 39 50 81 -24 15 -95 68 -158 119 -174 138 -241 186 -273 192 -34 7 -34 67 1 159 24 67 25 67 178 -58 459 -374 468 -380 534 -318 50 47 55 43 -521 488 -97 75 -97 75 -53 135 54 73 55 67 -10 104 -54 31 -54 31 -83 -1z"></path><path d="M4304 3445 c-449 -98 -560 -737 -171 -987 59 -37 59 -45 1 -54 -58 -8 -123 0 -200 28 -81 29 -94 23 -94 -45 0 -137 64 -176 285 -177 171 0 218 36 219 170 1 66 1 67 -56 141 -141 184 -187 412 -118 587 148 378 567 257 570 -165 1 -155 -50 -281 -197 -482 -22 -31 -24 -142 -2 -186 50 -104 414 -83 471 27 60 116 33 168 -64 123 -54 -25 -169 -34 -247 -19 -43 9 -40 16 37 72 154 112 223 220 240 379 45 398 -273 675 -674 588z"></path></g></svg>
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

export function SubMSAGlyph(props) {
  return (
    <svg viewBox="0 0 1516 1239.998" aria-hidden="true"  {...props} fill="#524d4d" >
  <g transform="scale(2.00) translate(-350,-300)">
  <path d="M537.999 342c-86.8.8-86.8.8-91.099 9.097-6.2 12.199-5.399 115.098 1.003 126.3 6.298 11.2-6.299 10.498 197.598 10.498 206.899.098 201.701.3 210.702-9.698 5.3-5.802 5.3-6.2 5.3-64.2 0-62.801-.098-63.602-11.898-69.699-6.2-3.198-115.201-3.999-311.601-2.299m249.002 49c30.199 3.002 33.402 5.4 32.797 24.702-.697 23.7 5.601 22.8-166.299 22.8-168.102 0-165.999.202-167.999-19.199-2.299-23.301 3.602-27.202 44.702-29.3 24.702-1.198 242.9-.397 256.799 1.003M963.499 356.9c-12.602 7.202-12.199 4.102-13 116.1-.899 116.802.501 109.9-18.997 91-27.4-26.5-41.101-29.998-52.499-13.402-11.5 16.698-8.4 22.2 40.9 71.398 57.897 57.799 51.5 57.7 108.7.5 45.1-45.099 49.1-50.4 46.5-62-2.702-11.8-13.5-20.097-25-19.297-7.503.501-12.902 4.3-34.1 23.901-18.301 16.802-16.601 23.1-17-63.1-.397-100.3-1.198-131.698-3.698-137.102-4.702-10.499-20.502-14.498-31.801-7.998M479 536.002c-19.799.8-22.501 1.602-28.5 8.2-6.897 7.698-6.799 6.7-6.897 69.098-.098 55.8-.098 55.8 5.9 61.2 12.902 11.598 2.501 11 169.503 11 168.402 0 159.8.598 171.502-11.502 4.598-4.702 6.2-33 5.1-89-.802-44.8-3.003-47.601-39.102-49.1-23.601-.898-253.6-.898-277.501.099m244 51c24.2 2.403 27.399 4.898 27.802 22.201.501 23.7-.9 24.299-69.3 25.9-47.503 1.101-145.2.398-165.499-1.198-26.102-2.098-31-5.699-31-22.899 0-21.302 4.8-23.498 52.499-25.001 33.5-1.1 172.297-.3 185.498 1.002M474.898 732c-17.2 1.002-23.9 4.2-28.799 13.8-2.898 5.6-4.402 84.702-2.097 107.1 1.4 13.2 7.502 21.798 16.998 24.102 12.901 3.1 420.7 4.102 454.299 1.1 18-1.601 25.802-5.399 30.199-14.802 2.2-4.702 3.9-52.498 3.002-85.301-1.199-44.702-1.4-44.8-53.8-46.103-42.202-1.002-401.9-.899-419.802.099m373.1 47.998c49.3 2.201 56.001 5.198 56.001 24.898 0 22.599-5.197 24.2-84.5 26.2-52.798 1.302-275.998.6-294.5-1.002-32.1-2.8-38.698-6.298-39.799-21.199-1.601-22.201 5.4-26.5 47.1-28.799 20.3-1.199 289.9-1.199 315.698-.098"/>
</g>
</svg>
  );
}

export function SurfaceGlyph(props) {
  return (
    <svg viewBox="0 0 1784.000000 1744.000000"
    aria-hidden="true"  {...props} fill="gray" >
    <g transform="translate(9000.000000,1744.000000) scale(10.100000,10.100000)" ></g>
    <g transform="translate(-1010.000000,2590.000000) scale(0.200000,-0.200000)" 
     strokeWidth="20px">
      <path d="M8894 12530 c-235 -25 -528 -137 -754 -288 -107 -72 -143 -100 -267 -208 l-70 -61 -179 -6 c-205 -6 -336 -28 -497 -83 -223 -77 -382 -176 -543 -338 -238 -239 -373 -526 -439 -931 -41 -248 -77 -337 -217 -532 -115 -160 -173 -253 -236 -379 -146 -292 -190 -509 -179 -898 3 -119 12 -238 22 -291 35 -193 134 -430 275 -655 159 -254 161 -263 158 -621 -3 -293 4 -362 48 -519 81 -283 212 -507 419 -715 125 -126 211 -190 345 -259 202 -104 333 -144 659 -201 288 -50 339 -73 631 -279 294 -209 467 -294 744 -367 187 -49 313 -62 586 -63 275 -1 358 8 556 59 313 80 536 190 839 414 199 146 281 192 440 241 71 23 187 59 256 81 468 149 839 468 1043 899 92 196 134 352 181 675 43 302 65 360 207 570 147 216 203 341 245 551 25 128 25 494 0 614 -54 254 -178 499 -372 735 -170 206 -220 289 -244 405 -6 30 -15 145 -20 255 -7 155 -15 227 -36 320 -134 598 -568 1061 -1130 1204 -135 34 -202 42 -420 50 -173 7 -219 12 -261 28 -50 20 -135 75 -321 211 -224 163 -544 314 -743 351 -154 29 -576 47 -726 31z m606 -340 c305 -52 662 -282 699 -451 14 -61 -3 -94 -61 -123 -29 -14 -62 -26 -74 -26 -18 0 -22 7 -27 54 -10 97 -60 160 -165 209 -50 23 -82 31 -150 35 -193 11 -349 -63 -417 -197 -93 -185 -16 -440 172 -564 109 -71 148 -82 298 -82 120 0 137 3 218 32 104 36 216 102 330 193 184 145 314 218 472 266 79 24 107 27 235 28 121 1 159 -3 230 -22 434 -117 821 -512 847 -862 7 -91 5 -93 -97 -114 -151 -32 -255 -108 -318 -232 -56 -111 -68 -180 -87 -510 -14 -252 -23 -303 -57 -332 -20 -16 -23 -5 -38 138 -32 298 -85 440 -275 739 -130 205 -147 242 -148 316 0 100 46 176 136 221 77 39 137 42 232 9 101 -35 157 -38 186 -8 49 48 -23 134 -175 209 -133 65 -223 85 -381 86 -268 1 -390 -62 -480 -246 -104 -211 -63 -324 232 -636 219 -232 261 -287 307 -399 41 -100 58 -196 58 -316 -1 -336 -195 -610 -508 -719 -99 -35 -204 -54 -409 -77 -368 -40 -420 -62 -714 -307 -306 -255 -448 -334 -678 -378 -131 -24 -311 -16 -418 20 -110 37 -206 97 -285 176 -98 98 -123 145 -128 246 -5 101 15 176 65 233 37 44 91 68 217 96 182 40 245 102 246 240 0 116 -74 220 -198 278 -61 29 -75 31 -162 31 -163 -2 -317 -67 -448 -188 -216 -201 -274 -493 -152 -762 51 -113 95 -171 299 -395 118 -130 192 -236 211 -303 20 -74 10 -209 -23 -279 -35 -77 -135 -180 -251 -259 -203 -139 -263 -245 -203 -359 59 -111 220 -121 352 -21 69 52 126 126 225 292 123 206 198 286 340 363 115 63 168 75 426 97 259 23 330 35 420 75 121 53 193 128 359 370 87 127 219 260 305 308 36 20 97 43 135 52 82 19 244 22 335 5 237 -43 460 -242 500 -446 17 -88 4 -126 -69 -198 l-59 -58 -188 11 c-214 13 -257 8 -357 -39 -139 -65 -259 -185 -327 -325 -79 -161 -91 -313 -40 -500 16 -60 30 -111 30 -112 1 -26 -188 74 -290 152 -47 36 -134 103 -194 149 -59 47 -146 104 -193 128 l-86 43 -168 3 c-135 3 -180 0 -226 -13 -122 -35 -301 -165 -421 -305 -254 -295 -326 -364 -452 -434 -99 -54 -180 -69 -335 -63 -146 5 -231 28 -332 89 -77 46 -179 157 -214 233 -56 120 -71 259 -37 357 21 62 77 137 194 259 142 150 187 205 226 282 107 212 62 492 -107 675 -155 168 -319 235 -647 266 -300 29 -388 72 -494 243 -64 102 -120 128 -169 79 -77 -77 -11 -314 130 -465 91 -97 142 -123 363 -186 217 -62 287 -108 347 -225 41 -80 48 -125 30 -179 -16 -49 -77 -131 -97 -131 -6 0 -26 18 -45 40 -46 54 -150 102 -308 144 -71 19 -148 42 -170 51 -149 63 -340 273 -420 463 -67 160 -89 300 -82 522 9 292 69 499 203 700 55 84 142 186 155 182 6 -1 8 2 5 7 -6 9 92 99 131 120 26 13 60 14 67 2 3 -5 -21 -62 -54 -127 -90 -179 -110 -290 -74 -428 74 -288 345 -489 605 -449 141 22 228 81 524 359 231 216 286 260 385 310 134 67 311 114 430 114 126 0 341 -58 447 -121 74 -45 173 -137 214 -200 70 -110 109 -287 90 -407 -14 -88 -46 -150 -138 -274 -130 -171 -144 -246 -63 -322 42 -38 42 -39 109 -34 182 13 379 203 445 428 91 307 -17 702 -262 962 -163 172 -385 284 -644 324 -122 19 -354 14 -513 -11 -364 -57 -543 -168 -735 -455 -85 -126 -186 -207 -281 -225 -77 -14 -149 77 -157 199 -11 173 81 354 253 499 131 110 247 151 530 187 197 25 255 41 370 96 107 51 175 107 227 188 54 84 78 169 78 275 0 146 -43 255 -134 347 -155 154 -405 186 -622 79 -137 -67 -214 -181 -274 -405 -17 -63 -44 -144 -61 -178 -40 -82 -155 -199 -233 -237 -49 -24 -65 -27 -130 -23 -65 3 -80 7 -113 34 -21 17 -51 56 -68 89 -28 56 -30 68 -29 165 0 66 7 129 18 170 85 320 440 639 815 732 120 30 322 30 436 -1 244 -65 461 -235 578 -452 43 -78 83 -189 137 -374 23 -77 59 -177 81 -222 104 -216 347 -376 654 -430 70 -12 128 -14 260 -9 515 19 579 19 639 2 115 -34 221 -179 221 -301 -2 -204 -213 -355 -443 -316 -71 13 -119 34 -359 162 -70 37 -85 42 -110 34 -40 -14 -76 -87 -68 -140 21 -147 209 -330 426 -416 82 -32 89 -33 265 -37 221 -5 292 5 398 56 160 77 257 172 328 319 51 105 65 208 50 361 -9 85 -17 117 -47 179 -109 232 -300 398 -562 490 l-78 28 -360 -3 c-224 -2 -394 1 -450 8 -167 21 -289 104 -363 247 -22 43 -67 164 -101 268 -111 347 -210 504 -422 666 -85 65 -129 112 -129 138 0 20 43 88 69 109 112 91 331 184 501 212 72 12 497 5 580 -10z m2896 -2558 c57 -29 168 -152 204 -226 81 -164 55 -436 -52 -552 -76 -83 -184 -96 -309 -38 -113 54 -186 137 -228 261 -41 123 -34 300 18 400 28 56 86 123 135 156 38 27 46 29 116 25 50 -3 89 -12 116 -26z m-763 -955 c169 -62 284 -173 346 -337 52 -136 23 -429 -60 -599 -70 -143 -254 -305 -381 -335 -36 -8 -37 13 -3 74 105 185 127 339 76 523 -26 96 -59 144 -205 300 -72 78 -140 153 -149 167 -37 54 -12 143 55 193 69 51 203 57 321 14z m766 -742 c1 -156 -14 -300 -39 -394 -29 -108 -109 -263 -184 -357 -113 -143 -230 -218 -509 -328 -222 -87 -344 -157 -451 -257 -163 -152 -227 -273 -315 -591 -43 -158 -76 -242 -90 -234 -5 3 -12 30 -16 59 -9 75 -38 195 -78 327 -47 155 -71 301 -65 404 4 73 9 93 48 172 78 158 233 287 378 314 28 5 143 14 255 20 111 6 233 15 271 20 140 21 286 104 438 248 207 198 275 350 334 747 l7 50 8 -40 c4 -22 8 -94 8 -160z m-5752 -541 c33 -21 37 -50 22 -171 -7 -59 -13 -187 -13 -283 -1 -202 9 -252 78 -395 107 -222 220 -307 586 -441 85 -31 173 -65 194 -76 35 -18 37 -21 21 -30 -30 -17 -249 -3 -343 21 -472 123 -809 504 -839 946 -9 148 20 288 80 377 30 44 53 60 102 71 30 7 87 -3 112 -19z m2491 -696 c60 -15 161 -112 197 -190 42 -90 32 -221 -28 -351 -63 -137 -191 -283 -313 -355 -193 -114 -481 -151 -669 -84 -62 21 -135 89 -135 124 0 32 39 89 121 181 100 111 188 221 280 351 95 135 192 239 261 279 88 51 194 68 286 45z m922 -720 c41 -28 70 -81 70 -128 0 -171 -346 -399 -489 -323 -56 30 -76 65 -75 136 0 99 56 182 179 267 103 71 248 93 315 48z">
      </path></g></svg>
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

function RulerGlyph(props) {
  return (
<svg 
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.5"
  strokeLinecap="round"
  strokeLinejoin="round"
  {...props}
> <g transform="translate(0,-1)">
  <path d="M16 2l6 6L8 22l-6-6L16 2" />
  <path d="M7.5 10.5l2 2" />
  <path d="M10.5 7.5l2 2" />
  <path d="M13.5 4.5l2 2" />
  <path d="M4.5 13.5l2 2" />
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
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg
       ${isActive ? 'bg-orange-100' : 'bg-gray-100'}
        border border-gray-400 hover:bg-orange-200`}>
        <LogGlyph className="w-4 h-4 text-gray-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}



export function ZeroOneButton({ onClick, tooltip = null }){
  return (
    <button
      type="button"
      onClick={onClick}
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg
        bg-gray-100 hover:bg-red-200 border border-gray-400">
        <ZeroOneGlyph className="w-4 h-4 text-green-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
};



export function TreeButton({ onClick, tooltip = null }){
  return (
    <button
      type="button"
      onClick={onClick}
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg
        bg-gray-100 hover:bg-green-200 border border-gray-400">
        <TreeGlyph className="w-4 h-4 text-green-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
};

export function SubMSAButton({ onClick, tooltip = null }){
  return (
    <button
      type="button"
      onClick={onClick}
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg
        bg-gray-100 hover:bg-gray-300 border border-gray-400">
        <SubMSAGlyph className="w-4 h-4 flex-shrink-0 m-0 p-0 -translate-y-[0px]" />
      </span>
    </button>
  );
};

export function OmegaButton({ onClick, tooltip = null }){
  return (
    <button
      type="button"
      onClick={onClick}
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg
        bg-gray-100 hover:bg-fuchsia-200 border border-gray-400">
        <OmegaGlyph className="w-4 h-4 flex-shrink-0 m-0 p-0 -translate-y-[0px]" />
      </span>
    </button>
  );
};


export function BranchLengthsButton({ onClick, isActive }) {
  return (
<button
      type="button"
      onClick={onClick}
      className='p-0.5  '
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg
      bg-gray-100
        border border-gray-400 hover:bg-green-200`}>
        <RulerGlyph className="w-4 h-4 text-green-700 flex-shrink-0 -translate-y-[0px]" />
      </span>
    </button>
  );
}



export function GitHubButton() {
  return (
    <div className="relative group">
      <a
        href="https://github.com/lucanest/mseaboard"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-1 py-1 rounded-3xl hover:bg-gray-300 transition"
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
