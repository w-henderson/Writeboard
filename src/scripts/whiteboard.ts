var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var pointerId = -1;
var stroke: number[][] = [];
var strokes = 0;
var whiteboardHistory: string[] = [];
var historyLocation = 0;

var lineWidth = 10;
var lineWidthMultiplier = 1;
var color = "#ffffff";
var tool = "brush";
var straightLine = false;

var eraserAuto = false;

ctx.lineWidth = lineWidth;
ctx.lineCap = "round";
ctx.fillStyle = "#1f2324";
ctx.strokeStyle = "#ffffff";

ctx.fillRect(0, 0, canvas.width, canvas.height);
whiteboardHistory.push(canvas.toDataURL());

namespace Graphics {
  export function update(quality = 20) {
    if (stroke.length < 2) return;

    let shortenedStroke: number[][];
    if (stroke.length >= 5) shortenedStroke = stroke.slice(stroke.length - 5, stroke.length);
    else shortenedStroke = stroke;

    ctx.beginPath();
    ctx.strokeStyle = tool === "brush" ? color : "#1f2324";
    ctx.moveTo(shortenedStroke[0][0], shortenedStroke[0][1]);

    if (tool === "brush") {
      (<any>ctx).curve(shortenedStroke.flat(), 0.5, quality)
    } else {
      for (let point of shortenedStroke) {
        ctx.arc(point[0], point[1], 60, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.stroke();
  }

  export function replaceWithLine() {
    let imageToDraw = new Image();
    imageToDraw.src = whiteboardHistory[whiteboardHistory.length - 1 - historyLocation];
    imageToDraw.onload = () => {
      ctx.drawImage(imageToDraw, 0, 0);
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      ctx.lineTo(stroke[stroke.length - 1][0], stroke[stroke.length - 1][1]);
      ctx.stroke();

      stroke = [];
      strokes++;
      whiteboardHistory.splice(whiteboardHistory.length - historyLocation);
      historyLocation = 0;
      whiteboardHistory.push(canvas.toDataURL());
    }
  }

  export function exportImage(width = 800, height = 600, quality = 0.5): string {
    let tempCanvas = <HTMLCanvasElement>canvas.cloneNode(true);
    let tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.drawImage(canvas, 0, 0, width, height);

    return tempCanvas.toDataURL("image/jpeg", quality);
  }

  export function addImageToCanvas(dataURL: string) {
    let image = new Image();

    image.onload = () => {
      const scaleFactor = 1.5;
      let [width, height] = [image.naturalWidth * scaleFactor, image.naturalHeight * scaleFactor];
      let aspectRatio = width / height;

      if (width > 1600 || height > 1200) {
        if (aspectRatio > 4 / 3) {
          width = 1600;
          height = 1600 / aspectRatio;
        } else {
          height = 1200;
          width = 1200 * aspectRatio;
        }
      }

      let anchorX = (1600 - width) / 2;
      let anchorY = (1200 - height) / 2;

      ctx.drawImage(image, anchorX, anchorY, width, height);
      whiteboardHistory.splice(whiteboardHistory.length - historyLocation);
      historyLocation = 0;
      whiteboardHistory.push(canvas.toDataURL());
    }

    image.src = dataURL;
  }
}

namespace Functionality {
  export function undo() {
    closeBrushMenu();
    if (whiteboardHistory.length - historyLocation > 1) {
      let imageToDraw = new Image();
      historyLocation++;
      imageToDraw.src = whiteboardHistory[whiteboardHistory.length - 1 - historyLocation];
      imageToDraw.onload = () => { ctx.drawImage(imageToDraw, 0, 0) }
      strokes--;
    }
  }

  export function redo() {
    closeBrushMenu();
    if (historyLocation > 0) {
      let imageToDraw = new Image();
      historyLocation--;
      imageToDraw.src = whiteboardHistory[whiteboardHistory.length - 1 - historyLocation];
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

  export function closeBrushMenu() {
    let extendedBrush: HTMLDivElement = document.querySelector("div.extendedBrush");
    extendedBrush.classList.remove("enlarged");
  }

  export function openBrushMenu() {
    if (tool === "brush") {
      let extendedBrush: HTMLDivElement = document.querySelector("div.extendedBrush");
      if (extendedBrush.classList.contains("enlarged")) extendedBrush.classList.remove("enlarged");
      else extendedBrush.classList.add("enlarged");
    } else {
      tool = "brush";
      document.querySelector("div.toolbar").className = "toolbar brush";
    }
  }

  export function selectEraser() {
    closeBrushMenu();
    tool = "eraser";
    eraserAuto = false;
    document.querySelector("div.toolbar").className = "toolbar eraser";
  }

  export function selectColor() {
    (<HTMLInputElement>document.querySelector("input[type='color']")).click();
  }

  export function updateStrokeStyle() {
    let input = (<HTMLInputElement>document.querySelector("input[type='color']"));
    (<HTMLElement>document.querySelector("#colorIcon")).style.color = input.value;
    color = input.value;
  }

  export function toggleLineWidth() {
    if (lineWidthMultiplier !== 2) lineWidthMultiplier = lineWidthMultiplier * 2;
    else lineWidthMultiplier = 0.5;

    let iconScale = 0.8 + (0.2 * Math.log2(lineWidthMultiplier));
    (<HTMLElement>document.querySelector("#widthIcon")).style.transform = `scale(${iconScale})`;
  }

  export function toggleStraightLine() {
    straightLine = !straightLine;
    (<HTMLElement>document.querySelector("#straightIcon")).style.opacity = straightLine ? "1" : ".2";
  }

  export function forcePaste() {
    closeBrushMenu();
    (<any>navigator.clipboard).read().then((data) => { Events.handlePasteButton(data) });
  }

  export function forceCopy() {
    closeBrushMenu();
    canvas.toBlob((blob) => {
      (<any>navigator.clipboard).write([new ClipboardItem({ [blob.type]: blob })]);
    });
  }

  export function clearBoard() {
    closeBrushMenu();
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
        whiteboardHistory.splice(whiteboardHistory.length - historyLocation);
        historyLocation = 0;
        whiteboardHistory.push(canvas.toDataURL());
      }
    });
  }

  export function placeToolbar() {
    let toolbar: HTMLDivElement = document.querySelector("div.toolbar");
    let colorInput: HTMLInputElement = document.querySelector("input[type='color']");
    let extendedToolbar: HTMLDivElement = document.querySelector("div.extended.extendedBrush");
    let canvasRect = canvas.getBoundingClientRect();

    if (window.matchMedia("(orientation: landscape)").matches && (!Client.Chat.visible || window.innerWidth > window.innerHeight * 1.5)) {
      toolbar.style.top = `${canvasRect.y + 40}px`;
      colorInput.style.top = `${canvasRect.y + 80}px`;
      toolbar.style.left = `${canvasRect.x + canvasRect.width}px`;
      colorInput.style.left = `${canvasRect.x + canvasRect.width}px`;
      toolbar.style.height = "unset";
      toolbar.style.width = "50px";
      toolbar.style.borderRadius = "0 5px 5px 0";
      extendedToolbar.classList.remove("portrait");
    } else {
      toolbar.style.top = `${canvasRect.y + canvasRect.height}px`;
      colorInput.style.top = `${canvasRect.y + canvasRect.height}px`;
      toolbar.style.left = `${canvasRect.x + 30}px`;
      colorInput.style.left = `${canvasRect.x + 80}px`;
      toolbar.style.height = "35px";
      toolbar.style.width = `${canvasRect.width - 60}px`;
      toolbar.style.borderRadius = "0 0 10px 10px";
      toolbar.style.paddingTop = "8px";
      extendedToolbar.classList.add("portrait");
    }

    let main: HTMLDivElement = document.querySelector("div.main");
    canvas.style.maxHeight = `min(1200px, ${main.clientWidth * 0.675}px)`;
  }

  window.addEventListener("load", placeToolbar);
  window.addEventListener("resize", placeToolbar);
}

namespace Events {
  export function handlePointerMove(e: PointerEvent) {
    e.preventDefault();
    if (pointerId === -1 && (e.pressure !== 0 || e.buttons === 1)) pointerId = e.pointerId;
    if (pointerId === e.pointerId) {
      if (!straightLine) Functionality.closeBrushMenu();

      if (e.buttons === 32) {
        tool = "eraser";
        eraserAuto = true;
        document.querySelector("div.toolbar").className = "toolbar eraser";
      } else if (eraserAuto) {
        tool = "brush";
        document.querySelector("div.toolbar").className = "toolbar brush";
      }

      if (e.pointerType === "pen" && navigator.userAgent.indexOf("Firefox") === -1 && e.pressure !== 0) {
        ctx.lineWidth = lineWidth * e.pressure * lineWidthMultiplier;
      } else ctx.lineWidth = lineWidth * lineWidthMultiplier;
      stroke.push(Functionality.getCoords(e.pageX, e.pageY));
      //if (stroke.length >= 5) stroke.splice(0, 1);
      Graphics.update();
    }
  }

  export function handlePointerUp(e: PointerEvent) {
    e.preventDefault();
    if (pointerId === e.pointerId) {
      pointerId = -1;
      if (straightLine && tool === "brush") {
        Graphics.replaceWithLine();
      } else {
        stroke = [];
        strokes++;
        whiteboardHistory.splice(whiteboardHistory.length - historyLocation);
        historyLocation = 0;
        whiteboardHistory.push(canvas.toDataURL());
      }
      Client.analytics.setUserProperties({ inputType: e.pointerType });
    }
  }

  export function handlePasteHotkey(e: ClipboardEvent) {
    let data = e.clipboardData;
    if (!data || !data.items) return;

    let items = data.items;
    const IMAGE_MIME_REGEX = /^image\/(p?jpeg|gif|png)$/i;

    for (let i = 0; i < items.length; i++) {
      if (IMAGE_MIME_REGEX.test(items[i].type)) {
        let fileReader = new FileReader();
        fileReader.onload = (e) => {
          Graphics.addImageToCanvas((<string>e.target.result));
        }
        fileReader.readAsDataURL(items[i].getAsFile());
      }
    }
  }

  export async function handlePasteButton(e) {
    for (let item of e) {
      for (let type of item.types) {
        let blob = await item.getType(type);
        Graphics.addImageToCanvas(URL.createObjectURL(blob));
      }
    }
  }
}

document.onpaste = Events.handlePasteHotkey;
document.oncopy = Functionality.forceCopy;
canvas.onpointermove = Events.handlePointerMove;
canvas.onpointerup = Events.handlePointerUp;
canvas.onpointerout = Events.handlePointerUp;