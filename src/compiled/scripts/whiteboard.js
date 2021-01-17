var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var pointerId = -1;
var stroke = [];
var whiteboardHistory = [];
var lineWidth = 5;
ctx.lineWidth = lineWidth;
ctx.lineCap = "round";
ctx.fillStyle = "#1f2324";
ctx.strokeStyle = "#fff";
ctx.fillRect(0, 0, canvas.width, canvas.height);
whiteboardHistory.push(canvas.toDataURL());
var Graphics;
(function (Graphics) {
    function update(quality) {
        if (quality === void 0) { quality = 10; }
        if (stroke.length < 2)
            return;
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
            whiteboardHistory.pop();
            imageToDraw_1.src = whiteboardHistory[whiteboardHistory.length - 1];
            imageToDraw_1.onload = function () { ctx.drawImage(imageToDraw_1, 0, 0); };
        }
    }
    Functionality.undo = undo;
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
})(Functionality || (Functionality = {}));
var Events;
(function (Events) {
    function handlePointerMove(e) {
        e.preventDefault();
        if (pointerId === -1 && e.pressure !== 0)
            pointerId = e.pointerId;
        if (pointerId === e.pointerId) {
            if (e.pointerType === "pen")
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
            whiteboardHistory.push(canvas.toDataURL());
        }
    }
    Events.handlePointerUp = handlePointerUp;
})(Events || (Events = {}));
canvas.addEventListener("pointermove", Events.handlePointerMove);
canvas.addEventListener("pointerup", Events.handlePointerUp);
canvas.addEventListener("pointerout", Events.handlePointerUp);
