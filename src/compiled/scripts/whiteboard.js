var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var Swal;
var WhiteboardHistory = (function () {
    function WhiteboardHistory() {
        this.limit = 20;
        this.items = [];
        this.strokes = 0;
        this.location = 0;
    }
    WhiteboardHistory.prototype.linkCtx = function (context, ui) {
        this.context = context;
        this.ui = ui;
        this.items.push(this.context.canvas.toDataURL());
    };
    WhiteboardHistory.prototype.push = function () {
        var _a;
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        this.strokes++;
        this.items.splice(this.items.length - this.location);
        this.location = 0;
        (_a = this.items).push.apply(_a, items);
        if (this.items.length > this.limit)
            this.items.splice(0, this.items.length - this.limit);
    };
    WhiteboardHistory.prototype.undo = function () {
        var _this = this;
        this.ui.closeBrushMenu();
        if (this.items.length - this.location > 1) {
            var imageToDraw_1 = new Image();
            this.location++;
            imageToDraw_1.src = this.items[this.items.length - 1 - this.location];
            imageToDraw_1.onload = function () { _this.context.drawImage(imageToDraw_1, 0, 0); };
            this.strokes--;
        }
    };
    WhiteboardHistory.prototype.redo = function () {
        var _this = this;
        this.ui.closeBrushMenu();
        if (this.location > 0) {
            var imageToDraw_2 = new Image();
            this.location--;
            imageToDraw_2.src = this.items[this.items.length - 1 - this.location];
            imageToDraw_2.onload = function () { _this.context.drawImage(imageToDraw_2, 0, 0); };
            this.strokes--;
        }
    };
    return WhiteboardHistory;
}());
var Graphics = (function () {
    function Graphics(context, history) {
        this.context = context;
        this.history = history;
        this.lineWidth = 10;
        this.lineWidthMultiplier = 1;
        this.color = "#ffffff";
        this.tool = "brush";
        this.straightLine = false;
        this.eraserAuto = false;
        this.context.lineWidth = this.lineWidth;
        this.context.lineCap = "round";
        this.context.fillStyle = "#1f2324";
        this.context.strokeStyle = "#ffffff";
        this.context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }
    Graphics.prototype.update = function (stroke, quality) {
        if (quality === void 0) { quality = 20; }
        if (stroke.length < 2)
            return;
        var shortenedStroke;
        if (stroke.length >= 5)
            shortenedStroke = stroke.slice(stroke.length - 5, stroke.length);
        else
            shortenedStroke = stroke;
        this.context.beginPath();
        this.context.strokeStyle = this.tool === "brush" ? this.color : "#1f2324";
        this.context.moveTo(shortenedStroke[0][0], shortenedStroke[0][1]);
        if (this.tool === "brush") {
            this.context.curve(shortenedStroke.flat(), 0.5, quality);
        }
        else {
            for (var _i = 0, shortenedStroke_1 = shortenedStroke; _i < shortenedStroke_1.length; _i++) {
                var point = shortenedStroke_1[_i];
                this.context.arc(point[0], point[1], 60, 0, Math.PI * 2);
                this.context.fill();
            }
        }
        this.context.stroke();
    };
    Graphics.prototype.replaceWithLine = function (stroke) {
        var _this = this;
        var imageToDraw = new Image();
        imageToDraw.src = this.history[this.history.items.length - 1 - this.history.location];
        imageToDraw.onload = function () {
            _this.context.drawImage(imageToDraw, 0, 0);
            _this.context.beginPath();
            _this.context.moveTo(stroke[0][0], stroke[0][1]);
            _this.context.lineTo(stroke[stroke.length - 1][0], stroke[stroke.length - 1][1]);
            _this.context.stroke();
            _this.history.push(_this.context.canvas.toDataURL());
        };
    };
    Graphics.prototype.exportImage = function (width, height, quality) {
        if (width === void 0) { width = 800; }
        if (height === void 0) { height = 600; }
        if (quality === void 0) { quality = 0.5; }
        var tempCanvas = this.context.canvas.cloneNode(true);
        var tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCtx.drawImage(this.context.canvas, 0, 0, width, height);
        return tempCanvas.toDataURL("image/jpeg", quality);
    };
    Graphics.prototype.addImageToCanvas = function (dataURL) {
        var _this = this;
        var image = new Image();
        image.onload = function () {
            var scaleFactor = 1.5;
            var _a = [image.naturalWidth * scaleFactor, image.naturalHeight * scaleFactor], width = _a[0], height = _a[1];
            var aspectRatio = width / height;
            if (width > 1600 || height > 1200) {
                if (aspectRatio > 4 / 3) {
                    width = 1600;
                    height = 1600 / aspectRatio;
                }
                else {
                    height = 1200;
                    width = 1200 * aspectRatio;
                }
            }
            var anchorX = (1600 - width) / 2;
            var anchorY = (1200 - height) / 2;
            _this.context.drawImage(image, anchorX, anchorY, width, height);
            _this.history.push(_this.context.canvas.toDataURL());
        };
        image.src = dataURL;
    };
    return Graphics;
}());
var ClientUI = (function () {
    function ClientUI(graphics) {
        this.graphics = graphics;
        this.graphics.history.ui = this;
    }
    ClientUI.prototype.linkChat = function (chat) {
        this.chat = chat;
    };
    ClientUI.prototype.openBrushMenu = function () {
        if (this.graphics.tool === "brush") {
            var extendedBrush = document.querySelector("div.extendedBrush");
            if (extendedBrush.classList.contains("enlarged"))
                extendedBrush.classList.remove("enlarged");
            else
                extendedBrush.classList.add("enlarged");
        }
        else {
            this.graphics.tool = "brush";
            document.querySelector("div.toolbar").className = "toolbar brush";
        }
    };
    ClientUI.prototype.closeBrushMenu = function () {
        var extendedBrush = document.querySelector("div.extendedBrush");
        extendedBrush.classList.remove("enlarged");
    };
    ClientUI.prototype.placeToolbar = function () {
        var toolbar = document.querySelector("div.toolbar");
        var colorInput = document.querySelector("input[type='color']");
        var extendedToolbar = document.querySelector("div.extended.extendedBrush");
        var canvasRect = this.graphics.context.canvas.getBoundingClientRect();
        if (window.matchMedia("(orientation: landscape)").matches && (!this.chat.visible || window.innerWidth > window.innerHeight * 1.5)) {
            toolbar.style.top = canvasRect.y + 40 + "px";
            colorInput.style.top = canvasRect.y + 80 + "px";
            toolbar.style.left = canvasRect.x + canvasRect.width + "px";
            colorInput.style.left = canvasRect.x + canvasRect.width + "px";
            toolbar.style.height = "unset";
            toolbar.style.width = "50px";
            toolbar.style.borderRadius = "0 5px 5px 0";
            extendedToolbar.classList.remove("portrait");
        }
        else {
            toolbar.style.top = canvasRect.y + canvasRect.height + "px";
            colorInput.style.top = canvasRect.y + canvasRect.height + "px";
            toolbar.style.left = canvasRect.x + 30 + "px";
            colorInput.style.left = canvasRect.x + 80 + "px";
            toolbar.style.height = "35px";
            toolbar.style.width = canvasRect.width - 60 + "px";
            toolbar.style.borderRadius = "0 0 10px 10px";
            toolbar.style.paddingTop = "8px";
            extendedToolbar.classList.add("portrait");
        }
        var main = document.querySelector("div.main");
        this.graphics.context.canvas.style.maxHeight = "min(1200px, " + main.clientWidth * 0.675 + "px)";
    };
    return ClientUI;
}());
var Tools = (function () {
    function Tools(graphics, history, ui) {
        this.graphics = graphics;
        this.history = history;
        this.ui = ui;
    }
    Tools.prototype.selectEraser = function () {
        this.ui.closeBrushMenu();
        this.graphics.tool = "eraser";
        this.graphics.eraserAuto = false;
        document.querySelector("div.toolbar").className = "toolbar eraser";
    };
    Tools.prototype.selectColor = function () {
        document.querySelector("input[type='color']").click();
    };
    Tools.prototype.updateStrokeStyle = function () {
        var input = document.querySelector("input[type='color']");
        document.querySelector("#colorIcon").style.color = input.value;
        this.graphics.color = input.value;
    };
    Tools.prototype.toggleLineWidth = function () {
        if (this.graphics.lineWidthMultiplier !== 2)
            this.graphics.lineWidthMultiplier = this.graphics.lineWidthMultiplier * 2;
        else
            this.graphics.lineWidthMultiplier = 0.5;
        var iconScale = 0.8 + (0.2 * Math.log2(this.graphics.lineWidthMultiplier));
        document.querySelector("#widthIcon").style.transform = "scale(" + iconScale + ")";
    };
    Tools.prototype.toggleStraightLine = function () {
        this.graphics.straightLine = !this.graphics.straightLine;
        document.querySelector("#straightIcon").style.opacity = this.graphics.straightLine ? "1" : ".2";
    };
    Tools.prototype.clearBoard = function () {
        var _this = this;
        this.ui.closeBrushMenu();
        Swal.fire({
            icon: "question",
            title: "Are you sure you want to clear your board?",
            text: "This cannot be undone.",
            showDenyButton: true,
            confirmButtonText: "Clear",
            denyButtonText: "Don't clear",
            background: "var(--background)"
        }).then(function (result) {
            if (result.isConfirmed) {
                _this.graphics.context.fillRect(0, 0, _this.graphics.context.canvas.width, _this.graphics.context.canvas.height);
                _this.history.strokes = 0;
                _this.history.push(_this.graphics.context.canvas.toDataURL());
            }
        });
    };
    return Tools;
}());
var Events = (function () {
    function Events(graphics, ui) {
        this.graphics = graphics;
        this.stroke = [];
        this.pointerId = -1;
        this.ui = ui;
    }
    Events.prototype.forcePaste = function () {
        var _this = this;
        this.ui.closeBrushMenu();
        navigator.clipboard.read().then(function (data) { _this.handlePasteButton(data); });
    };
    Events.prototype.forceCopy = function () {
        this.ui.closeBrushMenu();
        this.graphics.context.canvas.toBlob(function (blob) {
            var _a;
            navigator.clipboard.write([new ClipboardItem((_a = {}, _a[blob.type] = blob, _a))]);
        });
    };
    Events.prototype.getCoords = function () {
        var screenCoords = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            screenCoords[_i] = arguments[_i];
        }
        var canvasRect = this.graphics.context.canvas.getBoundingClientRect();
        return [
            (screenCoords[0] - canvasRect.x) * (this.graphics.context.canvas.width / canvasRect.width),
            (screenCoords[1] - canvasRect.y) * (this.graphics.context.canvas.height / canvasRect.height)
        ];
    };
    Events.prototype.handlePointerMove = function (e) {
        e.preventDefault();
        if (this.pointerId === -1 && (e.pressure !== 0 || e.buttons === 1))
            this.pointerId = e.pointerId;
        if (this.pointerId === e.pointerId) {
            if (!this.graphics.straightLine)
                this.ui.closeBrushMenu();
            if (e.buttons === 32) {
                this.graphics.tool = "eraser";
                this.graphics.eraserAuto = true;
                document.querySelector("div.toolbar").className = "toolbar eraser";
            }
            else if (this.graphics.eraserAuto) {
                this.graphics.tool = "brush";
                document.querySelector("div.toolbar").className = "toolbar brush";
            }
            if (e.pointerType === "pen" && navigator.userAgent.indexOf("Firefox") === -1 && e.pressure !== 0) {
                this.graphics.context.lineWidth = this.graphics.lineWidth * e.pressure * this.graphics.lineWidthMultiplier;
            }
            else
                this.graphics.context.lineWidth = this.graphics.lineWidth * this.graphics.lineWidthMultiplier;
            this.stroke.push(this.getCoords(e.pageX, e.pageY));
            this.graphics.update(this.stroke);
        }
    };
    Events.prototype.handlePointerUp = function (e) {
        e.preventDefault();
        if (this.pointerId === e.pointerId) {
            this.pointerId = -1;
            if (this.graphics.straightLine && this.graphics.tool === "brush") {
                this.graphics.replaceWithLine(this.stroke);
                this.stroke = [];
            }
            else {
                this.stroke = [];
                this.graphics.history.push(this.graphics.context.canvas.toDataURL());
            }
            _wb.CLIENT.analytics.setUserProperties({ inputType: e.pointerType });
        }
    };
    Events.prototype.handlePasteHotkey = function (e) {
        var _this = this;
        var data = e.clipboardData;
        if (!data || !data.items)
            return;
        var items = data.items;
        var IMAGE_MIME_REGEX = /^image\/(p?jpeg|gif|png)$/i;
        for (var i = 0; i < items.length; i++) {
            if (IMAGE_MIME_REGEX.test(items[i].type)) {
                var fileReader = new FileReader();
                fileReader.onload = function (e) {
                    _this.graphics.addImageToCanvas(e.target.result);
                };
                fileReader.readAsDataURL(items[i].getAsFile());
            }
        }
    };
    Events.prototype.handlePasteButton = function (e) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, e_1, item, _a, _b, type, blob;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _i = 0, e_1 = e;
                        _c.label = 1;
                    case 1:
                        if (!(_i < e_1.length)) return [3, 6];
                        item = e_1[_i];
                        _a = 0, _b = item.types;
                        _c.label = 2;
                    case 2:
                        if (!(_a < _b.length)) return [3, 5];
                        type = _b[_a];
                        return [4, item.getType(type)];
                    case 3:
                        blob = _c.sent();
                        this.graphics.addImageToCanvas(URL.createObjectURL(blob));
                        _c.label = 4;
                    case 4:
                        _a++;
                        return [3, 2];
                    case 5:
                        _i++;
                        return [3, 1];
                    case 6: return [2];
                }
            });
        });
    };
    return Events;
}());
