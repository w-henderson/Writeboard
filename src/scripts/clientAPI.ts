var firebase;
var Swal;

let wb: any = {}; // main Writeboard object

function initClient() {
  wb.CANVAS = document.querySelector("canvas");
  wb.CTX = wb.CANVAS.getContext("2d");

  wb.HISTORY = new WhiteboardHistory();
  wb.GRAPHICS = new Graphics(wb.CTX, wb.HISTORY);
  wb.UI = new ClientUI(wb.GRAPHICS);
  wb.TOOLS = new Tools(wb.GRAPHICS, wb.HISTORY, wb.UI);
  wb.EVENTS = new Events(wb.GRAPHICS, wb.UI);

  wb.CLIENT = new Client(wb.GRAPHICS);
  wb.CHAT = new Chat(wb.CLIENT, wb.UI);

  wb.UI.linkChat(wb.CHAT);
  wb.HISTORY.linkCtx(wb.CTX, wb.UI);

  wb.CLIENT.init(wb.CHAT);

  document.onpaste = (e) => { wb.EVENTS.handlePasteHotkey(e); };
  document.oncopy = () => { wb.EVENTS.forceCopy(); };
  window.onresize = () => { wb.UI.placeToolbar(); };
  wb.UI.placeToolbar();

  wb.CANVAS.onpointermove = (e) => { wb.EVENTS.handlePointerMove(e); };
  wb.CANVAS.onpointerup = (e) => { wb.EVENTS.handlePointerUp(e); };
  wb.CANVAS.onpointerout = (e) => { wb.EVENTS.handlePointerUp(e); };
}

window.onload = initClient;

class Client {
  database: any;
  analytics: any;
  graphics: Graphics;
  chat: Chat;

  roomId: string;
  username: string;
  userId: string;
  userRef: any;
  maximisedRef: any;
  messageRef: any;
  titleRef: any;
  ref: any;

  messageCache: {
    read: number,
    data: any
  }

  lastStrokeUpdate: number;
  maximised: boolean;

  constructor(graphics: Graphics) {
    this.database = firebase.database();
    this.analytics = firebase.analytics();
    this.graphics = graphics;
    this.roomId = window.location.search.substr(1);
    this.lastStrokeUpdate = -1;
    this.maximised = false;

    this.messageCache = {
      read: 0,
      data: null
    }
  }

  init(chat: Chat) {
    this.chat = chat;
    this.titleRef = this.database.ref(`rooms/${this.roomId}/name`);
    this.ref = this.database.ref(`rooms/${this.roomId}/users`);

    this.titleRef.on("value", this.updateTitle);
    (<HTMLInputElement>document.querySelector("input#messageInput")).onkeyup = (e) => { wb.CHAT.sendMessage(e); };

    window.addEventListener("beforeunload", () => {
      wb.CLIENT.analytics.logEvent("leave", { roomId: wb.CLIENT.roomId, username: wb.CLIENT.username });
      return wb.CLIENT.userRef.remove().then(() => { return });
    });
  }

  updateTitle(e) {
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
          return wb.CLIENT.ref.once("value").then((snapshot) => {
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
          wb.CLIENT.username = result.value;
          wb.CLIENT.userId = _snakeCase(result.value);

          wb.CLIENT.analytics.logEvent("join", { roomId: wb.CLIENT.roomId, username: wb.CLIENT.username });

          wb.CLIENT.userRef = wb.CLIENT.database.ref(`rooms/${wb.CLIENT.roomId}/users/${wb.CLIENT.userId}`);
          wb.CLIENT.userRef.set({
            name: wb.CLIENT.username,
            board: wb.CLIENT.graphics.exportImage(400, 300),
            maximised: false,
            messages: []
          });

          wb.CLIENT.messageRef = wb.CLIENT.database.ref(`rooms/${wb.CLIENT.roomId}/users/${wb.CLIENT.userId}/messages`);
          wb.CLIENT.maximisedRef = wb.CLIENT.database.ref(`rooms/${wb.CLIENT.roomId}/users/${wb.CLIENT.userId}/maximised`);
          wb.CLIENT.messageRef.on("value", (e) => { wb.CLIENT.chat.messageHandler(e); });
          wb.CLIENT.maximisedRef.on("value", (e) => { wb.CLIENT.updateMaximised(e); });

          window.setTimeout(() => { wb.CLIENT.updateBoard() }, 5000);
        }
      })
    } else {
      Swal.fire({
        title: "Whiteboard Doesn't Exist",
        text: "This could be due to a bad link, or the room host may have closed their browser.",
        icon: "error",
        background: "var(--background)"
      }).then(() => {
        wb.CLIENT.analytics.logEvent("failJoin", { roomId: wb.CLIENT.roomId });
        window.location.href = "/";
      });
    }
  }

  updateBoard(force = false) {
    if (this.lastStrokeUpdate !== this.graphics.history.strokes || force) {
      this.userRef.update({
        board: this.maximised ? this.graphics.exportImage(800, 600, 0.8) : this.graphics.exportImage(400, 300)
      });
      this.lastStrokeUpdate = this.graphics.history.strokes;
    }

    window.setTimeout(() => { wb.CLIENT.updateBoard(); }, this.maximised ? 1000 : 5000); // update more frequently if maximised
  }

  updateMaximised(e) {
    this.maximised = e.val();
    if (this.maximised) {
      this.updateBoard(true);
    }
  }
}

class Chat {
  client: Client;
  ui: ClientUI;
  visible: boolean;

  constructor(client: Client, ui: ClientUI) {
    this.client = client;
    this.ui = ui;
    this.visible = false;
  }

  sendMessage(e) {
    e.preventDefault();
    if (e.keyCode !== 13) return;

    let input: HTMLInputElement = document.querySelector("input#messageInput");
    let messageText = input.value;
    input.value = "";

    this.client.messageRef.push().set({
      sender: "user",
      content: messageText
    });
  }

  updateMessages() {
    if (this.visible) {
      let messagesDiv = document.querySelector("div.messages");
      messagesDiv.innerHTML = "";
      if (this.client.messageCache.data) {
        for (let messageId in this.client.messageCache.data) {
          let outerSpan = document.createElement("span");
          let innerSpan = document.createElement("span");
          outerSpan.className = this.client.messageCache.data[messageId].sender + "Message";
          innerSpan.textContent = this.client.messageCache.data[messageId].content;
          outerSpan.appendChild(innerSpan);
          messagesDiv.appendChild(outerSpan);
        }

        if (messagesDiv.getBoundingClientRect().right === window.innerWidth) {
          (<HTMLSpanElement>messagesDiv.lastChild).scrollIntoView();
        }
        this.client.messageCache.read = Object.keys(this.client.messageCache.data).length;
      }
    }

    let notification: HTMLDivElement = document.querySelector("div.notification");
    if (this.client.messageCache.data && Object.keys(this.client.messageCache.data).length > this.client.messageCache.read) {
      let unread = Object.keys(this.client.messageCache.data).length - this.client.messageCache.read;
      notification.style.display = "block";
      notification.textContent = unread.toString();
    } else {
      notification.style.display = "none";
    }
  }

  messageHandler(e) {
    wb.CLIENT.messageCache.data = e.val();
    wb.CHAT.updateMessages();
  }

  showChat() {
    document.querySelector("div.main").className = "main chatShown";
    document.querySelector("div.clientChat").className = "clientChat chatShown";
    document.querySelector("div.clientChat i").textContent = "clear";
    (<HTMLDivElement>document.querySelector("div.clientChat div.toggle")).onclick = () => { wb.CHAT.hideChat(); };
    this.visible = true;
    this.updateMessages();
    this.toolbarTransition();
  }

  hideChat() {
    document.querySelector("div.main").className = "main";
    document.querySelector("div.clientChat").className = "clientChat";
    document.querySelector("div.clientChat i").textContent = "message";
    (<HTMLDivElement>document.querySelector("div.clientChat div.toggle")).onclick = () => { wb.CHAT.showChat(); };
    this.visible = false;
    this.toolbarTransition();
  }

  toolbarTransition() {
    window.setInterval(() => { wb.UI.placeToolbar(); }, 16.7);
    window.setTimeout(window.clearInterval, 500);
  }
}

const _snakeCase = string => {
  return string.replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
};