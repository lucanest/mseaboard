"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = WidthProvideRGL;
var React = _interopRequireWildcard(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _resizeObserverPolyfill = _interopRequireDefault(require("resize-observer-polyfill"));
var _clsx = _interopRequireDefault(require("clsx"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
/*:: import type { ReactRef } from "../ReactGridLayoutPropTypes";*/
/*:: type WPDefaultProps = {|
  measureBeforeMount: boolean
|};*/
/*:: type WPProps = {|
  className?: string,
  style?: Object,
  ...WPDefaultProps
|};*/
// eslint-disable-next-line no-unused-vars
/*:: type WPState = {|
  width: number
|};*/
/*:: type ComposedProps<Config> = {|
  ...Config,
  measureBeforeMount?: boolean,
  className?: string,
  style?: Object,
  width?: number
|};*/
const layoutClassName = "react-grid-layout";

/*
 * A simple HOC that provides facility for listening to container resizes.
 *
 * The Flow type is pretty janky here. I can't just spread `WPProps` into this returned object - I wish I could - but it triggers
 * a flow bug of some sort that causes it to stop typechecking.
 */
function WidthProvideRGL /*:: <Config>*/(ComposedComponent /*: React.AbstractComponent<Config>*/) /*: React.AbstractComponent<ComposedProps<Config>>*/{
  var _class;
  return _class = class WidthProvider extends React.Component
  /*:: <
      ComposedProps<Config>,
      WPState
    >*/
  {
    constructor() {
      super(...arguments);
      _defineProperty(this, "state", {
        width: 1280
      });
      _defineProperty(this, "elementRef", /*#__PURE__*/React.createRef());
      _defineProperty(this, "mounted", false);
      _defineProperty(this, "resizeObserver", void 0);
    }
    componentDidMount() {
      this.mounted = true;
      this.resizeObserver = new _resizeObserverPolyfill.default(entries => {
        const node = this.elementRef.current;
        if (node instanceof HTMLElement) {
          const width = entries[0].contentRect.width;
          this.setState({
            width
          });
        }
      });
      const node = this.elementRef.current;
      if (node instanceof HTMLElement) {
        this.resizeObserver.observe(node);
      }
    }
    componentWillUnmount() {
      this.mounted = false;
      const node = this.elementRef.current;
      if (node instanceof HTMLElement) {
        this.resizeObserver.unobserve(node);
      }
      this.resizeObserver.disconnect();
    }
    render() {
      const {
        measureBeforeMount,
        ...rest
      } = this.props;
      if (measureBeforeMount && !this.mounted) {
        return /*#__PURE__*/React.createElement("div", {
          className: (0, _clsx.default)(this.props.className, layoutClassName),
          style: this.props.style
          // $FlowIgnore ref types
          ,
          ref: this.elementRef
        });
      }
      return /*#__PURE__*/React.createElement(ComposedComponent, _extends({
        innerRef: this.elementRef
      }, rest, this.state));
    }
  }, _defineProperty(_class, "defaultProps", {
    measureBeforeMount: false
  }), _defineProperty(_class, "propTypes", {
    // If true, will not render children until mounted. Useful for getting the exact width before
    // rendering, to prevent any unsightly resizing.
    measureBeforeMount: _propTypes.default.bool
  }), _class;
}