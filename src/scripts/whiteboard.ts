var Swal;

class WhiteboardHistory {
  limit: number;
  items: string[];
  strokes: number;
  location: number;
  context: CanvasRenderingContext2D;
  ui: ClientUI;

  constructor() {
    this.limit = 10;
    this.items = [];
    this.strokes = 0;
    this.location = 0;
  }

  linkCtx(context: CanvasRenderingContext2D, ui: ClientUI) {
    this.context = context;
    this.ui = ui;

    this.items.push(this.context.canvas.toDataURL());
  }

  push(...items: string[]) {
    this.strokes++;
    this.items.splice(this.items.length - this.location);
    this.location = 0;
    this.items.push(...items);
  }

  undo() {
    this.ui.closeBrushMenu();
    if (this.items.length - this.location > 1) {
      let imageToDraw = new Image();
      this.location++;
      imageToDraw.src = this.items[this.items.length - 1 - this.location];
      imageToDraw.onload = () => { this.context.drawImage(imageToDraw, 0, 0) }
      this.strokes--;
    }
  }

  redo() {
    this.ui.closeBrushMenu();
    if (this.location > 0) {
      let imageToDraw = new Image();
      this.location--;
      imageToDraw.src = this.items[this.items.length - 1 - this.location];
      imageToDraw.onload = () => { this.context.drawImage(imageToDraw, 0, 0) }
      this.strokes--;
    }
  }
}

class Graphics {
  context: CanvasRenderingContext2D;
  history: WhiteboardHistory;
  lineWidth: number;
  lineWidthMultiplier: number;
  color: string;
  tool: string;
  straightLine: boolean;
  eraserAuto: boolean;

  constructor(context: CanvasRenderingContext2D, history: WhiteboardHistory) {
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

  update(stroke: number[][], quality: number = 20) {
    if (stroke.length < 2) return;

    let shortenedStroke: number[][];
    if (stroke.length >= 5) shortenedStroke = stroke.slice(stroke.length - 5, stroke.length);
    else shortenedStroke = stroke;

    this.context.beginPath();
    this.context.strokeStyle = this.tool === "brush" ? this.color : "#1f2324";
    this.context.moveTo(shortenedStroke[0][0], shortenedStroke[0][1]);

    if (this.tool === "brush") {
      (<any>this.context).curve(shortenedStroke.flat(), 0.5, quality)
    } else {
      for (let point of shortenedStroke) {
        this.context.arc(point[0], point[1], 60, 0, Math.PI * 2);
        this.context.fill();
      }
    }
    this.context.stroke();
  }

  replaceWithLine(stroke: number[][]) {
    let imageToDraw = new Image();
    imageToDraw.src = this.history[this.history.items.length - 1 - this.history.location];
    imageToDraw.onload = () => {
      this.context.drawImage(imageToDraw, 0, 0);
      this.context.beginPath();
      this.context.moveTo(stroke[0][0], stroke[0][1]);
      this.context.lineTo(stroke[stroke.length - 1][0], stroke[stroke.length - 1][1]);
      this.context.stroke();

      this.history.push(this.context.canvas.toDataURL());
    }
  }

  exportImage(width: number = 800, height: number = 600, quality: number = 0.5): string {
    let tempCanvas = <HTMLCanvasElement>this.context.canvas.cloneNode(true);
    let tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.drawImage(this.context.canvas, 0, 0, width, height);

    return tempCanvas.toDataURL("image/jpeg", quality);
  }

  addImageToCanvas(dataURL: string) {
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

      this.context.drawImage(image, anchorX, anchorY, width, height);
      this.history.push(this.context.canvas.toDataURL());
    }

    image.src = dataURL;
  }
}

class ClientUI {
  graphics: Graphics;
  chat: Chat;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
    this.graphics.history.ui = this;
  }

  linkChat(chat: Chat) {
    this.chat = chat;
  }

  closeBrushMenu() {
    let extendedBrush: HTMLDivElement = document.querySelector("div.extendedBrush");
    extendedBrush.classList.remove("enlarged");
  }

  openBrushMenu() {
    if (this.graphics.tool === "brush") {
      let extendedBrush: HTMLDivElement = document.querySelector("div.extendedBrush");
      if (extendedBrush.classList.contains("enlarged")) extendedBrush.classList.remove("enlarged");
      else extendedBrush.classList.add("enlarged");
    } else {
      this.graphics.tool = "brush";
      document.querySelector("div.toolbar").className = "toolbar brush";
    }
  }

  placeToolbar() {
    let toolbar: HTMLDivElement = document.querySelector("div.toolbar");
    let colorInput: HTMLInputElement = document.querySelector("input[type='color']");
    let extendedToolbar: HTMLDivElement = document.querySelector("div.extended.extendedBrush");
    let canvasRect = this.graphics.context.canvas.getBoundingClientRect();

    if (window.matchMedia("(orientation: landscape)").matches && (!this.chat.visible || window.innerWidth > window.innerHeight * 1.5)) {
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
    this.graphics.context.canvas.style.maxHeight = `min(1200px, ${main.clientWidth * 0.675}px)`;
  }
}

class Tools {
  graphics: Graphics;
  history: WhiteboardHistory;
  ui: ClientUI;

  constructor(graphics: Graphics, history: WhiteboardHistory, ui: ClientUI) {
    this.graphics = graphics;
    this.history = history;
    this.ui = ui;
  }

  selectEraser() {
    this.ui.closeBrushMenu();
    this.graphics.tool = "eraser";
    this.graphics.eraserAuto = false;
    document.querySelector("div.toolbar").className = "toolbar eraser";
  }

  selectColor() {
    (<HTMLInputElement>document.querySelector("input[type='color']")).click();
  }

  updateStrokeStyle() {
    let input = (<HTMLInputElement>document.querySelector("input[type='color']"));
    (<HTMLElement>document.querySelector("#colorIcon")).style.color = input.value;
    this.graphics.color = input.value;
  }

  toggleLineWidth() {
    if (this.graphics.lineWidthMultiplier !== 2) this.graphics.lineWidthMultiplier = this.graphics.lineWidthMultiplier * 2;
    else this.graphics.lineWidthMultiplier = 0.5;

    let iconScale = 0.8 + (0.2 * Math.log2(this.graphics.lineWidthMultiplier));
    (<HTMLElement>document.querySelector("#widthIcon")).style.transform = `scale(${iconScale})`;
  }

  toggleStraightLine() {
    this.graphics.straightLine = !this.graphics.straightLine;
    (<HTMLElement>document.querySelector("#straightIcon")).style.opacity = this.graphics.straightLine ? "1" : ".2";
  }

  clearBoard() {
    this.ui.closeBrushMenu();
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
        this.graphics.context.fillRect(0, 0, this.graphics.context.canvas.width, this.graphics.context.canvas.height);

        this.history.strokes = 0;
        this.history.push(this.graphics.context.canvas.toDataURL());
      }
    });
  }
}

class Events {
  graphics: Graphics;
  ui: ClientUI;
  stroke: number[][];
  pointerId: number;

  constructor(graphics: Graphics, ui: ClientUI) {
    this.graphics = graphics;
    this.stroke = [];
    this.pointerId = -1;
    this.ui = ui;
  }

  forcePaste() {
    this.ui.closeBrushMenu();
    (<any>navigator.clipboard).read().then((data) => { this.handlePasteButton(data) });
  }

  forceCopy() {
    this.ui.closeBrushMenu();
    this.graphics.context.canvas.toBlob((blob) => {
      (<any>navigator.clipboard).write([new ClipboardItem({ [blob.type]: blob })]);
    });
  }

  getCoords(...screenCoords: number[]): number[] {
    return [
      (screenCoords[0] - this.graphics.context.canvas.getBoundingClientRect().x) * (this.graphics.context.canvas.width / this.graphics.context.canvas.getBoundingClientRect().width),
      (screenCoords[1] - this.graphics.context.canvas.getBoundingClientRect().y) * (this.graphics.context.canvas.height / this.graphics.context.canvas.getBoundingClientRect().height)
    ]
  }

  handlePointerMove(e: PointerEvent) {
    e.preventDefault();
    if (this.pointerId === -1 && (e.pressure !== 0 || e.buttons === 1)) this.pointerId = e.pointerId;
    if (this.pointerId === e.pointerId) {
      if (!this.graphics.straightLine) this.ui.closeBrushMenu();

      if (e.buttons === 32) {
        this.graphics.tool = "eraser";
        this.graphics.eraserAuto = true;
        document.querySelector("div.toolbar").className = "toolbar eraser";
      } else if (this.graphics.eraserAuto) {
        this.graphics.tool = "brush";
        document.querySelector("div.toolbar").className = "toolbar brush";
      }

      if (e.pointerType === "pen" && navigator.userAgent.indexOf("Firefox") === -1 && e.pressure !== 0) {
        this.graphics.context.lineWidth = this.graphics.lineWidth * e.pressure * this.graphics.lineWidthMultiplier;
      } else this.graphics.context.lineWidth = this.graphics.lineWidth * this.graphics.lineWidthMultiplier;
      this.stroke.push(this.getCoords(e.pageX, e.pageY));
      //if (stroke.length >= 5) stroke.splice(0, 1);
      this.graphics.update(this.stroke);
    }
  }

  handlePointerUp(e: PointerEvent) {
    e.preventDefault();
    if (this.pointerId === e.pointerId) {
      this.pointerId = -1;
      if (this.graphics.straightLine && this.graphics.tool === "brush") {
        this.graphics.replaceWithLine(this.stroke);
        this.stroke = [];
      } else {
        this.stroke = [];
        this.graphics.history.push(this.graphics.context.canvas.toDataURL());
      }
      wb.CLIENT.analytics.setUserProperties({ inputType: e.pointerType });
    }
  }

  handlePasteHotkey(e: ClipboardEvent) {
    let data = e.clipboardData;
    if (!data || !data.items) return;

    let items = data.items;
    const IMAGE_MIME_REGEX = /^image\/(p?jpeg|gif|png)$/i;

    for (let i = 0; i < items.length; i++) {
      if (IMAGE_MIME_REGEX.test(items[i].type)) {
        let fileReader = new FileReader();
        fileReader.onload = (e) => {
          this.graphics.addImageToCanvas((<string>e.target.result));
        }
        fileReader.readAsDataURL(items[i].getAsFile());
      }
    }
  }

  async handlePasteButton(e) {
    for (let item of e) {
      for (let type of item.types) {
        let blob = await item.getType(type);
        this.graphics.addImageToCanvas(URL.createObjectURL(blob));
      }
    }
  }
}