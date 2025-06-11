"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _fastEquals = require("fast-equals");
var _utils = require("./utils");
var _responsiveUtils = require("./responsiveUtils");
var _ReactGridLayout = _interopRequireDefault(require("./ReactGridLayout"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*:: import { type Layout, type Pick } from "./utils";*/ /*:: import { type ResponsiveLayout, type OnLayoutChangeCallback, type Breakpoints } from "./responsiveUtils";*/
// $FlowFixMe[method-unbinding]
const type = obj => Object.prototype.toString.call(obj);

/**
 * Get a value of margin or containerPadding.
 *
 * @param  {Array | Object} param Margin | containerPadding, e.g. [10, 10] | {lg: [10, 10], ...}.
 * @param  {String} breakpoint   Breakpoint: lg, md, sm, xs and etc.
 * @return {Array}
 */
function getIndentationValue /*:: <T: ?[number, number]>*/(param /*: { [key: string]: T } | T*/, breakpoint /*: string*/) /*: T*/{
  // $FlowIgnore TODO fix this typedef
  if (param == null) return null;
  // $FlowIgnore TODO fix this typedef
  return Array.isArray(param) ? param : param[breakpoint];
}
/*:: type State = {
  layout: Layout,
  breakpoint: string,
  cols: number,
  layouts?: ResponsiveLayout<string>
};*/
/*:: type Props<Breakpoint: string = string> = {|
  ...React.ElementConfig<typeof ReactGridLayout>,

  // Responsive config
  breakpoint?: ?Breakpoint,
  breakpoints: Breakpoints<Breakpoint>,
  cols: { [key: Breakpoint]: number },
  layouts: ResponsiveLayout<Breakpoint>,
  width: number,
  margin: { [key: Breakpoint]: [number, number] } | [number, number],
  /* prettier-ignore *-/
  containerPadding: { [key: Breakpoint]: ?[number, number] } | ?[number, number],

  // Callbacks
  onBreakpointChange: (Breakpoint, cols: number) => void,
  onLayoutChange: OnLayoutChangeCallback,
  onWidthChange: (
    containerWidth: number,
    margin: [number, number],
    cols: number,
    containerPadding: ?[number, number]
  ) => void
|};*/
/*:: type DefaultProps = Pick<
  Props<>,
  {|
    allowOverlap: 0,
    breakpoints: 0,
    cols: 0,
    containerPadding: 0,
    layouts: 0,
    margin: 0,
    onBreakpointChange: 0,
    onLayoutChange: 0,
    onWidthChange: 0
  |}
>;*/
class ResponsiveReactGridLayout extends React.Component
/*:: <
  Props<>,
  State
>*/
{
  constructor() {
    super(...arguments);
    _defineProperty(this, "state", this.generateInitialState());
    // wrap layouts so we do not need to pass layouts to child
    _defineProperty(this, "onLayoutChange", (layout /*: Layout*/) => {
      this.props.onLayoutChange(layout, {
        ...this.props.layouts,
        [this.state.breakpoint]: layout
      });
    });
  }
  generateInitialState() /*: State*/{
    const {
      width,
      breakpoints,
      layouts,
      cols
    } = this.props;
    const breakpoint = (0, _responsiveUtils.getBreakpointFromWidth)(breakpoints, width);
    const colNo = (0, _responsiveUtils.getColsFromBreakpoint)(breakpoint, cols);
    // verticalCompact compatibility, now deprecated
    const compactType = this.props.verticalCompact === false ? null : this.props.compactType;
    // Get the initial layout. This can tricky; we try to generate one however possible if one doesn't exist
    // for this layout.
    const initialLayout = (0, _responsiveUtils.findOrGenerateResponsiveLayout)(layouts, breakpoints, breakpoint, breakpoint, colNo, compactType);
    return {
      layout: initialLayout,
      breakpoint: breakpoint,
      cols: colNo
    };
  }
  static getDerivedStateFromProps(nextProps /*: Props<*>*/, prevState /*: State*/) /*: ?$Shape<State>*/{
    if (!(0, _fastEquals.deepEqual)(nextProps.layouts, prevState.layouts)) {
      // Allow parent to set layouts directly.
      const {
        breakpoint,
        cols
      } = prevState;

      // Since we're setting an entirely new layout object, we must generate a new responsive layout
      // if one does not exist.
      const newLayout = (0, _responsiveUtils.findOrGenerateResponsiveLayout)(nextProps.layouts, nextProps.breakpoints, breakpoint, breakpoint, cols, nextProps.compactType);
      return {
        layout: newLayout,
        layouts: nextProps.layouts
      };
    }
    return null;
  }
  componentDidUpdate(prevProps /*: Props<*>*/) {
    // Allow parent to set width or breakpoint directly.
    if (this.props.width != prevProps.width || this.props.breakpoint !== prevProps.breakpoint || !(0, _fastEquals.deepEqual)(this.props.breakpoints, prevProps.breakpoints) || !(0, _fastEquals.deepEqual)(this.props.cols, prevProps.cols)) {
      this.onWidthChange(prevProps);
    }
  }
  /**
   * When the width changes work through breakpoints and reset state with the new width & breakpoint.
   * Width changes are necessary to figure out the widget widths.
   */
  onWidthChange(prevProps /*: Props<*>*/) {
    const {
      breakpoints,
      cols,
      layouts,
      compactType
    } = this.props;
    const newBreakpoint = this.props.breakpoint || (0, _responsiveUtils.getBreakpointFromWidth)(this.props.breakpoints, this.props.width);
    const lastBreakpoint = this.state.breakpoint;
    const newCols /*: number*/ = (0, _responsiveUtils.getColsFromBreakpoint)(newBreakpoint, cols);
    const newLayouts = {
      ...layouts
    };

    // Breakpoint change
    if (lastBreakpoint !== newBreakpoint || prevProps.breakpoints !== breakpoints || prevProps.cols !== cols) {
      // Preserve the current layout if the current breakpoint is not present in the next layouts.
      if (!(lastBreakpoint in newLayouts)) newLayouts[lastBreakpoint] = (0, _utils.cloneLayout)(this.state.layout);

      // Find or generate a new layout.
      let layout = (0, _responsiveUtils.findOrGenerateResponsiveLayout)(newLayouts, breakpoints, newBreakpoint, lastBreakpoint, newCols, compactType);

      // This adds missing items.
      layout = (0, _utils.synchronizeLayoutWithChildren)(layout, this.props.children, newCols, compactType, this.props.allowOverlap);

      // Store the new layout.
      newLayouts[newBreakpoint] = layout;

      // callbacks
      this.props.onBreakpointChange(newBreakpoint, newCols);
      this.props.onLayoutChange(layout, newLayouts);
      this.setState({
        breakpoint: newBreakpoint,
        layout: layout,
        cols: newCols
      });
    }
    const margin = getIndentationValue(this.props.margin, newBreakpoint);
    const containerPadding = getIndentationValue(this.props.containerPadding, newBreakpoint);

    //call onWidthChange on every change of width, not only on breakpoint changes
    this.props.onWidthChange(this.props.width, margin, newCols, containerPadding);
  }
  render() /*: React.Element<typeof ReactGridLayout>*/{
    /* eslint-disable no-unused-vars */
    const {
      breakpoint,
      breakpoints,
      cols,
      layouts,
      margin,
      containerPadding,
      onBreakpointChange,
      onLayoutChange,
      onWidthChange,
      ...other
    } = this.props;
    /* eslint-enable no-unused-vars */

    return /*#__PURE__*/React.createElement(_ReactGridLayout.default, _extends({}, other, {
      // $FlowIgnore should allow nullable here due to DefaultProps
      margin: getIndentationValue(margin, this.state.breakpoint),
      containerPadding: getIndentationValue(containerPadding, this.state.breakpoint),
      onLayoutChange: this.onLayoutChange,
      layout: this.state.layout,
      cols: this.state.cols
    }));
  }
}
exports.default = ResponsiveReactGridLayout;
// This should only include propTypes needed in this code; RGL itself
// will do validation of the rest props passed to it.
_defineProperty(ResponsiveReactGridLayout, "propTypes", {
  //
  // Basic props
  //

  // Optional, but if you are managing width yourself you may want to set the breakpoint
  // yourself as well.
  breakpoint: _propTypes.default.string,
  // {name: pxVal}, e.g. {lg: 1200, md: 996, sm: 768, xs: 480}
  breakpoints: _propTypes.default.object,
  allowOverlap: _propTypes.default.bool,
  // # of cols. This is a breakpoint -> cols map
  cols: _propTypes.default.object,
  // # of margin. This is a breakpoint -> margin map
  // e.g. { lg: [5, 5], md: [10, 10], sm: [15, 15] }
  // Margin between items [x, y] in px
  // e.g. [10, 10]
  margin: _propTypes.default.oneOfType([_propTypes.default.array, _propTypes.default.object]),
  // # of containerPadding. This is a breakpoint -> containerPadding map
  // e.g. { lg: [5, 5], md: [10, 10], sm: [15, 15] }
  // Padding inside the container [x, y] in px
  // e.g. [10, 10]
  containerPadding: _propTypes.default.oneOfType([_propTypes.default.array, _propTypes.default.object]),
  // layouts is an object mapping breakpoints to layouts.
  // e.g. {lg: Layout, md: Layout, ...}
  layouts(props /*: Props<>*/, propName /*: string*/) {
    if (type(props[propName]) !== "[object Object]") {
      throw new Error("Layout property must be an object. Received: " + type(props[propName]));
    }
    Object.keys(props[propName]).forEach(key => {
      if (!(key in props.breakpoints)) {
        throw new Error("Each key in layouts must align with a key in breakpoints.");
      }
      (0, _utils.validateLayout)(props.layouts[key], "layouts." + key);
    });
  },
  // The width of this component.
  // Required in this propTypes stanza because generateInitialState() will fail without it.
  width: _propTypes.default.number.isRequired,
  //
  // Callbacks
  //

  // Calls back with breakpoint and new # cols
  onBreakpointChange: _propTypes.default.func,
  // Callback so you can save the layout.
  // Calls back with (currentLayout, allLayouts). allLayouts are keyed by breakpoint.
  onLayoutChange: _propTypes.default.func,
  // Calls back with (containerWidth, margin, cols, containerPadding)
  onWidthChange: _propTypes.default.func
});
_defineProperty(ResponsiveReactGridLayout, "defaultProps", {
  breakpoints: {
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0
  },
  cols: {
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2
  },
  containerPadding: {
    lg: null,
    md: null,
    sm: null,
    xs: null,
    xxs: null
  },
  layouts: {},
  margin: [10, 10],
  allowOverlap: false,
  onBreakpointChange: _utils.noop,
  onLayoutChange: _utils.noop,
  onWidthChange: _utils.noop
});