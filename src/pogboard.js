var lastPosition;
var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var mouseDrawing = false;
var strokes = [];

ctx.lineWidth = 5;
ctx.lineCap = "round";

function drawEventTouch(e) {
  e.preventDefault();

  ctx.beginPath();
  ctx.moveTo(...lastPosition);
  ctx.lineTo(e.touches[0].pageX * 2, e.touches[0].pageY * 2);
  ctx.stroke();

  lastPosition = [e.touches[0].pageX * 2, e.touches[0].pageY * 2];
}

function startDrawTouch(e) {
  e.preventDefault();

  lastPosition = [e.touches[0].pageX * 2, e.touches[0].pageY * 2];
}

function drawEventMouse(e) {
  if (mouseDrawing) {
    e.preventDefault();

    ctx.beginPath();
    ctx.moveTo(...lastPosition);
    ctx.lineTo(e.offsetX * 2, e.offsetY * 2);
    ctx.stroke();

    lastPosition = [e.offsetX * 2, e.offsetY * 2];
  }
}

function startDrawMouse(e) {
  mouseDrawing = true;
  lastPosition = [e.offsetX * 2, e.offsetY * 2];
}

function endDrawMouse(e) {
  drawEventMouse(e);
  mouseDrawing = false;
}

canvas.addEventListener("touchstart", startDrawTouch);
canvas.addEventListener("touchmove", drawEventTouch);
canvas.addEventListener("mousedown", startDrawMouse);
canvas.addEventListener("mousemove", drawEventMouse);
canvas.addEventListener("mouseup", endDrawMouse);