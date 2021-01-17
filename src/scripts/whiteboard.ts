var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var pointerId = -1;
var stroke: number[][] = [];
var whiteboardHistory: string[] = [];

var lineWidth = 5;

ctx.lineWidth = lineWidth;
ctx.lineCap = "round";
ctx.fillStyle = "#1f2324";
ctx.strokeStyle = "#fff";

ctx.fillRect(0, 0, canvas.width, canvas.height);
whiteboardHistory.push(canvas.toDataURL());

namespace Graphics {
  export function update(quality = 10) {
    if (stroke.length < 2) return;

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

  export function exportImage(width = 800, height = 600, quality = 0.5): string {
    let tempCanvas = <HTMLCanvasElement>canvas.cloneNode(true);
    let tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.drawImage(canvas, 0, 0, width, height);

    return tempCanvas.toDataURL("image/jpeg", quality);
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

  export function getCoords(...screenCoords: number[]): number[] {
    return [
      (screenCoords[0] - canvas.getBoundingClientRect().x) * (canvas.width / canvas.getBoundingClientRect().width),
      (screenCoords[1] - canvas.getBoundingClientRect().y) * (canvas.height / canvas.getBoundingClientRect().height)
    ]
  }
}

namespace Events {
  export function handlePointerMove(e: PointerEvent) {
    e.preventDefault();
    if (pointerId === -1 && e.pressure !== 0) pointerId = e.pointerId;
    if (pointerId === e.pointerId) {
      if (e.pointerType === "pen") ctx.lineWidth = lineWidth * e.pressure;
      else ctx.lineWidth = lineWidth;
      stroke.push(Functionality.getCoords(e.pageX, e.pageY));
      if (stroke.length >= 5) stroke.splice(0, 1);
      Graphics.update();
    }
  }

  export function handlePointerUp(e: PointerEvent) {
    e.preventDefault();
    if (pointerId === e.pointerId) {
      pointerId = -1;
      stroke = [];
      whiteboardHistory.push(canvas.toDataURL());
    }
  }
}

canvas.addEventListener("pointermove", Events.handlePointerMove);
canvas.addEventListener("pointerup", Events.handlePointerUp);
canvas.addEventListener("pointerout", Events.handlePointerUp);