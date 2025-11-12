import { DARK_GRAY_COLOR } from "./colors";

export const subtooltipClass = "text-xs text-gray-600";
export const tooltipStyle = {
  position: 'absolute',
  background: 'white',
  color: DARK_GRAY_COLOR,
  border: `1px solid ${DARK_GRAY_COLOR}`,
  padding: '4px 8px',
  borderRadius: '8px',
  pointerEvents: 'none',
  fontSize: '12px',
  zIndex: 10,
};
