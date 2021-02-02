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
var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var pointerId = -1;
var stroke = [];
var strokes = 0;
var whiteboardHistory = [];
var historyLocation = 0;
var lineWidth = 10;
var color = "#ffffff";
var tool = "brush";
var surfaceMode = true;
var eraserAuto = false;
ctx.lineWidth = lineWidth;
ctx.lineCap = "round";
ctx.fillStyle = "#1f2324";
ctx.strokeStyle = "#ffffff";
ctx.fillRect(0, 0, canvas.width, canvas.height);
whiteboardHistory.push(canvas.toDataURL());
var Graphics;
(function (Graphics) {
    function update(quality) {
        if (quality === void 0) { quality = 20; }
        if (stroke.length < 2)
            return;
        ctx.beginPath();
        ctx.strokeStyle = tool === "brush" ? color : "#1f2324";
        ctx.moveTo(stroke[0][0], stroke[0][1]);
        if (tool === "brush")
            ctx.curve(stroke.flat(), 0.5, quality);
        else {
            for (var _i = 0, stroke_1 = stroke; _i < stroke_1.length; _i++) {
                var point = stroke_1[_i];
                ctx.arc(point[0], point[1], 60, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.stroke();
    }
    Graphics.update = update;
    function exportImage(width, height, quality) {
        if (width === void 0) { width = 800; }
        if (height === void 0) { height = 600; }
        if (quality === void 0) { quality = 0.5; }
        var tempCanvas = canvas.cloneNode(true);
        var tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCtx.drawImage(canvas, 0, 0, width, height);
        return tempCanvas.toDataURL("image/jpeg", quality);
    }
    Graphics.exportImage = exportImage;
    function addImageToCanvas(dataURL) {
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
            ctx.drawImage(image, anchorX, anchorY, width, height);
            whiteboardHistory.splice(whiteboardHistory.length - historyLocation);
            historyLocation = 0;
            whiteboardHistory.push(canvas.toDataURL());
        };
        image.src = dataURL;
    }
    Graphics.addImageToCanvas = addImageToCanvas;
})(Graphics || (Graphics = {}));
var Functionality;
(function (Functionality) {
    function undo() {
        if (whiteboardHistory.length - historyLocation > 1) {
            var imageToDraw_1 = new Image();
            historyLocation++;
            imageToDraw_1.src = whiteboardHistory[whiteboardHistory.length - 1 - historyLocation];
            imageToDraw_1.onload = function () { ctx.drawImage(imageToDraw_1, 0, 0); };
            strokes--;
        }
    }
    Functionality.undo = undo;
    function redo() {
        if (historyLocation > 0) {
            var imageToDraw_2 = new Image();
            historyLocation--;
            imageToDraw_2.src = whiteboardHistory[whiteboardHistory.length - 1 - historyLocation];
            imageToDraw_2.onload = function () { ctx.drawImage(imageToDraw_2, 0, 0); };
            strokes--;
        }
    }
    Functionality.redo = redo;
    function getCoords() {
        var screenCoords = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            screenCoords[_i] = arguments[_i];
        }
        return [
            (screenCoords[0] - canvas.getBoundingClientRect().x) * (canvas.width / canvas.getBoundingClientRect().width),
            (screenCoords[1] - canvas.getBoundingClientRect().y) * (canvas.height / canvas.getBoundingClientRect().height)
        ];
    }
    Functionality.getCoords = getCoords;
    function openBrushMenu() {
        if (tool === "brush") {
            var extendedBrush = document.querySelector("div.extendedBrush");
            extendedBrush.className = extendedBrush.classList.contains("enlarged") ? "extended extendedBrush" : "extended extendedBrush enlarged";
        }
        else {
            tool = "brush";
            document.querySelector("div.toolbar").className = "toolbar brush";
        }
    }
    Functionality.openBrushMenu = openBrushMenu;
    function selectEraser() {
        tool = "eraser";
        eraserAuto = false;
        document.querySelector("div.toolbar").className = "toolbar eraser";
    }
    Functionality.selectEraser = selectEraser;
    function selectColor() {
        document.querySelector("input[type='color']").click();
    }
    Functionality.selectColor = selectColor;
    function updateStrokeStyle() {
        var input = document.querySelector("input[type='color']");
        document.querySelector("#colorIcon").style.color = input.value;
        color = input.value;
    }
    Functionality.updateStrokeStyle = updateStrokeStyle;
    function forcePaste() {
        navigator.clipboard.read().then(function (data) { Events.handlePasteButton(data); });
    }
    Functionality.forcePaste = forcePaste;
    function forceCopy() {
        canvas.toBlob(function (blob) {
            var _a;
            navigator.clipboard.write([new ClipboardItem((_a = {}, _a[blob.type] = blob, _a))]);
        });
    }
    Functionality.forceCopy = forceCopy;
    function clearBoard() {
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
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                strokes = 0;
                whiteboardHistory.splice(whiteboardHistory.length - historyLocation);
                historyLocation = 0;
                whiteboardHistory.push(canvas.toDataURL());
            }
        });
    }
    Functionality.clearBoard = clearBoard;
    function placeToolbar() {
        var toolbar = document.querySelector("div.toolbar");
        var colorInput = document.querySelector("input[type='color']");
        var canvasRect = canvas.getBoundingClientRect();
        if (window.matchMedia("(orientation: landscape)").matches && (!Client.Chat.visible || window.innerWidth > window.innerHeight * 1.5)) {
            toolbar.style.top = canvasRect.y + 40 + "px";
            colorInput.style.top = canvasRect.y + 80 + "px";
            toolbar.style.left = canvasRect.x + canvasRect.width + "px";
            colorInput.style.left = canvasRect.x + canvasRect.width + "px";
            toolbar.style.height = "unset";
            toolbar.style.width = "50px";
            toolbar.style.borderRadius = "0 5px 5px 0";
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
        }
        var main = document.querySelector("div.main");
        canvas.style.maxHeight = "min(1200px, " + main.clientWidth * 0.675 + "px)";
    }
    Functionality.placeToolbar = placeToolbar;
    window.addEventListener("load", placeToolbar);
    window.addEventListener("resize", placeToolbar);
})(Functionality || (Functionality = {}));
var Events;
(function (Events) {
    function handlePointerMove(e) {
        e.preventDefault();
        if (pointerId === -1 && (e.pressure !== 0 || e.buttons === 1))
            pointerId = e.pointerId;
        if (pointerId === e.pointerId) {
            if (surfaceMode) {
                if (e.buttons === 32) {
                    tool = "eraser";
                    eraserAuto = true;
                    document.querySelector("div.toolbar").className = "toolbar eraser";
                }
                else if (eraserAuto) {
                    tool = "brush";
                    document.querySelector("div.toolbar").className = "toolbar brush";
                }
            }
            if (e.pointerType === "pen" && navigator.userAgent.indexOf("Firefox") === -1 && e.pressure !== 0)
                ctx.lineWidth = lineWidth * e.pressure;
            else
                ctx.lineWidth = lineWidth;
            stroke.push(Functionality.getCoords(e.pageX, e.pageY));
            if (stroke.length >= 5)
                stroke.splice(0, 1);
            Graphics.update();
        }
    }
    Events.handlePointerMove = handlePointerMove;
    function handlePointerUp(e) {
        e.preventDefault();
        if (pointerId === e.pointerId) {
            pointerId = -1;
            stroke = [];
            strokes++;
            whiteboardHistory.splice(whiteboardHistory.length - historyLocation);
            historyLocation = 0;
            whiteboardHistory.push(canvas.toDataURL());
            Client.analytics.setUserProperties({ inputType: e.pointerType });
        }
    }
    Events.handlePointerUp = handlePointerUp;
    function handlePasteHotkey(e) {
        var data = e.clipboardData;
        if (!data || !data.items)
            return;
        var items = data.items;
        var IMAGE_MIME_REGEX = /^image\/(p?jpeg|gif|png)$/i;
        for (var i = 0; i < items.length; i++) {
            if (IMAGE_MIME_REGEX.test(items[i].type)) {
                var fileReader = new FileReader();
                fileReader.onload = function (e) {
                    Graphics.addImageToCanvas(e.target.result);
                };
                fileReader.readAsDataURL(items[i].getAsFile());
            }
        }
    }
    Events.handlePasteHotkey = handlePasteHotkey;
    function handlePasteButton(e) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, e_1, item, _a, _b, type, blob;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _i = 0, e_1 = e;
                        _c.label = 1;
                    case 1:
                        if (!(_i < e_1.length)) return [3 /*break*/, 6];
                        item = e_1[_i];
                        _a = 0, _b = item.types;
                        _c.label = 2;
                    case 2:
                        if (!(_a < _b.length)) return [3 /*break*/, 5];
                        type = _b[_a];
                        return [4 /*yield*/, item.getType(type)];
                    case 3:
                        blob = _c.sent();
                        Graphics.addImageToCanvas(URL.createObjectURL(blob));
                        _c.label = 4;
                    case 4:
                        _a++;
                        return [3 /*break*/, 2];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }
    Events.handlePasteButton = handlePasteButton;
})(Events || (Events = {}));
document.onpaste = Events.handlePasteHotkey;
document.oncopy = Functionality.forceCopy;
canvas.onpointermove = Events.handlePointerMove;
canvas.onpointerup = Events.handlePointerUp;
canvas.onpointerout = Events.handlePointerUp;
