var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var pointerId = -1;
var stroke: number[][] = [];
var strokes = 0;
var whiteboardHistory: string[] = [];

var lineWidth = 5;
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

namespace Graphics {
  export function update(quality = 10) {
    if (stroke.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = tool === "brush" ? color : "#1f2324";
    if (tool === "eraser") ctx.lineWidth = 40;
    ctx.moveTo(stroke[0][0], stroke[0][1]);

    let smoothed = Smooth.Smooth(stroke, {
      method: tool === "brush" ? Smooth.METHOD_CUBIC : Smooth.METHOD_LINEAR,
      clip: Smooth.CLIP_CLAMP,
      cubicTension: 0
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
      strokes--;
    }
  }

  export function getCoords(...screenCoords: number[]): number[] {
    return [
      (screenCoords[0] - canvas.getBoundingClientRect().x) * (canvas.width / canvas.getBoundingClientRect().width),
      (screenCoords[1] - canvas.getBoundingClientRect().y) * (canvas.height / canvas.getBoundingClientRect().height)
    ]
  }

  export function selectColor() {
    if (tool === "brush") (<HTMLInputElement>document.querySelector("input[type='color']")).click();
    else {
      tool = "brush";
      document.querySelector("div.toolbar").className = "toolbar brush";
    }
  }

  export function selectEraser() {
    tool = "eraser";
    eraserAuto = false;
    document.querySelector("div.toolbar").className = "toolbar eraser";
  }

  export function updateStrokeStyle() {
    let input = (<HTMLInputElement>document.querySelector("input[type='color']"));
    (<HTMLElement>document.querySelector("#colorIcon")).style.color = input.value;
    color = input.value;
  }

  export function clearBoard() {
    Swal.fire({
      icon: "question",
      title: "Are you sure you want to clear your board?",
      text: "This cannot be undone.",
      showDenyButton: true,
      confirmButtonText: `Clear`,
      denyButtonText: `Don't clear`,
      background: "var(--background)"
    }).then((result) => {
      if (result.isConfirmed) {
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        strokes = 0;
      }
    });
  }

  export function placeToolbar() {
    let toolbar = <HTMLDivElement>document.querySelector("div.toolbar");
    let colorInput = <HTMLInputElement>document.querySelector("input[type='color']");
    let canvasRect = canvas.getBoundingClientRect();

    if (window.matchMedia("(orientation: landscape)").matches) {
      toolbar.style.top = `${canvasRect.y + 40}px`;
      colorInput.style.top = `${canvasRect.y + 40}px`;
      toolbar.style.left = `${canvasRect.x + canvasRect.width}px`;
      colorInput.style.left = `${canvasRect.x + canvasRect.width}px`;
      toolbar.style.height = "unset";
      toolbar.style.width = "50px";
      toolbar.style.borderRadius = "0 5px 5px 0";
    } else {
      toolbar.style.top = `${canvasRect.y + canvasRect.height}px`;
      colorInput.style.top = `${canvasRect.y + canvasRect.height}px`;
      toolbar.style.left = `${canvasRect.x + 40}px`;
      colorInput.style.left = `${canvasRect.x + 40}px`;
      toolbar.style.height = "35px";
      toolbar.style.width = `${canvasRect.width - 80}px`;
      toolbar.style.borderRadius = "0 0 10px 10px";
      toolbar.style.paddingTop = "8px";
    }
  }

  window.addEventListener("load", placeToolbar);
  window.addEventListener("resize", placeToolbar);
}

namespace Events {
  export function handlePointerMove(e: PointerEvent) {
    e.preventDefault();
    if (pointerId === -1 && e.pressure !== 0) pointerId = e.pointerId;
    if (pointerId === e.pointerId) {
      if (surfaceMode) {
        if (e.buttons === 32) {
          tool = "eraser";
          eraserAuto = true;
          document.querySelector("div.toolbar").className = "toolbar eraser";
        } else if (eraserAuto) {
          tool = "brush";
          document.querySelector("div.toolbar").className = "toolbar brush";
        }
      }

      if (e.pointerType === "pen" && navigator.userAgent.indexOf("Firefox") === -1) ctx.lineWidth = lineWidth * e.pressure;
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
      strokes++;
      whiteboardHistory.push(canvas.toDataURL());
      Client.analytics.setUserProperties({ inputType: e.pointerType })
    }
  }
}

canvas.addEventListener("pointermove", Events.handlePointerMove);
canvas.addEventListener("pointerup", Events.handlePointerUp);
canvas.addEventListener("pointerout", Events.handlePointerUp);