/*
Smooth.js version 0.1.7

Turn arrays into smooth functions.

Copyright 2012 Spencer Cohen
Licensed under MIT license (see "Smooth.js MIT license.txt")
*/
/*Constants (these are accessible by Smooth.WHATEVER in user space)
*/
var Smooth;
(function (Smooth_1) {
    var AbstractInterpolator, CubicInterpolator, Enum, LinearInterpolator, NearestInterpolator, PI, SincFilterInterpolator, clipClamp, clipMirror, clipPeriodic, defaultConfig, getColumn, getType, isValidNumber, k, makeLanczosWindow, makeScaledFunction, makeSincKernel, normalizeScaleTo, shallowCopy, sin, sinc, v, validateNumber, validateVector, __hasProp = Object.prototype.hasOwnProperty, __extends = function (child, parent) { for (var key in parent) {
        if (__hasProp.call(parent, key))
            child[key] = parent[key];
    } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };
    Smooth_1.METHOD_NEAREST = 'nearest', Smooth_1.METHOD_LINEAR = 'linear', Smooth_1.METHOD_CUBIC = 'cubic', Smooth_1.METHOD_LANCZOS = 'lanczos', Smooth_1.METHOD_SINC = 'sinc', Smooth_1.CLIP_CLAMP = 'clamp', Smooth_1.CLIP_ZERO = 'zero', Smooth_1.CLIP_PERIODIC = 'periodic', Smooth_1.CLIP_MIRROR = 'mirror', Smooth_1.CUBIC_TENSION_DEFAULT = 0, Smooth_1.CUBIC_TENSION_CATMULL_ROM = 0;
    defaultConfig = {
        method: Smooth_1.METHOD_CUBIC,
        cubicTension: Smooth_1.CUBIC_TENSION_DEFAULT,
        clip: Smooth_1.CLIP_CLAMP,
        scaleTo: 0,
        sincFilterSize: 2,
        sincWindow: void 0
    };
    /*Index clipping functions
    */
    clipClamp = function (i, n) {
        return Math.max(0, Math.min(i, n - 1));
    };
    clipPeriodic = function (i, n) {
        i = i % n;
        if (i < 0)
            i += n;
        return i;
    };
    clipMirror = function (i, n) {
        var period;
        period = 2 * (n - 1);
        i = clipPeriodic(i, period);
        if (i > n - 1)
            i = period - i;
        return i;
    };
    /*
    Abstract scalar interpolation class which provides common functionality for all interpolators
    
    Subclasses must override interpolate().
    */
    AbstractInterpolator = (function () {
        function AbstractInterpolator(array, config) {
            this.array = array.slice(0);
            this.length = this.array.length;
            if (!(this.clipHelper = {
                clamp: this.clipHelperClamp,
                zero: this.clipHelperZero,
                periodic: this.clipHelperPeriodic,
                mirror: this.clipHelperMirror
            }[config.clip])) {
                throw "Invalid clip: " + config.clip;
            }
        }
        AbstractInterpolator.prototype.getClippedInput = function (i) {
            if ((0 <= i && i < this.length)) {
                return this.array[i];
            }
            else {
                return this.clipHelper(i);
            }
        };
        AbstractInterpolator.prototype.clipHelperClamp = function (i) {
            return this.array[clipClamp(i, this.length)];
        };
        AbstractInterpolator.prototype.clipHelperZero = function (i) {
            return 0;
        };
        AbstractInterpolator.prototype.clipHelperPeriodic = function (i) {
            return this.array[clipPeriodic(i, this.length)];
        };
        AbstractInterpolator.prototype.clipHelperMirror = function (i) {
            return this.array[clipMirror(i, this.length)];
        };
        AbstractInterpolator.prototype.interpolate = function (t) {
            throw 'Subclasses of AbstractInterpolator must override the interpolate() method.';
        };
        return AbstractInterpolator;
    })();
    NearestInterpolator = (function (_super) {
        __extends(NearestInterpolator, _super);
        function NearestInterpolator() {
            NearestInterpolator.__super__.constructor.apply(this, arguments);
        }
        NearestInterpolator.prototype.interpolate = function (t) {
            return this.getClippedInput(Math.round(t));
        };
        return NearestInterpolator;
    })(AbstractInterpolator);
    LinearInterpolator = (function (_super) {
        __extends(LinearInterpolator, _super);
        function LinearInterpolator() {
            LinearInterpolator.__super__.constructor.apply(this, arguments);
        }
        LinearInterpolator.prototype.interpolate = function (t) {
            var k;
            k = Math.floor(t);
            t -= k;
            return (1 - t) * this.getClippedInput(k) + t * this.getClippedInput(k + 1);
        };
        return LinearInterpolator;
    })(AbstractInterpolator);
    CubicInterpolator = (function (_super) {
        __extends(CubicInterpolator, _super);
        function CubicInterpolator(array, config) {
            this.tangentFactor = 1 - Math.max(0, Math.min(1, config.cubicTension));
            CubicInterpolator.__super__.constructor.apply(this, arguments);
        }
        CubicInterpolator.prototype.getTangent = function (k) {
            return this.tangentFactor * (this.getClippedInput(k + 1) - this.getClippedInput(k - 1)) / 2;
        };
        CubicInterpolator.prototype.interpolate = function (t) {
            var k, m, p, t2, t3;
            k = Math.floor(t);
            m = [this.getTangent(k), this.getTangent(k + 1)];
            p = [this.getClippedInput(k), this.getClippedInput(k + 1)];
            t -= k;
            t2 = t * t;
            t3 = t * t2;
            return (2 * t3 - 3 * t2 + 1) * p[0] + (t3 - 2 * t2 + t) * m[0] + (-2 * t3 + 3 * t2) * p[1] + (t3 - t2) * m[1];
        };
        return CubicInterpolator;
    })(AbstractInterpolator);
    sin = Math.sin, PI = Math.PI;
    sinc = function (x) {
        if (x === 0) {
            return 1;
        }
        else {
            return sin(PI * x) / (PI * x);
        }
    };
    makeLanczosWindow = function (a) {
        return function (x) {
            return sinc(x / a);
        };
    };
    makeSincKernel = function (window) {
        return function (x) {
            return sinc(x) * window(x);
        };
    };
    SincFilterInterpolator = (function (_super) {
        __extends(SincFilterInterpolator, _super);
        function SincFilterInterpolator(array, config) {
            SincFilterInterpolator.__super__.constructor.apply(this, arguments);
            this.a = config.sincFilterSize;
            if (!config.sincWindow)
                throw 'No sincWindow provided';
            this.kernel = makeSincKernel(config.sincWindow);
        }
        SincFilterInterpolator.prototype.interpolate = function (t) {
            var k, n, sum, _ref, _ref2;
            k = Math.floor(t);
            sum = 0;
            for (n = _ref = k - this.a + 1, _ref2 = k + this.a; _ref <= _ref2 ? n <= _ref2 : n >= _ref2; _ref <= _ref2 ? n++ : n--) {
                sum += this.kernel(t - n) * this.getClippedInput(n);
            }
            return sum;
        };
        return SincFilterInterpolator;
    })(AbstractInterpolator);
    getColumn = function (arr, i) {
        var row, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = arr.length; _i < _len; _i++) {
            row = arr[_i];
            _results.push(row[i]);
        }
        return _results;
    };
    makeScaledFunction = function (f, baseScale, scaleRange) {
        var scaleFactor, translation;
        if (scaleRange.join === '0,1') {
            return f;
        }
        else {
            scaleFactor = baseScale / (scaleRange[1] - scaleRange[0]);
            translation = scaleRange[0];
            return function (t) {
                return f(scaleFactor * (t - translation));
            };
        }
    };
    getType = function (x) {
        return Object.prototype.toString.call(x).slice('[object '.length, -1);
    };
    validateNumber = function (n) {
        if (isNaN(n))
            throw 'NaN in Smooth() input';
        if (getType(n) !== 'Number')
            throw 'Non-number in Smooth() input';
        if (!isFinite(n))
            throw 'Infinity in Smooth() input';
    };
    validateVector = function (v, dimension) {
        var n, _i, _len;
        if (getType(v) !== 'Array')
            throw 'Non-vector in Smooth() input';
        if (v.length !== dimension)
            throw 'Inconsistent dimension in Smooth() input';
        for (_i = 0, _len = v.length; _i < _len; _i++) {
            n = v[_i];
            validateNumber(n);
        }
    };
    isValidNumber = function (n) {
        return (getType(n) === 'Number') && isFinite(n) && !isNaN(n);
    };
    normalizeScaleTo = function (s) {
        var invalidErr;
        invalidErr = "scaleTo param must be number or array of two numbers";
        switch (getType(s)) {
            case 'Number':
                if (!isValidNumber(s))
                    throw invalidErr;
                s = [0, s];
                break;
            case 'Array':
                if (s.length !== 2)
                    throw invalidErr;
                if (!(isValidNumber(s[0]) && isValidNumber(s[1])))
                    throw invalidErr;
                break;
            default:
                throw invalidErr;
        }
        return s;
    };
    shallowCopy = function (obj) {
        var copy, k, v;
        copy = {};
        for (k in obj) {
            if (!__hasProp.call(obj, k))
                continue;
            v = obj[k];
            copy[k] = v;
        }
        return copy;
    };
    Smooth_1.Smooth = function (arr, config) {
        var baseDomainEnd, dimension, i, interpolator, interpolatorClass, interpolators, k, n, properties, smoothFunc, v;
        if (config == null)
            config = {};
        properties = {};
        config = shallowCopy(config);
        properties.config = shallowCopy(config);
        if (config.scaleTo == null)
            config.scaleTo = config.period;
        if (config.sincFilterSize == null) {
            config.sincFilterSize = config.lanczosFilterSize;
        }
        for (k in defaultConfig) {
            if (!__hasProp.call(defaultConfig, k))
                continue;
            v = defaultConfig[k];
            if (config[k] == null)
                config[k] = v;
        }
        if (!(interpolatorClass = {
            nearest: NearestInterpolator,
            linear: LinearInterpolator,
            cubic: CubicInterpolator,
            lanczos: SincFilterInterpolator,
            sinc: SincFilterInterpolator
        }[config.method])) {
            throw "Invalid method: " + config.method;
        }
        if (config.method === 'lanczos') {
            config.sincWindow = makeLanczosWindow(config.sincFilterSize);
        }
        if (arr.length < 2)
            throw 'Array must have at least two elements';
        properties.count = arr.length;
        smoothFunc = (function () {
            var _i, _j, _len, _len2;
            switch (getType(arr[0])) {
                case 'Number':
                    properties.dimension = 'scalar';
                    if (Smooth_1.Smooth.deepValidation) {
                        for (_i = 0, _len = arr.length; _i < _len; _i++) {
                            n = arr[_i];
                            validateNumber(n);
                        }
                    }
                    interpolator = new interpolatorClass(arr, config);
                    return function (t) {
                        return interpolator.interpolate(t);
                    };
                case 'Array':
                    properties.dimension = dimension = arr[0].length;
                    if (!dimension)
                        throw 'Vectors must be non-empty';
                    if (Smooth_1.Smooth.deepValidation) {
                        for (_j = 0, _len2 = arr.length; _j < _len2; _j++) {
                            v = arr[_j];
                            validateVector(v, dimension);
                        }
                    }
                    interpolators = (function () {
                        var _results;
                        _results = [];
                        for (i = 0; 0 <= dimension ? i < dimension : i > dimension; 0 <= dimension ? i++ : i--) {
                            _results.push(new interpolatorClass(getColumn(arr, i), config));
                        }
                        return _results;
                    })();
                    return function (t) {
                        var interpolator, _k, _len3, _results;
                        _results = [];
                        for (_k = 0, _len3 = interpolators.length; _k < _len3; _k++) {
                            interpolator = interpolators[_k];
                            _results.push(interpolator.interpolate(t));
                        }
                        return _results;
                    };
                default:
                    throw "Invalid element type: " + (getType(arr[0]));
            }
        })();
        if (config.clip === 'periodic') {
            baseDomainEnd = arr.length;
        }
        else {
            baseDomainEnd = arr.length - 1;
        }
        config.scaleTo || (config.scaleTo = baseDomainEnd);
        properties.domain = normalizeScaleTo(config.scaleTo);
        smoothFunc = makeScaledFunction(smoothFunc, baseDomainEnd, properties.domain);
        properties.domain.sort();
        /*copy properties
        */
        for (k in properties) {
            if (!__hasProp.call(properties, k))
                continue;
            v = properties[k];
            smoothFunc[k] = v;
        }
        return smoothFunc;
    };
    for (k in Enum) {
        if (!__hasProp.call(Enum, k))
            continue;
        v = Enum[k];
        Smooth_1.Smooth[k] = v;
    }
    Smooth_1.Smooth.deepValidation = true;
})(Smooth || (Smooth = {}));
var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var mouseDrawing = false;
var stroke = [];
var whiteboardHistory = [];
ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.fillStyle = "#eee";
ctx.fillRect(0, 0, canvas.width, canvas.height);
whiteboardHistory.push(canvas.toDataURL());
var Graphics;
(function (Graphics) {
    function update(quality) {
        if (quality === void 0) { quality = 10; }
        ctx.beginPath();
        ctx.moveTo(stroke[0][0], stroke[0][1]);
        var smoothed = Smooth.Smooth(stroke, {
            method: Smooth.METHOD_CUBIC,
            clip: Smooth.CLIP_CLAMP
        });
        for (var i = 0; i < stroke.length - 1; i += 1 / quality) {
            var calculatedPoint = smoothed(i);
            ctx.lineTo(calculatedPoint[0], calculatedPoint[1]);
        }
        ctx.stroke();
    }
    Graphics.update = update;
})(Graphics || (Graphics = {}));
var Functionality;
(function (Functionality) {
    function undo() {
        if (whiteboardHistory.length > 1) {
            var imageToDraw_1 = new Image();
            whiteboardHistory.pop();
            imageToDraw_1.src = whiteboardHistory[whiteboardHistory.length - 1];
            imageToDraw_1.onload = function () { ctx.drawImage(imageToDraw_1, 0, 0); };
        }
    }
    Functionality.undo = undo;
})(Functionality || (Functionality = {}));
var Events;
(function (Events) {
    function drawEventTouch(e) {
        e.preventDefault();
        stroke.push([e.touches[0].pageX, e.touches[0].pageY]);
        if (stroke.length >= 5)
            stroke.splice(0, 1);
        Graphics.update();
    }
    Events.drawEventTouch = drawEventTouch;
    function startDrawTouch(e) {
        e.preventDefault();
        stroke = [[e.touches[0].pageX, e.touches[0].pageY]];
    }
    Events.startDrawTouch = startDrawTouch;
    function endDrawTouch(e) {
        e.preventDefault();
        stroke = [];
        whiteboardHistory.push(canvas.toDataURL());
        if (whiteboardHistory.length > 10)
            whiteboardHistory.shift();
    }
    Events.endDrawTouch = endDrawTouch;
    function drawEventMouse(e) {
        if (e.buttons === 0)
            mouseDrawing = false;
        if (mouseDrawing) {
            stroke.push([e.offsetX, e.offsetY]);
            if (stroke.length >= 5)
                stroke.splice(0, 1);
            Graphics.update();
        }
    }
    Events.drawEventMouse = drawEventMouse;
    function startDrawMouse(e) {
        mouseDrawing = true;
        stroke = [[e.offsetX, e.offsetY]];
    }
    Events.startDrawMouse = startDrawMouse;
    function endDrawMouse(e) {
        if (mouseDrawing) {
            drawEventMouse(e);
            mouseDrawing = false;
            Graphics.update();
            stroke = [];
            whiteboardHistory.push(canvas.toDataURL());
            if (whiteboardHistory.length > 10)
                whiteboardHistory.shift();
        }
    }
    Events.endDrawMouse = endDrawMouse;
})(Events || (Events = {}));
canvas.addEventListener("touchstart", Events.startDrawTouch);
canvas.addEventListener("touchmove", Events.drawEventTouch);
canvas.addEventListener("touchend", Events.endDrawTouch);
canvas.addEventListener("mousedown", Events.startDrawMouse);
canvas.addEventListener("mousemove", Events.drawEventMouse);
canvas.addEventListener("mouseup", Events.endDrawMouse);
canvas.addEventListener("mouseout", Events.endDrawMouse);
