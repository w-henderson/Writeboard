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
})(Graphics || (Graphics = {}));
var Functionality;
(function (Functionality) {
    function undo() {
        if (whiteboardHistory.length > 1) {
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
    function selectColor() {
        if (tool === "brush")
            document.querySelector("input[type='color']").click();
        else {
            tool = "brush";
            document.querySelector("div.toolbar").className = "toolbar brush";
        }
    }
    Functionality.selectColor = selectColor;
    function selectEraser() {
        tool = "eraser";
        eraserAuto = false;
        document.querySelector("div.toolbar").className = "toolbar eraser";
    }
    Functionality.selectEraser = selectEraser;
    function updateStrokeStyle() {
        var input = document.querySelector("input[type='color']");
        document.querySelector("#colorIcon").style.color = input.value;
        color = input.value;
    }
    Functionality.updateStrokeStyle = updateStrokeStyle;
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
                whiteboardHistory.push(canvas.toDataURL());
            }
        });
    }
    Functionality.clearBoard = clearBoard;
    function placeToolbar() {
        var toolbar = document.querySelector("div.toolbar");
        var colorInput = document.querySelector("input[type='color']");
        var canvasRect = canvas.getBoundingClientRect();
        if (window.matchMedia("(orientation: landscape)").matches) {
            toolbar.style.top = canvasRect.y + 40 + "px";
            colorInput.style.top = canvasRect.y + 40 + "px";
            toolbar.style.left = canvasRect.x + canvasRect.width + "px";
            colorInput.style.left = canvasRect.x + canvasRect.width + "px";
            toolbar.style.height = "unset";
            toolbar.style.width = "50px";
            toolbar.style.borderRadius = "0 5px 5px 0";
        }
        else {
            toolbar.style.top = canvasRect.y + canvasRect.height + "px";
            colorInput.style.top = canvasRect.y + canvasRect.height + "px";
            toolbar.style.left = canvasRect.x + 40 + "px";
            colorInput.style.left = canvasRect.x + 40 + "px";
            toolbar.style.height = "35px";
            toolbar.style.width = canvasRect.width - 80 + "px";
            toolbar.style.borderRadius = "0 0 10px 10px";
            toolbar.style.paddingTop = "8px";
        }
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
})(Events || (Events = {}));
canvas.onpointermove = Events.handlePointerMove;
canvas.onpointerup = Events.handlePointerUp;
canvas.onpointerout = Events.handlePointerUp;
