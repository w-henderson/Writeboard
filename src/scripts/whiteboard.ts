var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var mouseDrawing = false;
var stroke: number[][] = [];

var whiteboardHistory: string[] = [];

ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.fillStyle = "#eee";

ctx.fillRect(0, 0, canvas.width, canvas.height);
whiteboardHistory.push(canvas.toDataURL());

namespace Graphics {
  export function update(quality = 10) {
    ctx.beginPath();
    ctx.moveTo(stroke[0][0], stroke[0][1]);

    let smoothed = Smooth.Smooth(stroke, {
      method: Smooth.METHOD_CUBIC,
      clip: Smooth.CLIP_CLAMP
    });

    for (let i = 0; i < stroke.length - 1; i += 1 / quality) {
      let calculatedPoint = smoothed(i);
      ctx.lineTo(calculatedPoint[0], calculatedPoint[1]);
    }

    ctx.stroke();
  }
}

namespace Functionality {
  export function undo() {
    if (whiteboardHistory.length > 1) {
      let imageToDraw = new Image();
      whiteboardHistory.pop();
      imageToDraw.src = whiteboardHistory[whiteboardHistory.length - 1];
      imageToDraw.onload = () => { ctx.drawImage(imageToDraw, 0, 0) }
    }
  }
}

namespace Events {
  export function drawEventTouch(e) {
    e.preventDefault();
    stroke.push([e.touches[0].pageX, e.touches[0].pageY]);
    if (stroke.length >= 5) stroke.splice(0, 1);
    Graphics.update();
  }

  export function startDrawTouch(e) {
    e.preventDefault();
    stroke = [[e.touches[0].pageX, e.touches[0].pageY]];
  }

  export function endDrawTouch(e) {
    e.preventDefault();
    stroke = [];
    whiteboardHistory.push(canvas.toDataURL());
    if (whiteboardHistory.length > 10) whiteboardHistory.shift();
  }

  export function drawEventMouse(e) {
    if (e.buttons === 0) mouseDrawing = false;

    if (mouseDrawing) {
      stroke.push([e.offsetX, e.offsetY]);
      if (stroke.length >= 5) stroke.splice(0, 1);
      Graphics.update();
    }
  }

  export function startDrawMouse(e) {
    mouseDrawing = true;
    stroke = [[e.offsetX, e.offsetY]];
  }

  export function endDrawMouse(e) {
    if (mouseDrawing) {
      drawEventMouse(e);
      mouseDrawing = false;
      Graphics.update();
      stroke = [];
      whiteboardHistory.push(canvas.toDataURL());
      if (whiteboardHistory.length > 10) whiteboardHistory.shift();
    }
  }
}

canvas.addEventListener("touchstart", Events.startDrawTouch);
canvas.addEventListener("touchmove", Events.drawEventTouch);
canvas.addEventListener("touchend", Events.endDrawTouch);
canvas.addEventListener("mousedown", Events.startDrawMouse);
canvas.addEventListener("mousemove", Events.drawEventMouse);
canvas.addEventListener("mouseup", Events.endDrawMouse);
canvas.addEventListener("mouseout", Events.endDrawMouse);