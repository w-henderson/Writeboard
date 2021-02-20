var Swal;

/**
 * Class for managing history operations. This includes undo, redo, and push to history.
 * It also counts how many strokes have been made in order to optimise how often the server is sent the board state.
 */
class WhiteboardHistory {
  limit: number;
  items: string[];
  strokes: number;
  location: number;
  context: CanvasRenderingContext2D;
  ui: ClientUI;

  constructor() {
    this.limit = 20;
    this.items = [];
    this.strokes = 0;
    this.location = 0;
  }

  /** Link the canvas context and UI to the history because the history object must be instantiated first. */
  linkCtx(context: CanvasRenderingContext2D, ui: ClientUI) {
    this.context = context;
    this.ui = ui;

    this.items.push(this.context.canvas.toDataURL());
  }

  /** Add a new item to the history and override any redone operations. */
  push(...items: string[]) {
    this.strokes++;
    this.items.splice(this.items.length - this.location);
    this.location = 0;
    this.items.push(...items);
    if (this.items.length > this.limit) this.items.splice(0, this.items.length - this.limit);
  }

  /** Step back one stage in history without changing it. */
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

  /** Step forward one stage in history without changing it. */
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

/**
 * Class for managing all things graphical, including rendering and pen graphics.
 * Constructed by linking the graphical context and the history.
 * 
 * @param {CanvasRenderingContext2D} context - The graphical context to update and read
 * @param {WhiteboardHistory} history - The history to update every time a change is made
 */
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

  /** Adds a stroke to the board at the given quality. */
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

  /** 
   * Replaces the preview line stroke with a perfectly straight line between the start and end.
   * Updates the history to forget the preview line.
   */
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

  /** Exports an image with the given dimensions and compression quality. */
  exportImage(width: number = 800, height: number = 600, quality: number = 0.5): string {
    let tempCanvas = <HTMLCanvasElement>this.context.canvas.cloneNode(true);
    let tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.drawImage(this.context.canvas, 0, 0, width, height);

    return tempCanvas.toDataURL("image/jpeg", quality);
  }

  /** 
   * Adds an image to the canvas, currently only called when an image is pasted in.
   * If the image is too big, automatically scale it to the maximum size that will fit.
   * Currently no way for the user to resize it, although this is a potential future feature.
   */
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

/**
 * Class managing the client UI.
 * This involves managing menu states and some complex dynamic positioning that CSS can't do.
 * Basically, everything that a framework would've done had I seen sense when I started the project and used one.
 * Constructed with the graphics object.
 * 
 * @param {Graphics} graphics - The graphics object
 */
class ClientUI {
  graphics: Graphics;
  chat: Chat;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
    this.graphics.history.ui = this;
  }

  /** Link the chat object which is instantiated after the client UI object. */
  linkChat(chat: Chat) {
    this.chat = chat;
  }

  /** Open the brush menu if the brush is already selected, or simply select the brush. */
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

  /** Close the brush menu. */
  closeBrushMenu() {
    let extendedBrush: HTMLDivElement = document.querySelector("div.extendedBrush");
    extendedBrush.classList.remove("enlarged");
  }

  /**
   * Place the whiteboard toolbar depending on screen size and orientation.
   * This should probably be done with some advanced CSS but it's much easier to do it like this.
   * This also allows for complete customisation and responsivity.
   */
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

/**
 * Class to manage the user's tools.
 * This is basically everything on the toolbar.
 * Constructed by linking the graphics object, the history object, and the client UI.
 * 
 * @param {Graphics} graphics - The graphics object to modify tools and settings on
 * @param {WhiteboardHistory} history - The history to update every time a change is made
 * @param {ClientUI} ui - The UI object to manipulate
 */
class Tools {
  graphics: Graphics;
  history: WhiteboardHistory;
  ui: ClientUI;

  constructor(graphics: Graphics, history: WhiteboardHistory, ui: ClientUI) {
    this.graphics = graphics;
    this.history = history;
    this.ui = ui;
  }

  /** Select the eraser tool and update the UI to show. */
  selectEraser() {
    this.ui.closeBrushMenu();
    this.graphics.tool = "eraser";
    this.graphics.eraserAuto = false;
    document.querySelector("div.toolbar").className = "toolbar eraser";
  }

  /**
   * Click on the hidden HTML color input to trigger the browser's default color picker.
   * This is somewhat buggy on Chromium because the eyedropper tool doesn't choose the correct monitor or window.
   * However, this is a Chromium bug and we can't do anything about it.
   */
  selectColor() {
    (<HTMLInputElement>document.querySelector("input[type='color']")).click();
  }

  /** Update the color of the stroke, and update the color tool to show. */
  updateStrokeStyle() {
    let input = (<HTMLInputElement>document.querySelector("input[type='color']"));
    (<HTMLElement>document.querySelector("#colorIcon")).style.color = input.value;
    this.graphics.color = input.value;
  }

  /**
   * Toggle the line width between thin, medium, and thicc.
   * Uses logarithms so it can be done in one line, because why not.
   */
  toggleLineWidth() {
    if (this.graphics.lineWidthMultiplier !== 2) this.graphics.lineWidthMultiplier = this.graphics.lineWidthMultiplier * 2;
    else this.graphics.lineWidthMultiplier = 0.5;

    let iconScale = 0.8 + (0.2 * Math.log2(this.graphics.lineWidthMultiplier));
    (<HTMLElement>document.querySelector("#widthIcon")).style.transform = `scale(${iconScale})`;
  }

  /** Toggle the straight line tool and update the UI to show. */
  toggleStraightLine() {
    this.graphics.straightLine = !this.graphics.straightLine;
    (<HTMLElement>document.querySelector("#straightIcon")).style.opacity = this.graphics.straightLine ? "1" : ".2";
  }

  /**
   * Open a confirm prompt using `sweetalert2`, then clear the user's board if approved.
   * If the prompt is cancelled, nothing happens.
   */
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

/**
 * Class managing event handlers as well as utility functions for them.
 * Constructed with the graphics object and UI object.
 * 
 * @param {Graphics} graphics - graphics object
 * @param {ClientUI} ui - client UI, pretty much just to toggle the brush menu
 */
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

  /**
   * Force the browser to paste the clipbord contents onto the board.
   * This is done differently to the hotkey version because for no apparent reason,
   * the `navigator.clipboard` API gives a different format to just the regular `onpaste` event.
   */
  forcePaste() {
    this.ui.closeBrushMenu();
    (<any>navigator.clipboard).read().then((data) => { this.handlePasteButton(data) });
  }

  /** Read the canvas and put it on the clipboard. */
  forceCopy() {
    this.ui.closeBrushMenu();
    this.graphics.context.canvas.toBlob((blob) => {
      (<any>navigator.clipboard).write([new ClipboardItem({ [blob.type]: blob })]);
    });
  }

  /** Convert the screen coordinates into canvas coordinates. */
  getCoords(...screenCoords: number[]): number[] {
    let canvasRect = this.graphics.context.canvas.getBoundingClientRect();
    return [
      (screenCoords[0] - canvasRect.x) * (this.graphics.context.canvas.width / canvasRect.width),
      (screenCoords[1] - canvasRect.y) * (this.graphics.context.canvas.height / canvasRect.height)
    ]
  }

  /**
   * Handle pointer move events.
   * This manages pen pressure, tool detection, and has some sketchy cross-browser bug fixes.
   * Supports all modern browsers, but some have less features.
   * 
   * - Firefox doesn't support pen pressure at all
   * - Safari pretends to, then defaults it to zero instead of 0.5 which is really useful, thanks Apple
   */
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

  /** Handle the pointer up event, ending a stroke and updating the history with it. */
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
      _wb.CLIENT.analytics.setUserProperties({ inputType: e.pointerType });
    }
  }

  /** Handle the CTRL+V key combination, checking if the clipboard contains an image and pasting it if so. */
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

  /** Handle the paste button event, pasting any image on the clipboard onto the canvas. */
  async handlePasteButton(e) {
    for (let item of e) {
      for (let type of item.types) {
        let blob = await item.getType(type);
        this.graphics.addImageToCanvas(URL.createObjectURL(blob));
      }
    }
  }
}