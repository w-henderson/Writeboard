var firebase: any;
var Swal: any;

namespace Client {
  var database = firebase.database();
  export var analytics = firebase.analytics();
  export var roomId = window.location.search.substr(1);
  export var username;
  export var userId;
  var maximisedRef;

  var lastStrokeUpdate = -1;
  export var maximised = false;

  var titleRef = database.ref(`rooms/${roomId}/name`);
  var ref = database.ref(`rooms/${roomId}/users`);
  export var userRef;
  titleRef.on("value", updateTitle);

  function updateTitle(e) {
    let data = e.val();

    if (data !== null) {
      document.querySelector("h1").textContent = "Writeboard: " + data;
      document.title = data + " - Writeboard";

      Swal.fire({
        title: 'Choose a username for this Writeboard.',
        icon: "info",
        input: 'text',
        confirmButtonText: 'Join',
        background: "var(--background)",
        showLoaderOnConfirm: true,
        preConfirm: (login) => {
          return ref.once("value").then((snapshot) => {
            if (snapshot.val() !== null && _snakeCase(login) in snapshot.val()) {
              Swal.showValidationMessage("Username already taken!");
              return false;
            } else if (login.length === 0) {
              Swal.showValidationMessage("You must choose a username!");
              return false;
            } else {
              return login;
            }
          });
        },
        allowOutsideClick: false
      }).then((result) => {
        if (result.isConfirmed) {
          username = result.value;
          userId = _snakeCase(result.value);

          analytics.logEvent("join", { roomId, username });

          userRef = database.ref(`rooms/${roomId}/users/${userId}`);
          userRef.set({
            name: username,
            board: Graphics.exportImage(400, 300),
            maximised: false,
            messages: []
          });

          maximisedRef = database.ref(`rooms/${roomId}/users/${userId}/maximised`);
          maximisedRef.on("value", updateMaximised);

          window.setTimeout(updateBoard, 5000);
        }
      })
    } else {
      Swal.fire({
        title: "Whiteboard Doesn't Exist",
        text: "This could be due to a bad link, or the room host may have closed their browser.",
        icon: "error",
        background: "var(--background)"
      }).then(() => {
        analytics.logEvent("failJoin", { roomId });
        window.location.href = "/";
      });
    }
  }

  function updateBoard(force = false) {
    if (lastStrokeUpdate !== strokes || force) {
      userRef.update({
        board: maximised ? Graphics.exportImage(800, 600, 0.8) : Graphics.exportImage(400, 300)
      });
      lastStrokeUpdate = strokes;
    }

    window.setTimeout(updateBoard, maximised ? 1000 : 5000); // update more frequently if maximised
  }

  function updateMaximised(e) {
    maximised = e.val();
    if (maximised) {
      updateBoard(true);
    }
  }

  window.addEventListener("beforeunload", () => {
    analytics.logEvent("leave", { roomId, username });
    return userRef.remove().then(() => { return });
  });

  export namespace Chat {
    export var visible = false;

    export function showChat() {
      document.querySelector("div.main").className = "main chatShown";
      document.querySelector("div.clientChat").className = "clientChat chatShown";
      document.querySelector("div.clientChat i").textContent = "clear";
      (<HTMLDivElement>document.querySelector("div.clientChat div.toggle")).onclick = hideChat;
      visible = true;
      toolbarTransition();
    }

    export function hideChat() {
      document.querySelector("div.main").className = "main";
      document.querySelector("div.clientChat").className = "clientChat";
      document.querySelector("div.clientChat i").textContent = "message";
      (<HTMLDivElement>document.querySelector("div.clientChat div.toggle")).onclick = showChat;
      visible = false;
      toolbarTransition();
    }

    function toolbarTransition() {
      window.setInterval(Functionality.placeToolbar, 16.7);
      window.setTimeout(window.clearInterval, 500);
    }
  }
}

const _snakeCase = string => {
  return string.replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
};