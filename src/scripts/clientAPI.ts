var firebase: any;
var Swal: any;

namespace Client {
  var database = firebase.database();
  export var analytics = firebase.analytics();
  export var roomId = window.location.search.substr(1);
  export var username;
  export var userId;
  var messageRef;

  var lastStrokeUpdate = -1;

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
            if (snapshot.val() !== null && snakeCase(login) in snapshot.val()) {
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
          userId = snakeCase(result.value);

          analytics.logEvent("join", { roomId, username });

          userRef = database.ref(`rooms/${roomId}/users/${userId}`);
          userRef.set({
            name: username,
            board: Graphics.exportImage(400, 300),
            message: ""
          });
          messageRef = database.ref(`rooms/${roomId}/users/${userId}/message`);
          messageRef.on("value", showMessage);

          window.setInterval(updateBoard, 5000);
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

  function updateBoard() {
    if (lastStrokeUpdate !== strokes) {
      userRef.update({
        board: Graphics.exportImage(400, 300)
      });
      lastStrokeUpdate = strokes;
    }
  }

  function showMessage(e) {
    console.log(e.val());
    if (e.val() === null || e.val() === "") return;

    let message = document.createElement("div");
    message.className = "message";

    let titleSpan = document.createElement("span");
    let messageText = document.createTextNode(e.val());
    titleSpan.textContent = "Message from the host:";

    message.appendChild(titleSpan);
    message.appendChild(messageText);
    document.body.appendChild(message);

    window.setTimeout(() => {
      message.remove();
    }, 8000);
  }

  window.addEventListener("beforeunload", () => {
    analytics.logEvent("leave", { roomId, username });
    return userRef.remove().then(() => { return });
  });
}

const snakeCase = string => {
  return string.replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
};