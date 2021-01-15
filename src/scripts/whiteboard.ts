var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var mouseDrawing = false;
var stroke = [];

ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.fillStyle = "#eee";

ctx.fillRect(0, 0, canvas.width, canvas.height);

function update(quality = 10) {
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

function drawEventTouch(e) {
  e.preventDefault();
  stroke.push([e.touches[0].pageX, e.touches[0].pageY]);
  if (stroke.length >= 5) stroke.splice(0, 1);
  update();
}

function startDrawTouch(e) {
  e.preventDefault();
  stroke = [[e.touches[0].pageX, e.touches[0].pageY]];
}

function drawEventMouse(e) {
  if (mouseDrawing) {
    e.preventDefault();
    stroke.push([e.offsetX, e.offsetY]);
    if (stroke.length >= 5) stroke.splice(0, 1);
    update();
  }
}

function startDrawMouse(e) {
  mouseDrawing = true;
  stroke = [[e.offsetX, e.offsetY]];
}

function endDrawMouse(e) {
  drawEventMouse(e);
  mouseDrawing = false;
  update();
  stroke = [];
}

canvas.addEventListener("touchstart", startDrawTouch);
canvas.addEventListener("touchmove", drawEventTouch);
canvas.addEventListener("mousedown", startDrawMouse);
canvas.addEventListener("mousemove", drawEventMouse);
canvas.addEventListener("mouseup", endDrawMouse);