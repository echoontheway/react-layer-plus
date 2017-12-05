import React, { Component } from 'react'
import ReactDOM from 'react-dom'


var mixStyle = function (offset) {
    return Object.assign({ position: 'absolute', zIndex: 100 }, offset)
}

// Fix for IE8-'s Element.getBoundingClientRect()
if ('TextRectangle' in window && !('width' in TextRectangle.prototype)) {
    Object.defineProperties(TextRectangle.prototype, {
        'width': { get: function () { return this.right - this.left; } },
        'height': { get: function () { return this.bottom - this.top; } }
    });
}

class ReactLayer extends Component {
    /**
     * @memberof ReactLayer
     * ReactLayer 组件上的事件由组件自己已处理显隐，使用本组件仅需要处理InBody内children上自己业务需要的事件与显隐
     * props.target [string targetId]: layer show by [eventIn] target
     * props.eventIn  {eventName}         show trigger by eventIn
     * //if eventIn is mouseover, eventOut mouseleave default
     * //if target is form element ,eventOut is blur default
     * props.eventOut {optional eventName} hide trigger by eventOut form element needn't eventOut
     * props.show     {optional boolean}
     * props.onPreBlur {callback function}
     * props.onEventIn {callback function}
     * props.onEventOut {callback function}
     * props.placement {string} default 'bottom-left'  left right top bottom top-left bottom-left top-right bottom-right
     * ReactLayer.eventInner {static boolean}   get or set the event trigger by ReactLayer Inner or Outer
     */
    constructor(props) {
        super(props);
        this.state = {
            offset: mixStyle(props.offset) || {},		//position
            show: props.show || false
        }
    }

    createBodyWrapper() {
        if (!this.hasBodyWrapper()) {
            this.popup = document.createElement('div')
            this.popup.className = 'layer-wrapper'
            // this.popup.refid = this.props.target
            document.body.appendChild(this.popup)
        }
    }

    hasBodyWrapper() {
        var popupExist = this.popup && this.popup.className && document.body.getElementsByClassName(this.popup.className)
        if (this.popup && popupExist.length) {
            if (this.popup.children.length) {
                return true
            }
            document.body.removeChild(popupExist[0])
        }
        return false
    }

    componentDidMount() {
        this.createBodyWrapper()

        var { inline, eventIn, eventOut, onEventIn, onEventOut, children } = this.props
        if (!inline) {
            this.state.offset.width = children.clientWidth
            this.setState(this.state)
        }
        var that = this
        var target = that.getTarget()
        if (target) {
            target.addEventListener(eventIn, function () {
                onEventIn && onEventIn()
                that.show(true)
            })
            if (eventIn === 'mouseover') {
                target.addEventListener(eventOut || 'mouseleave', function () {
                    that.timeId = setTimeout(function () {
                        that.show(false)
                    }, 200);
                })
            } else if (eventOut) {
                target.addEventListener(eventOut, function () {
                    that.show(false)
                    onEventOut && onEventOut()
                })
            }
            if (that.targetIsInput(target)) {
                target.addEventListener('blur', function () {
                    if (!that.eventInner) {
                        that.setState({ show: false })
                    }
                })
            }
        }
    }

    show(ok) {
        if (ok) {
            this.setState({ show: ok, offset: mixStyle(this.setDefaultPos()) })
            this.setState({ offset: mixStyle(this.setAddtionPos()) })
        } else {
            this.setState({ show: false })
        }

    }

    onMouseOver() {
        if (this.timeId) {
            clearTimeout(this.timeId)
        }
    }

    onMouseDown() {
        var { onPreBlur } = this.props
        onPreBlur && onPreBlur()
        this.eventInner = true
    }

    //InBody Wrapper Event, control refs and pane show
    onClick() {
        //触发区域为外部区域
        if (!this.eventInner) {
            this.setState({ show: false })
        } else {
            //触发区域为有效区域，但是无效操作时
            var target = this.getTarget()
            if (this.targetIsInput(target)) {
                target.focus()
            }
        }
        this.eventInner = false
    }

    onMouseLeave() {
        var target = this.getTarget()
        //触发元素为非表单元素时， 离开即关闭
        if (!this.targetIsInput(target)) {
            this.setState({ show: false })
        }
    }

    targetIsInput(target) {
        return target.tagName.toLowerCase() === 'input'
    }

    componentWillReceiveProps(nextProps) {
        if ((nextProps.show !== this.state.show) && this.targetIsInput(this.getTarget())) {
            this.show(nextProps.show)
        }
    }

    componentDidUpdate() {
        this.state.show ? this.renderLayer() : this.removeLayer()
    }

    setDefaultPos() {
        let { left, top, height } = this.getRefPosition();
        top += (height + (document.body.scrollTop || document.documentElement.scrollTop))

        return { left, top }
    }

    setAddtionPos() {
        let { placement } = this.props
        let { left, top, height, width } = this.getRefPosition();
        let scrollTop = document.body.scrollTop || document.documentElement.scrollTop
        let offsetTop = top + (height + scrollTop)
        let right = left + width

        let offsetPos = {}
        if (!this.layerSize) {
            return offsetPos
        }
        let scrollBottomGap = document.documentElement.clientHeight - top - height - this.layerSize.height > 0 ? true : false,
            scrollTopGap = top - this.layerSize.height > 0 ? true : false

        let has = str => ~placement.indexOf(str)
        if (has('top') || !scrollBottomGap) {
            offsetPos.top = offsetTop - height - this.layerSize.height
        } else if (has('bottom') || !scrollTopGap) {
            offsetPos.top = offsetTop
        }
        if (has('right')) {
            offsetPos.left = right - this.layerSize.width
        } else if (has('left')) {
            offsetPos.left = left
        }

        if (!has('-')) {
            if (has('top') || has('bottom')) offsetPos.left = left + (width - this.layerSize.width) / 2
            if (has('left') || has('right')) {
                offsetPos.top = offsetTop + (-height - this.layerSize.height) / 2
                offsetPos.left = has('left') ? left - this.layerSize.width : left + width
            }
        }
        return offsetPos
    }

    getRefPosition() {
        return this.getTarget() && this.getTarget().getBoundingClientRect()
    }

    getLayerSize() {
        var layer = this.popup.getElementsByClassName(this.props.className)
        return layer.length && layer[0].getBoundingClientRect()
    }

    getTarget() {
        var { target } = this.props, targetEl = null
        if (typeof target === 'string') {
            targetEl = document.getElementById(target)
        } else {
            var reactTarget = typeof target === 'function' ? target() : target
            targetEl = reactTarget && ReactDOM.findDOMNode(reactTarget)
        }
        return targetEl
    }

    removeLayer() {
        if (this.popup) {
            try {
                ReactDOM.unmountComponentAtNode(this.popup)
                document.body.removeChild(this.popup)
            } catch (e) {
                this.popup = null
            }
        }
    }

    renderLayer() {
        if (!this.hasBodyWrapper()) {
            this.removeLayer()
        }
        this.createBodyWrapper()
        if (this.props.children) {
            const childrenWithProps = React.Children.map(this.props.children, child => React.cloneElement(child, {})) //abc: this.state.offset
            const childWrapWithProps = <div className={this.props.className} style={this.state.offset}
                onClick={this.onClick.bind(this)}
                onMouseOver={this.onMouseOver.bind(this)}
                onMouseDown={this.onMouseDown.bind(this)}
                onMouseLeave={this.onMouseLeave.bind(this)}
            >{childrenWithProps}
            </div>
            ReactDOM.render(childWrapWithProps, this.popup)
            this.layerSize = this.getLayerSize()
        }
    }

    render() {
        return null
    }
}
ReactLayer.defaultProps = {
    placement: 'bottom-left',
    eventIn: 'mouseover',
    className: 'layer-content'
}

export default ReactLayer
