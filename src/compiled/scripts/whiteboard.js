var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var mouseDrawing = false;
var stroke = [];
var whiteboardHistory = [];
ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.fillStyle = "#1f2324";
ctx.strokeStyle = "#fff";
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
    function drawEventTouch(e) {
        e.preventDefault();
        stroke.push(Functionality.getCoords(e.touches[0].pageX, e.touches[0].pageY));
        if (stroke.length >= 5)
            stroke.splice(0, 1);
        Graphics.update();
    }
    Events.drawEventTouch = drawEventTouch;
    function startDrawTouch(e) {
        e.preventDefault();
        stroke = [Functionality.getCoords(e.touches[0].pageX, e.touches[0].pageY)];
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
