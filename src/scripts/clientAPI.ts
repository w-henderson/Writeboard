var firebase: any;
var Swal: any;

namespace Client {
  var database = firebase.database();
  export var analytics = firebase.analytics();
  export var roomId = window.location.search.substr(1);
  export var username;
  export var userId;
  export var userRef;
  var maximisedRef;
  var messageRef;
  var titleRef;
  var ref;

  var messageCache: any = {
    read: 0,
    data: null
  }

  var lastStrokeUpdate = -1;
  export var maximised = false;

  window.onload = () => {
    titleRef = database.ref(`rooms/${roomId}/name`);
    ref = database.ref(`rooms/${roomId}/users`);

    titleRef.on("value", updateTitle);
    (<HTMLInputElement>document.querySelector("input#messageInput")).onkeyup = Chat.sendMessage;
  }

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

          messageRef = database.ref(`rooms/${roomId}/users/${userId}/messages`);
          maximisedRef = database.ref(`rooms/${roomId}/users/${userId}/maximised`);
          messageRef.on("value", Chat.messageHandler);
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

    export function sendMessage(e) {
      e.preventDefault();
      if (e.keyCode !== 13) return;

      let input: HTMLInputElement = document.querySelector("input#messageInput");
      let messageText = input.value;
      input.value = "";

      messageRef.push().set({
        sender: "user",
        content: messageText
      });
    }

    export function updateMessages() {
      if (visible) {
        let messagesDiv = document.querySelector("div.messages");
        messagesDiv.innerHTML = "";
        if (messageCache.data) {
          for (let messageId in messageCache.data) {
            let outerSpan = document.createElement("span");
            let innerSpan = document.createElement("span");
            outerSpan.className = messageCache.data[messageId].sender + "Message";
            innerSpan.textContent = messageCache.data[messageId].content;
            outerSpan.appendChild(innerSpan);
            messagesDiv.appendChild(outerSpan);
          }

          if (messagesDiv.getBoundingClientRect().right === window.innerWidth) {
            (<HTMLSpanElement>messagesDiv.lastChild).scrollIntoView();
          }
          messageCache.read = Object.keys(messageCache.data).length;
        }
      }

      let notification: HTMLDivElement = document.querySelector("div.notification");
      if (messageCache.data && Object.keys(messageCache.data).length > messageCache.read) {
        let unread = Object.keys(messageCache.data).length - messageCache.read;
        notification.style.display = "block";
        notification.textContent = unread.toString();
      } else {
        notification.style.display = "none";
      }
    }

    export function messageHandler(e) {
      messageCache.data = e.val();
      updateMessages();
    }

    export function showChat() {
      document.querySelector("div.main").className = "main chatShown";
      document.querySelector("div.clientChat").className = "clientChat chatShown";
      document.querySelector("div.clientChat i").textContent = "clear";
      (<HTMLDivElement>document.querySelector("div.clientChat div.toggle")).onclick = hideChat;
      visible = true;
      updateMessages();
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